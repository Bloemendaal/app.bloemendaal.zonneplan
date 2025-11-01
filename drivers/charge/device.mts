import Homey from "homey";

const DEFAULT_POLLING_INTERVAL_MINUTES = 10;

interface OnSettingsParams {
	oldSettings: { [key: string]: boolean | string | number | undefined | null };
	newSettings: { [key: string]: boolean | string | number | undefined | null };
	changedKeys: string[];
}

export default class ChargeDevice extends Homey.Device {
	private intervalHandle: NodeJS.Timeout | null = null;

	public async onInit(): Promise<void> {
		// const vehicle = await this.getVehicle();
		// vehicle.onSettingsUpdate(this.setSettings.bind(this));

		// await Promise.all(
		// 	this.capabilities.map((capability) =>
		// 		capability.addCapabilities(capabilities),
		// 	),
		// );

		// await Promise.all(
		// 	this.capabilities.map((capability) =>
		// 		capability.registerCapabilityListeners(capabilities),
		// 	),
		// );

		await this.setCapabilities();

		this.startInterval(
			this.getSettings().pollingInterval || DEFAULT_POLLING_INTERVAL_MINUTES,
		);
	}

	public async onSettings({
		newSettings,
		changedKeys,
	}: OnSettingsParams): Promise<void> {
		if (changedKeys.includes("pollingInterval")) {
			const interval = +(
				newSettings.pollingInterval || DEFAULT_POLLING_INTERVAL_MINUTES
			);

			this.startInterval(interval);
		}
	}

	public async onDeleted(): Promise<void> {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
		}
	}

	// public async getVehicle(): Promise<Vehicle> {
	// 	if (this.vehicle) {
	// 		return this.vehicle;
	// 	}

	// 	try {
	// 		const vehicles = await User.fromSettings(
	// 			this.getSettings(),
	// 		).getVehicles();

	// 		const vehicle = vehicles.find(
	// 			(vehicle) => vehicle.vin === this.getData().id,
	// 		);

	// 		if (!vehicle) {
	// 			throw new Error("Vehicle not found");
	// 		}

	// 		this.vehicle = vehicle;
	// 		return vehicle;
	// 	} catch (error) {
	// 		this.error("An error occurred while fetching the vehicle");
	// 		throw error;
	// 	}
	// }

	public async setCapabilities(): Promise<void> {
		// if (!capabilities) {
		// 	const vehicle = await this.getVehicle();
		// 	capabilities = await vehicle.getVehicleCapabilities();
		// }
		// await Promise.all(
		// 	this.capabilities.map((capability) =>
		// 		capability.setCapabilityValues(capabilities),
		// 	),
		// );
	}

	private startInterval(intervalInMinutes: number): void {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
		}

		this.intervalHandle = setInterval(
			() => this.setCapabilities(),
			intervalInMinutes * 60 * 1000,
		);
	}
}
