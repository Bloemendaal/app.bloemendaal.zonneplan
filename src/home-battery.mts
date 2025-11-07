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

export interface PowerplayScenario {
	scenario: "GridOptimization" | "HomeOptimization" | PossiblyUnknownString;
	starts_at: DateTimeString;
	ends_at: DateTimeString;
}

export interface LiveMeasurementMeta {
	state_of_charge: Integer;
}

export interface LiveMeasurement {
	value: Integer;
	measured_at: DateTimeString;
	meta: LiveMeasurementMeta;
}

export interface MeasurementGroup {
	group_type: "normal" | PossiblyUnknownString;
	date: DateTimeString;
	mutable: boolean;
	type: "live" | PossiblyUnknownString;
	measurements: LiveMeasurement[];
	total: Integer;
}

export interface HomeBatteryMeta {
	identifier: string;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	state_of_charge: Integer;
	power_ac: Integer;
	inverter_state: "Operative" | PossiblyUnknownString;
	battery_state: "Operative" | PossiblyUnknownString;
	dynamic_charging_enabled: boolean;
	home_optimization_enabled: boolean;
	home_optimization_active: boolean;
	dynamic_load_balancing_enabled: boolean;
	dynamic_load_balancing_overload_active: boolean;
	grid_congestion_active: boolean;
	manual_control_enabled: boolean;
	manual_control_state: unknown | null;
	self_consumption_enabled: boolean;
	cycle_count: Integer;
	show_in_contract_screen: boolean;
	reserve_discharge_cutoff_wh: Integer | null;
	backup_power_capable: boolean;
	total_earned: Integer;
	total_day: Integer;
	delivery_day: Integer;
	production_day: Integer;
	average_day: Integer;
	production_month: unknown | null;
}

export interface HomeBatteryContract
	extends BaseContractData<"home_battery_installation", HomeBatteryMeta> {}

export interface HomeBatteryData {
	contracts: HomeBatteryContract[];
	powerplay: PowerplayScenario[];
	measurement_groups: MeasurementGroup[];
}

export interface ChartMeasurementMeta {
	delivery: Integer;
	production: Integer;
}

export interface ChartMeasurement {
	value: Integer;
	measured_at: DateTimeString;
	meta?: ChartMeasurementMeta;
}

export interface ChartMeta {
	delivery: Integer;
	production: Integer;
}

export interface ChartData {
	group_type: "normal" | PossiblyUnknownString;
	date: DateTimeString;
	meta: ChartMeta;
	mutable: boolean;
	type: "days" | "months" | "days_cumulative";
	measurements: ChartMeasurement[];
	total: Integer;
}

export default class HomeBattery extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
		private readonly contractUuid: string,
	) {
		super(homey);
	}

	public async getHomeBattery(): Promise<HomeBatteryData> {
		const client = await this.getClient();

		const response = await client.get<Response<HomeBatteryData>>(
			`/connections/${this.connectionUuid}/home-battery-installation/${this.contractUuid}`,
		);

		return response.data.data;
	}

	public async getDailyCharts(date: DateString): Promise<ChartData[]> {
		const client = await this.getClient();

		const response = await client.get<Response<ChartData[]>>(
			`/contracts/${this.contractUuid}/home_battery_installation/charts/days?date=${date}`,
		);

		return response.data.data;
	}

	public async getMonthlyCharts(date: DateString): Promise<ChartData[]> {
		const client = await this.getClient();

		const response = await client.get<Response<ChartData[]>>(
			`/contracts/${this.contractUuid}/home_battery_installation/charts/months?date=${date}`,
		);

		return response.data.data;
	}

	public async getDailyCumulativeCharts(
		date: DateString,
	): Promise<ChartData[]> {
		const client = await this.getClient();

		const response = await client.get<Response<ChartData[]>>(
			`/contracts/${this.contractUuid}/home_battery_installation/charts/days_cumulative?date=${date}`,
		);

		return response.data.data;
	}
}
