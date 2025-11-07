import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export class EnableAlwaysFlexFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("enable_always_flex");

		card.registerRunListener(async () => {
			await this.handleAction();
		});
	}

	private async handleAction(): Promise<void> {
		const chargePoint = this.device.getChargePoint();
		await chargePoint.enableAlwaysFlex();
		this.device.log("Enabled always flex mode");
		this.device.requestRefresh();
	}
}
