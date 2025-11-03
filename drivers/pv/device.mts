import type {
	AccountResponse,
	PvInstallationContract,
} from "../../src/user.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

export default class PvDevice extends ZonneplanDevice<PvInstallationContract> {
	public async refresh(accountResponse: AccountResponse): Promise<void> {
		const contract = this.getContract(accountResponse);

		if (!contract) {
			this.error("Contract not found in account response");
			return;
		}

		const meta = contract.meta;

		// Update measure_power (current power generation in Watts)
		// For solar panels, power should be negative to indicate generation
		if (meta.last_measured_power_value !== null) {
			await this.setCapabilityValue(
				"measure_power",
				meta.last_measured_power_value,
			).catch(this.error);
		}

		// Update meter_power (total energy generated in kWh)
		// Convert from Wh to kWh by dividing by 1000
		const totalEnergyKwh = meta.total_power_measured / 1000;
		await this.setCapabilityValue("meter_power", totalEnergyKwh).catch(
			this.error,
		);

		this.log(
			`Updated capabilities - Power: ${meta.last_measured_power_value}W, Total: ${totalEnergyKwh}kWh`,
		);
	}
}
