import type { StartMode } from "../../../src/charge-point.mjs";
import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export default class SetModeFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("set_mode");

		card.registerRunListener(async (args) => {
			await this.handleAction(args);
		});
	}

	private async handleAction(args: { mode: StartMode }): Promise<void> {
		const chargePoint = this.device.getChargePoint();
		await chargePoint.setMode(args.mode);
		this.device.requestRefresh();
	}
}
