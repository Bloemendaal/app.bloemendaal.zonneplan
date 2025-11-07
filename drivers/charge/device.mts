import type {
	ChargePointContract,
	ChargePointMeta,
} from "../../src/charge-point.mjs";
import ChargePoint from "../../src/charge-point.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";
import type ZonneplanFlow from "../zonneplan-flow.mjs";
import { DisableAlwaysFlexFlow } from "./flows/disable-always-flex-flow.mjs";
import { DisablePlugAndChargeFlow } from "./flows/disable-plug-and-charge-flow.mjs";
import { EnableAlwaysFlexFlow } from "./flows/enable-always-flex-flow.mjs";
import { EnablePlugAndChargeFlow } from "./flows/enable-plug-and-charge-flow.mjs";
import { SetModeFlow } from "./flows/set-mode-flow.mjs";
import { StartBoostFlow } from "./flows/start-boost-flow.mjs";
import { StartDynamicChargingFlow } from "./flows/start-dynamic-charging-flow.mjs";
import { StopChargingFlow } from "./flows/stop-charging-flow.mjs";
import { StopDynamicChargingFlow } from "./flows/stop-dynamic-charging-flow.mjs";
import { UnsuppressAlwaysFlexFlow } from "./flows/unsuppress-always-flex-flow.mjs";

export default class ChargeDevice extends ZonneplanDevice<ChargePointContract> {
	public getChargePoint(): ChargePoint {
		const { connectionUuid, contractUuid } = this.getData();

		return new ChargePoint(this.homey, connectionUuid, contractUuid);
	}

	public async onInit(): Promise<void> {
		await super.onInit();

		this.registerCapabilityListener("evcharger_charging", async (value) => {
			const chargePoint = this.getChargePoint();
			const data = await chargePoint.getChargePoint();
			const [contract] = data.contracts;

			if (!contract) {
				this.error(this.__("devices.charge.errors.not_found"));
				return;
			}

			const isConnected = contract.state.plugged_in_at !== null;

			if (!isConnected) {
				this.error(this.__("devices.charge.errors.cable_not_connected"));
				return;
			}

			if (value) {
				await chargePoint.startBoost();
			} else {
				await chargePoint.stopCharging();

				if (this.getSettings().auto_unsuppress_always_flex) {
					await chargePoint.unsuppressAlwaysFlex();
				}
			}

			this.requestRefresh();
		});
	}

	public async refresh(): Promise<void> {
		const chargePoint = this.getChargePoint();

		const data = await chargePoint.getChargePoint();

		const [contract] = data.contracts;

		if (!contract) {
			this.error(this.__("devices.charge.errors.not_found"));
			return;
		}

		const { state, meta } = contract;

		await this.setMeterPower(chargePoint, meta).catch(this.error);
		await this.setCapabilityValue("measure_power", state.power_actual);

		const isCharging = state.charging_manually || state.charging_automatically;
		await this.setCapabilityValue("evcharger_charging", isCharging);

		let chargingState:
			| "plugged_in_charging"
			| "plugged_in_discharging"
			| "plugged_in_paused"
			| "plugged_in"
			| "plugged_out";

		if (state.plugged_in_at === null) {
			chargingState = "plugged_out";
		} else if (isCharging) {
			chargingState = "plugged_in_charging";
		} else {
			chargingState = "plugged_in_paused";
		}

		await this.setCapabilityValue("evcharger_charging_state", chargingState);
	}

	protected override getFlows(): ZonneplanFlow<ChargeDevice>[] {
		return [
			new StartDynamicChargingFlow(this),
			new StopDynamicChargingFlow(this),
			new EnablePlugAndChargeFlow(this),
			new DisablePlugAndChargeFlow(this),
			new EnableAlwaysFlexFlow(this),
			new DisableAlwaysFlexFlow(this),
			new SetModeFlow(this),
			new StartBoostFlow(this),
			new StopChargingFlow(this),
			new UnsuppressAlwaysFlexFlow(this),
		];
	}

	/**
	 * To figure out the cumulative charged energy charged since we started measuring,
	 * we need to know the year of the first measurement and then call the API for eachta
	 * year. However, to prevent spamming the API, we store the years that have already
	 * passed. The timestamp that this year was set, must be in a year after that year
	 * to ensure we know it has actually passed.
	 */
	private async setMeterPower(
		chargePoint: ChargePoint,
		meta: ChargePointMeta,
	): Promise<void> {
		if (!meta.first_measured_at) {
			return;
		}

		const currentYear = new Date().getFullYear();
		const firstMeasuredInYear = new Date(meta.first_measured_at).getFullYear();

		let cumulativeChargedEnergy = 0;

		for (let year = firstMeasuredInYear; year <= currentYear; year++) {
			const capability = `meter_power.charged.${year}`;
			const hasCapability = this.hasCapability(capability);

			if (!hasCapability) {
				await this.addCapability(capability);
				await this.setCapabilityOptions(capability, {
					title: this.__("capabilities.meter_power_charged_year.title", {
						year: year.toString(),
					}),
				});

				await this.addCapability(`timestamp.${capability}`);
				await this.setCapabilityOptions(`timestamp.${capability}`, {
					unit: "years",
				});
			}

			let meterPower = this.getCapabilityValue(capability);

			if (
				!hasCapability ||
				year === currentYear ||
				typeof meterPower !== "number" ||
				(this.getCapabilityValue(`timestamp.${capability}`) ?? 0) < year
			) {
				const [chart] = await chargePoint.getMonthlyCharts(`${year}-01-01`);

				// Convert Wh to kWh
				meterPower = (chart?.total ?? 0) / 1000;

				await this.setCapabilityValue(capability, meterPower);
				await this.setCapabilityValue(`timestamp.${capability}`, currentYear);
			}

			cumulativeChargedEnergy += meterPower;
		}

		await this.setCapabilityValue(
			"meter_power.charged",
			cumulativeChargedEnergy,
		);
	}
}
