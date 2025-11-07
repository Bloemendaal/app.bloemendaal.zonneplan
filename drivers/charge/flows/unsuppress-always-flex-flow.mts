import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export class UnsuppressAlwaysFlexFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("unsuppress_always_flex");

		card.registerRunListener(async () => {
			await this.handleAction();
		});
	}

	private async handleAction(): Promise<void> {
		const chargePoint = this.device.getChargePoint();
		await chargePoint.unsuppressAlwaysFlex();
		this.device.log("Unsuppressed always flex mode");
		this.device.requestRefresh();
	}
}
