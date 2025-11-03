import type { ChargePointContract } from "../../src/charge-point.mjs";
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

		// measure_power: Current power in Watts
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

		// meter_power.charged: Total charged energy in kWh
		// Convert from Wh to kWh if meta.charged_energy is in Wh
		if (meta.charged_energy !== null) {
			await this.setCapabilityValue("meter_power.charged", meta.charged_energy);
		}
	}
}
