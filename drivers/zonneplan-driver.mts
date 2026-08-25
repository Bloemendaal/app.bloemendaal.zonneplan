import { isAxiosError } from "axios";
import Homey from "homey";
import type { PairSession } from "homey/lib/Driver.js";
import User, {
	type AccountResponse,
	NoLoginChallengeError,
} from "../src/user.mjs";
import ZonneplanDevice from "./zonneplan-device.mjs";

const SOURCE_NAME_SEPARATOR = " – ";

export interface ZonneplanDeviceData {
	name: string;
	data: {
		contractUuid: string;
		connectionUuid: string;
	};
	settings?: {
		[key: string]: unknown;
	};
}

export default abstract class ZonneplanDriver extends Homey.Driver {
	public async refresh(accountResponse: AccountResponse): Promise<void> {
		const refreshes = this.getDevices()
			.filter((device) => device instanceof ZonneplanDevice)
			.map((device) => device.refresh(accountResponse).catch(this.error));

		await Promise.all(refreshes);
	}

	public async onPair(session: PairSession): Promise<void> {
		let accountResponse: AccountResponse | null = null;

		const user = new User(this.homey);

		session.setHandler("showView", async (viewId) => {
			if (viewId === "loading") {
				try {
					if (accountResponse === null) {
						accountResponse = await user.getAccount();
					}

					await session.showView("list_devices");
				} catch {
					await session.showView("email_verification");
				}
			}

			if (viewId === "email_verification") {
				user.cancelLoginChallenge();
			}

			if (viewId === "otp_verification" && !user.hasLoginChallenge) {
				await session.showView("email_verification");
			}
		});

		session.setHandler(
			"submit_email",
			async (data: { email: string; name: string }) => {
				const sourceName = this.toSourceName(data.name);

				try {
					await user.requestOneTimePassword(data.email, sourceName);
				} catch (error) {
					this.error("Failed to request a one-time password:", error);

					throw new Error(
						this.__(
							`pair.email_verification.error.${this.toEmailErrorReason(error)}`,
						),
					);
				}

				this.homey.settings.set("sourceName", data.name.trim());

				await session.showView("otp_verification");
			},
		);

		session.setHandler("pincode", async (pincode: string[]) => {
			try {
				await user.setTokensByOneTimePassword(pincode.join(""));
			} catch (error) {
				this.error("Failed to complete the login attempt:", error);

				const reason = this.toOtpErrorReason(error);

				if (reason === "invalid_otp") {
					return false;
				}

				throw new Error(this.__(`pair.otp_verification.error.${reason}`));
			}

			return true;
		});

		session.setHandler("get_login", async () => ({
			email: this.homey.settings.get("email") ?? "",
			name: this.homey.settings.get("sourceName") ?? "",
		}));

		session.setHandler("list_devices", async () => {
			try {
				if (accountResponse === null) {
					accountResponse = await user.getAccount();
				}
			} catch {
				await session.showView("email_verification");
				return;
			}

			return this.toDevices(accountResponse);
		});
	}

	protected abstract toDevices(
		accountResponse: AccountResponse,
	): ZonneplanDeviceData[];

	protected __(key: string | object, tags?: object): string {
		return this.homey.__(key, tags);
	}

	private toSourceName(name: string): string {
		const reference = name.trim() || this.__(this.manifest.name);

		return [
			`Homey Zonneplan v${this.homey.app.manifest.version}`,
			reference,
		].join(SOURCE_NAME_SEPARATOR);
	}

	private toEmailErrorReason(
		error: unknown,
	): "invalid_email" | "rate_limited" | "unknown" {
		const status = isAxiosError(error) ? error.response?.status : undefined;

		if (status === 400 || status === 404 || status === 422) {
			return "invalid_email";
		}

		if (status === 429) {
			return "rate_limited";
		}

		return "unknown";
	}

	private toOtpErrorReason(
		error: unknown,
	): "invalid_otp" | "expired" | "rate_limited" | "unknown" {
		if (error instanceof NoLoginChallengeError) {
			return "expired";
		}

		const status = isAxiosError(error) ? error.response?.status : undefined;

		if (status === 400 || status === 401 || status === 403 || status === 422) {
			return "invalid_otp";
		}

		if (status === 429) {
			return "rate_limited";
		}

		return "unknown";
	}
}
