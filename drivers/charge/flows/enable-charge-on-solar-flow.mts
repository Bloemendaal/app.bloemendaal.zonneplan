import type { ChargeOnSolarParams } from "../../../src/charge-point.mjs";
import type { TimeString } from "../../../src/types.mjs";
import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export default class EnableChargeOnSolarFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("enable_charge_on_solar");

		card.registerRunListener(async (args) => {
			await this.handleAction(args);
		});
	}

	private async handleAction(args: {
		start_time: TimeString;
		end_time: TimeString;
		solar_surplus_threshold_w: number;
		/** In minutes, the slider runs from 15 to 60 in steps of 5. */
		min_charge_duration: number;
	}): Promise<void> {
		// Both are zero-padded "HH:mm" strings, so they compare as text.
		if (args.start_time >= args.end_time) {
			throw new Error(this.__("devices.charge.errors.invalid_allowed_window"));
		}

		const params: ChargeOnSolarParams = {
			solar_surplus_threshold_w: Math.round(args.solar_surplus_threshold_w),
			min_charge_duration: `PT${Math.round(args.min_charge_duration)}M`,
			allowed_window: {
				start_time: args.start_time,
				end_time: args.end_time,
			},
		};

		const chargePoint = this.device.getChargePoint();
		await chargePoint.enableChargeOnSolar(params);
		await this.device.requestRefresh(2000, 5000);
	}
}
