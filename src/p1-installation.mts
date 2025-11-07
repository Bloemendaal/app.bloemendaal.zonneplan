import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type { TariffGroup } from "./connection.mjs";
import type {
	DateString,
	DateTimeString,
	Float,
	Integer,
	PossiblyUnknownString,
	Response,
} from "./types.mjs";
import type { BaseContractData } from "./user.mjs";

export interface P1InstallationMeta {
	electricity_meter_code: string;
	electricity_meter_identifier: string;
	electricity_first_measured_at: DateTimeString;
	electricity_last_measured_at: DateTimeString;
	electricity_last_measured_production_at: DateTimeString;
	electricity_last_measured_delivery_value: Integer;
	electricity_last_measured_production_value: Integer;
	electricity_last_measured_average_value: Integer;
	gas_first_measured_at: DateTimeString;
	gas_last_measured_at: DateTimeString;
	gas_meter_code: string;
	gas_meter_identifier: string;
	dsmr_version: string;
	sgn_serial_number: string;
	sgn_firmware: string;
	status_override?: {
		main_title: string;
		short_message: string;
		long_message: string;
		message_type: "info" | PossiblyUnknownString;
		url: string | null;
		url_title: string | null;
	};
	show_in_contract_screen: boolean;
}

export interface P1InstallationContract
	extends BaseContractData<"p1_installation", P1InstallationMeta> {}

export interface DeliveryProduction<T> {
	d: T;
	p: T;
}

export interface GasMeasurement {
	value: Integer;
	date: DateTimeString;
	meta?: {
		has_supply_contract: 0 | 1;
	};
}

export interface ElectricityMeasurement {
	values: DeliveryProduction<Integer | null>;
	date: DateTimeString;
	meta?:
		| {
				has_supply_contract: 0 | 1;
				result_tax_excluded: Integer;
				result_tax_included: Integer;
		  }
		| {
				tariff_group: TariffGroup;
		  };
}

export interface GasMeasurementGroup {
	group_type: "normal" | PossiblyUnknownString;
	date: DateTimeString;
	meta: {
		price: null;
		has_supply_contract: boolean;
		energy_delivered_sum: Integer;
		delivery_costs_excl_tax: Integer;
		delivery_costs_incl_tax: Float;
		delivery_price_per_unit_excl_tax: Integer;
		delivery_price_per_unit_incl_tax: Float;
	};
	mutable: boolean;
	type: "hours" | "days" | "months";
	measurements: GasMeasurement[];
	total: Integer;
}

export interface ElectricityMeasurementGroup {
	group_type: "multi" | PossiblyUnknownString;
	date: DateTimeString;
	meta: {
		price: null;
		has_supply_contract: boolean;
		energy_delivered_sum: Integer;
		delivery_costs_excl_tax: Integer;
		delivery_costs_incl_tax: Float;
		delivery_price_per_unit_excl_tax: Integer;
		delivery_price_per_unit_incl_tax: Float;
		result_tax_excluded?: Integer;
		result_tax_included?: Integer;
	};
	mutable: boolean;
	type: "live" | "hours" | "days" | "months";
	measurements: ElectricityMeasurement[];
	totals: DeliveryProduction<Integer | null>;
	labels: DeliveryProduction<string>;
}

export interface ConnectionResponse<T> {
	contracts: P1InstallationContract[];
	powerplay: unknown | null;
	measurement_groups: T[];
}

export default class P1Installation extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
	) {
		super(homey);
	}

	public async getElectricityMeasurements(): Promise<
		ConnectionResponse<ElectricityMeasurementGroup>
	> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<ElectricityMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/electricity`);

		return response.data.data;
	}

	public async getElectricityLiveCharts(): Promise<
		ConnectionResponse<ElectricityMeasurementGroup>
	> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<ElectricityMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/electricity_delivered/charts/live`);

		return response.data.data;
	}

	public async getElectricityHourlyCharts(
		date: DateString,
	): Promise<ConnectionResponse<ElectricityMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<ElectricityMeasurementGroup>>
		>(
			`/connections/${this.connectionUuid}/electricity_delivered/charts/hours`,
			{ params: { date } },
		);

		return response.data.data;
	}

	public async getElectricityDailyCharts(
		date: DateString,
	): Promise<ConnectionResponse<ElectricityMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<ElectricityMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/electricity_delivered/charts/days`, {
			params: { date },
		});

		return response.data.data;
	}

	public async getElectricityMonthlyCharts(
		date: DateString,
	): Promise<ConnectionResponse<ElectricityMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<ElectricityMeasurementGroup>>
		>(
			`/connections/${this.connectionUuid}/electricity_delivered/charts/months`,
			{ params: { date } },
		);

		return response.data.data;
	}

	public async getGasMeasurements(): Promise<
		ConnectionResponse<GasMeasurementGroup>
	> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<GasMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/gas`);

		return response.data.data;
	}

	public async getGasHourlyCharts(
		date: DateString,
	): Promise<ConnectionResponse<GasMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<GasMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/gas/charts/hours`, {
			params: { date },
		});

		return response.data.data;
	}

	public async getGasDailyCharts(
		date: DateString,
	): Promise<ConnectionResponse<GasMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<GasMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/gas/charts/days`, {
			params: { date },
		});

		return response.data.data;
	}

	public async getGasMonthlyCharts(
		date: DateString,
	): Promise<ConnectionResponse<GasMeasurementGroup>> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ConnectionResponse<GasMeasurementGroup>>
		>(`/connections/${this.connectionUuid}/gas/charts/months`, {
			params: { date },
		});

		return response.data.data;
	}
}
