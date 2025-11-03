import Homey from "homey";
import ZonneplanDriver from "./drivers/zonneplan-driver.mjs";
import User from "./src/user.mjs";

const OFFSET_MINUTES = 2;
const FETCH_EVERY_MINUTES = 5;

export default class ZonneplanApp extends Homey.App {
	private initTimeout: NodeJS.Timeout | null = null;
	private refreshTimeout: NodeJS.Timeout | null = null;
	private scheduleTimeout: NodeJS.Timeout | null = null;
	private pollingInterval: NodeJS.Timeout | null = null;

	/**
	 * The SGNs send their data every 5 minutes, however, there might be
	 * a delay before the data is available via the API. To ensure that
	 * the app fetches the latest data after it has been updated, we
	 * schedule a refresh interval slightly longer than 5 minutes.
	 */
	public async onInit(): Promise<void> {
		const from = new Date();
		const norm = this.positiveModulo(OFFSET_MINUTES, FETCH_EVERY_MINUTES);

		const target = new Date(from.getTime());
		target.setSeconds(0, 0);

		const minutes = target.getMinutes();
		const mod = this.positiveModulo(minutes - norm, FETCH_EVERY_MINUTES);
		const add = (FETCH_EVERY_MINUTES - mod) % FETCH_EVERY_MINUTES;

		target.setMinutes(minutes + add);

		if (target.getTime() <= from.getTime()) {
			target.setMinutes(target.getMinutes() + 5);
		}

		const delay = target.getTime() - from.getTime();

		if (delay > 10 * 1000) {
			// We schedule the init interval because not all devices are initialized when this method is called.
			// Let's hope that all devices are initialized within 5 seconds...
			this.initTimeout = setTimeout(() => this.refreshDevices(), 5 * 1000);
		}

		this.scheduleTimeout = setTimeout(() => {
			this.refreshDevices();
			this.pollingInterval = setInterval(
				() => this.refreshDevices(),
				FETCH_EVERY_MINUTES * 60 * 1000,
			);
		}, delay);
	}

	public async onUninit(): Promise<void> {
		if (this.initTimeout) {
			clearInterval(this.initTimeout);
		}

		if (this.refreshTimeout) {
			clearInterval(this.refreshTimeout);
		}

		if (this.scheduleTimeout) {
			clearInterval(this.scheduleTimeout);
		}

		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}
	}

	/**
	 * We request a refresh for all devices, but we delay it
	 * slightly to allow multiple requests to be batched together.
	 */
	public requestRefresh(): void {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		this.refreshTimeout = setTimeout(() => this.refreshDevices(), 3 * 1000);
	}

	private async refreshDevices(): Promise<void> {
		const user = new User(this.homey);
		const accountResponse = await user.getAccount();

		const refreshes = Object.values(this.homey.drivers.getDrivers())
			.filter((driver) => driver instanceof ZonneplanDriver)
			.map((driver) => driver.refresh(accountResponse));

		await Promise.all(refreshes);
	}

	private positiveModulo(value: number, modulo: number): number {
		return ((value % modulo) + modulo) % modulo;
	}
}
