import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export class StartBoostFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("start_boost");

		card.registerRunListener(async () => {
			await this.handleAction();
		});
	}

	private async handleAction(): Promise<void> {
		const chargePoint = this.device.getChargePoint();
		await chargePoint.startBoost();
		this.device.log("Started boost charging");
		this.device.requestRefresh();
	}
}
