import { isAxiosError } from "axios";
import Homey from "homey";
import type { PairSession } from "homey/lib/Driver.js";
import ZonneplanAppApi, { type TokensResponse } from "../../src/api.mjs";

const POLLING_INTERVAL = 5000;

interface PollingOptions {
	uuid: string;
	email: string;
	onSuccess?(tokens: TokensResponse): Promise<void> | void;
	onFailure?(
		reason: "expired" | "invalid_email" | "unknown",
	): Promise<void> | void;
}

export default class ChargeDriver extends Homey.Driver {
	private pollingInterval: NodeJS.Timeout | null = null;
	private readonly api: ZonneplanAppApi = new ZonneplanAppApi();

	public async onUninit(): Promise<void> {
		this.stopPolling();
	}

	public async onPair(session: PairSession): Promise<void> {
		let uuid: string | null = null;
		let email: string | null = null;
		let accessToken: string | null = null;
		let refreshToken: string | null = null;

		session.setHandler("showView", async (viewId) => {
			if (viewId === "email_verification") {
				const canAccess = await this.api.canAccess();

				if (canAccess) {
					await session.showView("list_devices");
				}
			}

			if (viewId === "polling" && uuid && email) {
				this.startPolling({
					uuid,
					email,
					onSuccess: async (tokens) => {
						accessToken = tokens.access_token;
						refreshToken = tokens.refresh_token;

						await session.showView("list_devices");
					},
					onFailure: async (reason) => {
						await session.emit("polling_error", {
							message: this.homey.__(`pair.polling.error.${reason}`),
						});

						await session.showView("email_verification");
					},
				});
			}
		});

		session.setHandler("submit_email", async (data: { email: string }) => {
			email = data.email;
			const response = await this.api.login(email);
			uuid = response.uuid;

			await session.showView("polling");
		});

		session.setHandler("get_email", async () => email);
		session.setHandler("disconnect", async () => this.stopPolling());
		session.setHandler("cancel_polling", async () => this.stopPolling());

		session.setHandler("list_devices", async () => {
			if (!accessToken) {
				throw new Error("Not authenticated");
			}

			// TODO: Fetch actual devices using the access token
			// For now, return a mock device
			return [
				{
					name: "Zonneplan Charge",
					data: {
						id: "charge-1",
					},
					store: {
						accessToken,
						refreshToken,
					},
				},
			];
		});
	}

	private stopPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}

		this.pollingInterval = null;
	}

	private startPolling({
		uuid,
		email,
		onSuccess,
		onFailure,
	}: PollingOptions): void {
		this.stopPolling();

		this.pollingInterval = setInterval(async () => {
			try {
				const response = await this.api.getOneTimePassword(uuid);

				if (response.is_activated) {
					this.stopPolling();

					const tokens = await this.api.getTokens(email, response.password);

					await onSuccess?.(tokens);

					return;
				}

				if (new Date() > new Date(response.expires_at)) {
					this.stopPolling();

					await onFailure?.("expired");
				}
			} catch (error) {
				this.stopPolling();

				this.error("Polling error:", error);

				const reason =
					isAxiosError(error) && error.response?.status === 422
						? "invalid_email"
						: "unknown";

				await onFailure?.(reason);
			}
		}, POLLING_INTERVAL);
	}
}
