import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type {
	DateString,
	DateTimeString,
	Integer,
	PossiblyUnknownString,
	Response,
} from "./types.mjs";
import type { BaseContractData } from "./user.mjs";

export interface PvInstallationMeta {
	identifier: string;
	name: string;
	panel_count: Integer;
	panel_type: string | null;
	installation_wp: Integer;
	panel_wp: Integer;
	first_measured_at: DateTimeString;
	last_measured_at: DateTimeString;
	last_measured_power_value: Integer;
	total_power_measured: Integer;
	sgn_serial_number: string;
	module_firmware_version: string;
	inverter_firmware_version: string;
	show_in_contract_screen: boolean;
	enable_pv_analysis: boolean;
	dynamic_control_enabled: boolean;
	expected_surplus_kwh: Integer;
	power_limit_active: boolean;
	current_scenario: string | null;
	total_earned: Integer;
	total_day: Integer;
	delivery_day: Integer | null;
	production_day: Integer | null;
	average_day: Integer | null;
	production_month: Integer;
}

export interface PvInstallationContract
	extends BaseContractData<"pv_installation", PvInstallationMeta> {}

export interface PvMeasurement {
	value: Integer;
	date: DateTimeString;
}

export interface PvMeasurementGroup {
	group_type: "normal" | PossiblyUnknownString;
	date: DateTimeString;
	meta: {
		total_earned: Integer;
	};
	mutable: boolean;
	type: "minutes" | "days" | "months";
	measurements: PvMeasurement[];
	total: Integer;
}

export interface PvConnectionResponse {
	contracts: PvInstallationContract[];
	powerplay: unknown[];
	measurement_groups: PvMeasurementGroup[];
}

export default class PvInstallation extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
	) {
		super(homey);
	}

	public async getPvInstallation(): Promise<PvConnectionResponse> {
		const client = await this.getClient();

		const response = await client.get<Response<PvConnectionResponse>>(
			`/connections/${this.connectionUuid}/pv-installation`,
		);

		return response.data.data;
	}

	public async getMinuteCharts(
		date: DateString,
	): Promise<PvConnectionResponse> {
		const client = await this.getClient();

		const response = await client.get<Response<PvConnectionResponse>>(
			`/connections/${this.connectionUuid}/pv_installation/charts/minutes`,
			{ params: { date } },
		);

		return response.data.data;
	}

	public async getDailyCharts(date: DateString): Promise<PvConnectionResponse> {
		const client = await this.getClient();

		const response = await client.get<Response<PvConnectionResponse>>(
			`/connections/${this.connectionUuid}/pv_installation/charts/days`,
			{ params: { date } },
		);

		return response.data.data;
	}

	public async getMonthlyCharts(
		date: DateString,
	): Promise<PvConnectionResponse> {
		const client = await this.getClient();

		const response = await client.get<Response<PvConnectionResponse>>(
			`/connections/${this.connectionUuid}/pv_installation/charts/months`,
			{ params: { date } },
		);

		return response.data.data;
	}
}
