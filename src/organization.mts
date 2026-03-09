import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type { DateString, Integer, Response } from "./types.mjs";

interface Money {
	amount: Integer; // divide by 10_000_000 for Euros
}

interface EnergyVolume {
	wh: Integer;
}

interface GasVolume {
	dm3: Integer;
}

interface FlexCosts {
	flex_costs: Money;
}

interface AssetCosts {
	costs: FlexCosts[];
	aggregate: FlexCosts;
}

export interface EnergysupplyCostsResponse {
	usage_costs: {
		electricity_costs: {
			delivery_volume: EnergyVolume;
			delivery_measured_volume: EnergyVolume;
			delivery_costs: Money;
			delivery_costs_tax_excluded: Money;
			delivery_measured_costs_tax_excluded: Money;
			production_volume: EnergyVolume;
			production_measured_volume: EnergyVolume;
			production_costs: Money;
			production_costs_tax_excluded: Money;
			production_measured_costs_tax_excluded: Money;
			aggregate: {
				electricity_usage_costs: Money;
				electricity_usage_costs_tax_excluded: Money;
				average_delivery_costs_per_kwh: Money;
				average_delivery_costs_tax_excluded_per_kwh: Money;
				average_production_costs_per_kwh: Money;
				average_production_costs_tax_excluded_per_kwh: Money;
				net_volume: EnergyVolume;
			};
		};
		gas_costs: {
			gas_delivery_costs: Money;
			gas_delivery_costs_tax_excluded: Money;
			gas_delivery_volume: GasVolume;
			aggregate: {
				gas_usage_costs: Money;
				average_gas_usage_costs_per_m3: Money;
			};
		};
		aggregate: {
			energy_supply_usage_costs: Money;
			energy_supply_usage_costs_electricity_tax_excluded: Money;
		};
	};
	asset_costs: {
		home_battery: AssetCosts;
		pv_system: AssetCosts;
		charge_point: AssetCosts;
		aggregate: FlexCosts;
	};
	total_costs: {
		energy_usage_costs: Money;
		flextricity_costs: Money;
		average_flextricity_costs_per_kwh: Money;
		total_energy_costs: Money;
	};
}

export default class Organization extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly organizationUuid: string,
		private readonly addressId: string,
	) {
		super(homey);
	}

	public async getEnergysupplyCosts(
		start_date: DateString,
		end_date: DateString,
	): Promise<EnergysupplyCostsResponse> {
		const client = await this.getClient();

		const response = await client.get<Response<EnergysupplyCostsResponse>>(
			`/api/organizations/${this.organizationUuid}/addresses/${this.addressId}/energy-supply/costs`,
			{ params: { start_date, end_date } },
		);

		return response.data.data;
	}
}
