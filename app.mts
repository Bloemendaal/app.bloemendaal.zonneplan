import Homey from "homey";
import ZonneplanDriver from "./drivers/zonneplan-driver.mjs";
import DebounceScheduler from "./src/debounce-scheduler.mjs";
import User from "./src/user.mjs";

const OFFSET_MINUTES = 2;
const FETCH_EVERY_MINUTES = 5;

export default class ZonneplanApp extends Homey.App {
	private scheduleTimeout: NodeJS.Timeout | null = null;

	private readonly scheduler = new DebounceScheduler<void>(
		this.refreshDevices.bind(this),
	);

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
			target.setMinutes(target.getMinutes() + FETCH_EVERY_MINUTES);
		}

		const delay = target.getTime() - from.getTime();

		// Do not await these calls, they act as a sleep timer
		this.requestRefresh(500, 3000).catch(this.error);
		this.requestRefresh(delay, delay + 10000).catch(this.error);

		this.scheduleTimeout = setTimeout(() => {
			this.scheduler.startInterval(FETCH_EVERY_MINUTES * 60 * 1000, {
				minimum: 0,
				maximum: 10000,
			});
		}, delay);
	}

	public async onUninit(): Promise<void> {
		this.scheduler.destroy();

		if (this.scheduleTimeout) {
			clearInterval(this.scheduleTimeout);
		}
	}

	/**
	 * Refreshes all devices. Awaiting this method will act as
	 * a sleep timer until the refresh is complete (or failed).
	 */
	public async requestRefresh(minimum: number, maximum: number): Promise<void> {
		await this.scheduler.schedule({ minimum, maximum });
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
