import type Homey from "homey/lib/Homey.js";
import Authenticatable from "./authenticatable.mjs";
import type { DateTimeString, Integer, Response } from "./types.mjs";

export type TariffGroup = "low" | "normal" | "high";

export interface ConnectionSummary {
	usage: {
		value: Integer;
		measured_at: DateTimeString;
		type: TariffGroup;
		speed: Integer;
		sustainability_score: Integer;
		status_message: string;
		status_tip: string;
	};
	price_per_hour: {
		/** Price in euro * 10.000.000 */
		electricity_price: Integer;
		/** Price in euro * 10.000.000 */
		electricity_price_excl_tax: Integer;
		tariff_group: TariffGroup;
		solar_percentage: Integer;
		solar_yield: Integer;
		datetime: DateTimeString;
		sustainability_score: Integer;
	}[];
	surplus_electricity: Integer;
	electricity: Integer;
}

export default class Connection extends Authenticatable {
	constructor(
		homey: Homey,
		private readonly connectionUuid: string,
	) {
		super(homey);
	}

	public async getSummary(): Promise<ConnectionSummary> {
		const client = await this.getClient();

		const response = await client.get<Response<ConnectionSummary>>(
			`/connections/${this.connectionUuid}/summary`,
		);

		return response.data.data;
	}
}
