import Homey from "homey";
import ZonneplanDriver from "./drivers/zonneplan-driver.mjs";
import User from "./src/user.mjs";

const OFFSET_MINUTES = 2;
const FETCH_EVERY_MINUTES = 5;

export default class ZonneplanApp extends Homey.App {
	private pollingInterval: NodeJS.Timeout | null = null;
	private scheduleInvertal: NodeJS.Timeout | null = null;

	public async onInit(): Promise<void> {
		await this.refreshDevices();
		this.scheduleRefreshInterval();
	}

	public async onUninit(): Promise<void> {
		if (this.scheduleInvertal) {
			clearInterval(this.scheduleInvertal);
		}

		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}
	}

	private async refreshDevices(): Promise<void> {
		const user = new User(this.homey);
		const accountResponse = await user.getAccount();

		const refreshes = Object.values(this.homey.drivers.getDrivers())
			.filter((driver) => driver instanceof ZonneplanDriver)
			.map((driver) => driver.refresh(accountResponse));

		await Promise.all(refreshes);
	}

	/**
	 * The SGNs send their data every 5 minutes, however, there might be
	 * a delay before the data is available via the API. To ensure that
	 * the app fetches the latest data after it has been updated, we
	 * schedule a refresh interval slightly longer than 5 minutes.
	 */
	private scheduleRefreshInterval(): void {
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

		this.scheduleInvertal = setTimeout(() => {
			this.refreshDevices();
			this.pollingInterval = setInterval(
				() => this.refreshDevices(),
				FETCH_EVERY_MINUTES * 60 * 1000,
			);
		}, delay);
	}

	private positiveModulo(value: number, modulo: number): number {
		return ((value % modulo) + modulo) % modulo;
	}
}
