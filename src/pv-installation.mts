import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type { DateTimeString, Integer, Response } from "./types.mjs";

export interface PvInstallationState {
	connectivity_state: boolean;
	power_actual: Integer;
	energy_total: Integer;
	last_measured_at: DateTimeString | null;
}

export interface PvInstallationMeta {
	identifier: string;
	name: string;
	panel_count: Integer;
	panel_type: unknown | null;
	installation_wp: Integer;
	panel_wp: Integer;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	last_measured_power_value: Integer | null;
	total_power_measured: Integer;
	sgn_serial_number: string;
	module_firmware_version: string;
	inverter_firmware_version: string;
	show_in_contract_screen: boolean;
	enable_pv_analysis: boolean;
	dynamic_control_enabled: boolean;
	expected_surplus_kwh: Integer;
	power_limit_active: boolean;
	current_scenario: unknown | null;
}

export interface PvInstallationContract {
	uuid: string;
	label: string;
	type: "pv_installation";
	start_date: DateTimeString;
	end_date: DateTimeString | null;
	meta: PvInstallationMeta;
}

export interface PvInstallationData {
	contracts: PvInstallationContract[];
}

export default class PvInstallation extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
		private readonly contractUuid: string,
	) {
		super(homey);
	}

	public async getPvInstallation(): Promise<PvInstallationData> {
		const client = await this.getClient();

		const response = await client.get<Response<PvInstallationData>>(
			`/connections/${this.connectionUuid}/pv-installations/${this.contractUuid}`,
		);

		return response.data.data;
	}
}
