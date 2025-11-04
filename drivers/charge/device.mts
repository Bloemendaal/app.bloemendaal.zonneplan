import type {
	ChargePointContract,
	ChargePointMeta,
} from "../../src/charge-point.mjs";
import ChargePoint from "../../src/charge-point.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

export default class ChargeDevice extends ZonneplanDevice<ChargePointContract> {
	public async refresh(): Promise<void> {
		const { connectionUuid, contractUuid } = this.getData();

		const chargePoint = new ChargePoint(
			this.homey,
			connectionUuid,
			contractUuid,
		);

		const data = await chargePoint.getChargePoint();

		const [contract] = data.contracts;

		if (!contract) {
			this.error(
				`No contract data available for charge point ${connectionUuid} / ${contractUuid}`,
			);
			return;
		}

		const { state, meta } = contract;

		await this.setMeterPower(chargePoint, meta);
		await this.setCapabilityValue("measure_power", state.power_actual);

		// evcharger_charging: Boolean indicating if currently charging
		const isCharging = state.charging_manually || state.charging_automatically;
		await this.setCapabilityValue("evcharger_charging", isCharging);

		// evcharger_charging_state: State of the charger
		// Valid values: plugged_in_charging, plugged_in_discharging, plugged_in_paused, plugged_in, plugged_out
		let chargingState: string;
		if (state.plugged_in_at === null) {
			chargingState = "plugged_out";
		} else if (state.charging_manually || state.charging_automatically) {
			chargingState = "plugged_in_charging";
		} else {
			// Plugged in but not charging (paused or waiting)
			chargingState = "plugged_in_paused";
		}
		await this.setCapabilityValue("evcharger_charging_state", chargingState);
	}

	/**
	 * To figure out the cumulative charged energy charged since we started measuring,
	 * we need to know the year of the first measurement and then call the API for eachta
	 * year. However, to prevent spamming the API, we store the years that have already
	 * passed. The timestamp that this year was set, must be in a year after that year
	 * to ensure we know it has actually passed.
	 */
	private async setMeterPower(
		chargePoint: ChargePoint,
		meta: ChargePointMeta,
	): Promise<void> {
		if (!meta.first_measured_at) {
			return;
		}

		const currentYear = new Date().getFullYear();
		const firstMeasuredInYear = new Date(meta.first_measured_at).getFullYear();

		let cumulativeChargedEnergy = 0;

		for (let year = firstMeasuredInYear; year <= currentYear; year++) {
			const capability = `meter_power.charged.${year}`;
			const hasCapability = this.hasCapability(capability);

			if (!hasCapability) {
				await this.addCapability(capability);
				await this.setCapabilityOptions(capability, {
					title: this.homey.__("capabilities.meter_power_charged_year.title", {
						year: year.toString(),
					}),
				});

				await this.addCapability(`timestamp.${capability}`);
				await this.setCapabilityOptions(`timestamp.${capability}`, {
					unit: "years",
				});
			}

			let meterPower = this.getCapabilityValue(capability);

			if (
				!hasCapability ||
				year === currentYear ||
				typeof meterPower !== "number" ||
				(this.getCapabilityValue(`timestamp.${capability}`) ?? 0) < year
			) {
				const [chart] = await chargePoint.getMonthlyCharts(`${year}-01-01`);

				// Convert Wh to kWh
				meterPower = (chart?.total ?? 0) / 1000;

				await this.setCapabilityValue(capability, meterPower);
				await this.setCapabilityValue(`timestamp.${capability}`, currentYear);
			}

			cumulativeChargedEnergy += meterPower;
		}

		await this.setCapabilityValue(
			"meter_power.charged",
			cumulativeChargedEnergy,
		);
	}
}
