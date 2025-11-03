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

export type ChargePointStateType = "Standby" | PossiblyUnknownString;

export type DynamicLoadBalancingHealth = "HEALTHY" | PossiblyUnknownString;

export type StartMode = "AlwaysFlex" | PossiblyUnknownString;

export interface DynamicChargingUserConstraints {
	desired_distance_in_kilometers: Integer | null;
	desired_additional_battery_percentage: Integer | null;
	desired_end_time: DateTimeString | null;
}

export interface ChargePointSession {
	start_time: DateTimeString;
	charged_distance_in_kilometers: Integer | null;
	charged_additional_battery_percentage: Integer | null;
	active_vehicle_uuid: string;
}

export interface ChargeScheduleEntry {
	suppress_home_battery: boolean;
	start_time: DateTimeString;
	end_time?: DateTimeString;
}

export interface ChargeTimelineEntry {
	start_time: DateTimeString;
	end_time: DateTimeString;
}

export interface ChargePointState {
	connectivity_state: boolean;
	state: ChargePointStateType;
	power_actual: Integer;
	energy_delivered_session: Integer;
	can_charge: boolean;
	can_schedule: boolean;
	charging_manually: boolean;
	charging_automatically: boolean;
	plug_and_charge: boolean;
	overload_protection_active: boolean;
	dynamic_charging_enabled: boolean;
	dynamic_charging_flex_enabled: boolean;
	dynamic_charging_flex_suppressed: boolean;
	dynamic_load_balancing_health: DynamicLoadBalancingHealth;
	charge_schedules: ChargeScheduleEntry[];
	dynamic_charging_user_constraints: DynamicChargingUserConstraints;
	charge_point_session: ChargePointSession | null;
	last_known_vehicle_uuid: string | null;
	start_mode: StartMode;
	plugged_in_at: DateTimeString | null;
}

export interface ChargePointMeta {
	serial_number: string;
	identifier: string;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	show_in_contract_screen: boolean;
	charge_timeline: ChargeTimelineEntry[];
	session_charging_cost_total: number | null;
	session_flex_result: number | null;
	session_charged_energy: number | null;
	session_average_cost_in_cents: number | null;
	charging_cost_total: number | null;
	flex_result: number | null;
	charged_energy: number | null;
	average_cost_in_cents: number | null;
}

export interface ChargePointContract
	extends BaseContractData<"charge_point_installation", ChargePointMeta> {
	state: ChargePointState;
	charge_schedules: ChargeScheduleEntry[];
}

export interface Vehicle {
	uuid: string;
	label: string;
	logo_url: string;
	consumption_wh_per_km: Integer;
	charge_standard_power_in_w: Integer;
	battery_capacity_useable_wh: Integer;
}

export interface ChargePointData {
	contracts: ChargePointContract[];
	powerplay: unknown | null;
	vehicles: Vehicle[];
}

export interface StartDynamicChargingSessionParams {
	user_constraints: {
		desired_end_time: DateTimeString;
		unit: "kilometers" | "percentage";
		value: Integer;
	};
	vehicle?: {
		vehicle_uuid: string;
	};
}

export interface SetScheduleParams {
	schedule: ChargeScheduleEntry[];
}

export interface ChartMeasurement {
	value: Integer;
	measured_at: DateTimeString;
	meta: {
		tariff_group: unknown | null;
		price: Integer;
		flex_result: Integer;
		average_cost_in_cents: Integer;
	};
}

export interface ChartData {
	group_type: "normal" | PossiblyUnknownString;
	date: DateTimeString;
	meta: {
		tariff_group: unknown | null;
		price: Integer;
		flex_result: Integer;
		average_cost_in_cents: Integer;
	};
	mutable: boolean;
	type: "days";
	measurements: ChartMeasurement[];
	total: Integer;
}

export default class ChargePoint extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
		private readonly contractUuid: string,
	) {
		super(homey);
	}

	public async getChargePoint(): Promise<ChargePointData> {
		const client = await this.getClient();

		const response = await client.get<Response<ChargePointData>>(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}`,
		);

		return response.data.data;
	}

	public async startDynamicChargingSession(
		params: StartDynamicChargingSessionParams,
	): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/start_dynamic_charging_session`,
			params,
		);
	}

	public async stopDynamicChargingSession(): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/stop_dynamic_charging_session`,
		);
	}

	public async setSchedule(params: SetScheduleParams): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/set_schedule`,
			params,
		);
	}

	public async resetSchedule(): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/reset_schedule`,
		);
	}

	public async enablePlugAndCharge(): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/enable_plug_and_charge`,
		);
	}

	public async disablePlugAndCharge(): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/disable_plug_and_charge`,
		);
	}

	public async enableAlwaysFlex(): Promise<void> {
		const client = await this.getClient();

		await client.post(
			`/connections/${this.connectionUuid}/charge-points/${this.contractUuid}/actions/enable_always_flex`,
		);
	}

	public async getCharts(date: DateString): Promise<ChartData[]> {
		const client = await this.getClient();

		const response = await client.get<Response<ChartData[]>>(
			`/contracts/${this.contractUuid}/charge_point_installation/charts/days?date=${date}`,
		);

		return response.data.data;
	}
}
