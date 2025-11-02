import type { ChargePointContract } from "../../src/charge-point.mjs";
import type { AccountResponse } from "../../src/user.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

export default class ChargeDevice extends ZonneplanDevice<ChargePointContract> {
	public async refresh(accountResponse: AccountResponse): Promise<void> {
		const contract = this.getContract(accountResponse);

		if (!contract) {
			this.error("Contract not found in account response");
			return;
		}

		const state = contract.state;
		const meta = contract.meta;

		// Update measure_power (current power in Watts)
		await this.setCapabilityValue("measure_power", state.power_actual).catch(
			this.error,
		);

		// Update evcharger_charging (boolean indicating if charging)
		const isCharging = state.charging_manually || state.charging_automatically;
		await this.setCapabilityValue("evcharger_charging", isCharging).catch(
			this.error,
		);

		// Update evcharger_charging_state (charging state string)
		// Map the state to Homey's expected values: 'charging', 'connected', 'disconnected'
		let chargingState: "charging" | "connected" | "disconnected" =
			"disconnected";
		if (isCharging) {
			chargingState = "charging";
		} else if (state.state === "Standby" || state.state === "Connected") {
			chargingState = "connected";
		}
		await this.setCapabilityValue(
			"evcharger_charging_state",
			chargingState,
		).catch(this.error);

		// Update meter_power.charged (total charged energy in kWh)
		// Convert from Wh to kWh if meta has cumulative data
		if (meta.charged_energy !== null && meta.charged_energy !== undefined) {
			const chargedEnergyKwh = meta.charged_energy / 1000;
			await this.setCapabilityValue(
				"meter_power.charged",
				chargedEnergyKwh,
			).catch(this.error);
		}

		// Note: meter_power.discharged is for vehicle-to-grid, which might not be available
		// Set to 0 if not supported
		await this.setCapabilityValue("meter_power.discharged", 0).catch(
			this.error,
		);

		this.log(
			`Updated capabilities - Power: ${state.power_actual}W, State: ${chargingState}, Charging: ${isCharging}`,
		);
	}
}
