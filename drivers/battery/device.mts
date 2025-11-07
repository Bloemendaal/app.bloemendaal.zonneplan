import type { HomeBatteryContract } from "../../src/home-battery.mjs";
import HomeBattery from "../../src/home-battery.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

export default class BatteryDevice extends ZonneplanDevice<HomeBatteryContract> {
	public getHomeBattery(): HomeBattery {
		const { connectionUuid, contractUuid } = this.getData();

		return new HomeBattery(this.homey, connectionUuid, contractUuid);
	}

	public async refresh(): Promise<void> {
		const homeBattery = this.getHomeBattery();

		const data = await homeBattery.getHomeBattery();

		const [contract] = data.contracts;

		if (!contract) {
			throw new Error(this.__("devices.battery.errors.not_found"));
		}

		const { meta } = contract;

		await this.setMeterPower(homeBattery, meta).catch(this.error);
		await this.setCapabilityValue("measure_power", meta.power_ac);
		await this.setCapabilityValue("measure_battery", meta.state_of_charge);
	}

	/**
	 * The home battery API provides cumulative data directly via the charts endpoint,
	 * so we can simply fetch the total charged and discharged energy from the latest
	 * cumulative measurement.
	 */
	private async setMeterPower(
		homeBattery: HomeBattery,
		meta: HomeBatteryContract["meta"],
	): Promise<void> {
		if (!meta.first_measured_at) {
			return;
		}

		const firstMeasuredInYear = new Date(meta.first_measured_at).getFullYear();

		// Get the cumulative data for the entire period from the first measurement
		const [cumulativeChart] = await homeBattery.getDailyCumulativeCharts(
			`${firstMeasuredInYear}-01-01`,
		);

		if (cumulativeChart) {
			// Get the most recent measurement (cumulative data is chronologically ordered)
			const latestMeasurement = cumulativeChart.measurements.at(-1);

			if (latestMeasurement?.meta) {
				// Convert Wh to kWh
				const charged = latestMeasurement.meta.delivery / 1000;
				const discharged = latestMeasurement.meta.production / 1000;

				await this.setCapabilityValue("meter_power.charged", charged);
				await this.setCapabilityValue("meter_power.discharged", discharged);
			}
		}
	}
}
