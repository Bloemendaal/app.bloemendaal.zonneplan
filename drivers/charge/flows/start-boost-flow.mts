import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export default class StartBoostFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("start_boost");

		card.registerRunListener(async () => {
			await this.handleAction();
		});
	}

	private async handleAction(): Promise<void> {
		const chargePoint = this.device.getChargePoint();
		await chargePoint.startBoost();
		await this.device.requestRefresh(2000, 5000);
	}
}
