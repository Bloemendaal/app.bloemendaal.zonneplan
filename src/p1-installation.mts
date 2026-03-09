import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type {
	DateString,
	DateTimeString,
	Integer,
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
	show_in_contract_screen: boolean;
}

export interface P1InstallationContract
	extends BaseContractData<"p1_installation", P1InstallationMeta> {}

type Granularity = "hours" | "days" | "months";

interface Range {
	start_date: DateTimeString;
	end_date: DateTimeString;
}

interface EnergyVolume {
	wh: Integer;
}

interface GasVolume {
	dm3: Integer;
}

export interface VolumeDataPoint<V> {
	date: DateTimeString;
	volume: V | null;
}

export interface ElectricityVolumesChartResponse {
	chart: {
		granularity: Granularity;
		range: Range;
		series: {
			delivery: VolumeDataPoint<EnergyVolume>[];
			production: VolumeDataPoint<EnergyVolume>[];
		};
	};
}

export interface GasVolumesChartResponse {
	chart: {
		granularity: Granularity;
		range: Range;
		series: {
			delivery: VolumeDataPoint<GasVolume>[];
		};
	};
}

export interface ElectricityProductResultsResponse {
	electricity: {
		net_volume: EnergyVolume;
	};
}

export interface GasProductResultsResponse {
	gas: {
		delivery_volume: GasVolume;
	};
}

export default class P1Installation extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly electricityConnectionUuid: string,
		private readonly gasConnectionUuid: string | null = null,
	) {
		super(homey);
	}

	public async getElectricityVolumesChart(
		start_date: DateString,
		end_date: DateString,
		granularity: Granularity,
	): Promise<ElectricityVolumesChartResponse> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ElectricityVolumesChartResponse>
		>(
			`/api/connections/${this.electricityConnectionUuid}/electricity/charts/volumes`,
			{
				params: { start_date, end_date, granularity },
			},
		);

		return response.data.data;
	}

	public async getGasVolumesChart(
		start_date: DateString,
		end_date: DateString,
		granularity: Granularity,
	): Promise<GasVolumesChartResponse> {
		if (!this.gasConnectionUuid) {
			return {
				chart: {
					granularity,
					range: { start_date, end_date },
					series: { delivery: [] },
				},
			};
		}

		const client = await this.getClient();

		const response = await client.get<Response<GasVolumesChartResponse>>(
			`/api/connections/${this.gasConnectionUuid}/gas/charts/volumes`,
			{ params: { start_date, end_date, granularity } },
		);

		return response.data.data;
	}

	public async getElectricityProductResults(
		start_date: DateString,
		end_date: DateString,
	): Promise<ElectricityProductResultsResponse> {
		const client = await this.getClient();

		const response = await client.get<
			Response<ElectricityProductResultsResponse>
		>(
			`/api/connections/${this.electricityConnectionUuid}/electricity/product/results`,
			{
				params: { start_date, end_date },
			},
		);

		return response.data.data;
	}

	public async getGasProductResults(
		start_date: DateString,
		end_date: DateString,
	): Promise<GasProductResultsResponse> {
		if (!this.gasConnectionUuid) {
			return {
				gas: { delivery_volume: { dm3: 0 } },
			};
		}

		const client = await this.getClient();

		const response = await client.get<Response<GasProductResultsResponse>>(
			`/api/connections/${this.gasConnectionUuid}/gas/product/results`,
			{ params: { start_date, end_date } },
		);

		return response.data.data;
	}
}
