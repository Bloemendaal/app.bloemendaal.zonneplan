import Homey from "homey";
import type { PairSession } from "homey/lib/Driver.js";
import type { LoginResponse } from "../../src/user.mjs";
import User, { type AccountResponse } from "../../src/user.mjs";

const POLLING_INTERVAL = 5000;

interface PollingOptions {
	onPoll(): Promise<LoginResponse>;
	onSuccess(password: string): Promise<void> | void;
	onFailure(reason: "expired" | "unknown"): Promise<void> | void;
}

export default class ChargeDriver extends Homey.Driver {
	private pollingInterval: NodeJS.Timeout | null = null;

	public async onUninit(): Promise<void> {
		this.stopPolling();
	}

	public async onPair(session: PairSession): Promise<void> {
		let uuid: string | null = null;
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

			if (viewId === "polling") {
				this.startPolling({
					onPoll: async () => {
						if (!uuid) {
							throw new Error("UUID not set");
						}

						return await user.getOneTimePassword(uuid);
					},
					onSuccess: async (password) => {
						try {
							await user.setTokensByPassword(password);
							await session.showView("list_devices");
						} catch {
							await session.emit("polling_error", {
								message: this.homey.__(`pair.polling.error.unknown`),
							});

							await session.showView("email_verification");
						}
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
			const response = await user.getAuthentication(data.email);
			uuid = response.uuid;

			await session.showView("polling");
		});
		session.setHandler("disconnect", async () => this.stopPolling());
		session.setHandler("cancel_polling", async () => this.stopPolling());

		session.setHandler("get_email", async () =>
			this.homey.settings.get("email"),
		);

		session.setHandler("list_devices", async () => {
			try {
				if (accountResponse === null) {
					accountResponse = await user.getAccount();
				}
			} catch {
				await session.showView("email_verification");
				return;
			}

			return accountResponse.address_groups.flatMap((group) =>
				group.connections.flatMap((connection) =>
					connection.contracts
						.filter((contract) => contract.type === "charge_point_installation")
						.map((contract) => ({
							name: contract.label,
							data: {
								contractUuid: contract.uuid,
								connectionUuid: connection.uuid,
							},
						})),
				),
			);
		});
	}

	private stopPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}

		this.pollingInterval = null;
	}

	private startPolling({ onPoll, onSuccess, onFailure }: PollingOptions): void {
		this.stopPolling();

		this.pollingInterval = setInterval(async () => {
			try {
				const response = await onPoll();

				if (response.is_activated) {
					this.stopPolling();

					await onSuccess(response.password);

					return;
				}

				if (new Date() > new Date(response.expires_at)) {
					this.stopPolling();

					await onFailure("expired");
				}
			} catch (error) {
				this.stopPolling();

				this.error("Polling error:", error);

				await onFailure("unknown");
			}
		}, POLLING_INTERVAL);
	}
}
