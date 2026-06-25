import Homey from "homey";
import ZonneplanDriver from "./drivers/zonneplan-driver.mjs";
import DebounceScheduler from "./src/debounce-scheduler.mjs";
import User from "./src/user.mjs";

const OFFSET_SECONDS_MIN = 60;
const OFFSET_SECONDS_MAX = 180;
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
	 *
	 * A random per-instance offset (60–180 s) spreads users across a
	 * 2-minute window instead of all hitting at the same second.
	 */
	public async onInit(): Promise<void> {
		const offsetSeconds =
			OFFSET_SECONDS_MIN +
			Math.floor(Math.random() * (OFFSET_SECONDS_MAX - OFFSET_SECONDS_MIN + 1));

		const from = new Date();
		const target = new Date(from.getTime());
		target.setSeconds(0, 0);

		const minutes = target.getMinutes();
		const mod = minutes % FETCH_EVERY_MINUTES;
		const add = mod === 0 ? 0 : FETCH_EVERY_MINUTES - mod;
		target.setMinutes(minutes + add);
		target.setSeconds(offsetSeconds, 0);

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
}
