import type { StartDynamicChargingSessionParams } from "../../../src/charge-point.mjs";
import type { DateString, TimeString } from "../../../src/types.mjs";
import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

interface VehicleOption {
	id: string;
	name: string;
	image?: string;
}

export class StartDynamicChargingFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const cards = [
			this.device.homey.flow
				.getActionCard("start_dynamic_charging_based_on_absolute_date_time")
				.registerRunListener(this.handleAbsoluteDateTimeAction.bind(this)),
			this.device.homey.flow
				.getActionCard("start_dynamic_charging_based_on_relative_time")
				.registerRunListener(this.handleRelativeTimeAction.bind(this)),
			this.device.homey.flow
				.getActionCard("start_dynamic_charging_based_on_relative_days")
				.registerRunListener(this.handleRelativeDaysAction.bind(this)),
			this.device.homey.flow
				.getActionCard("start_dynamic_charging_based_on_string")
				.registerRunListener(this.handleStringAction.bind(this)),
		];

		for (const card of cards) {
			card.registerArgumentAutocompleteListener(
				"vehicle",
				this.handleVehicleAutocomplete.bind(this),
			);
		}
	}

	private async handleAbsoluteDateTimeAction(args: {
		end_date: DateString;
		end_time: TimeString;
		unit: "kilometers" | "percentage";
		value: number;
		vehicle?: VehicleOption;
	}): Promise<void> {
		const [day, month, year] = args.end_date.split("-").map(Number);
		const [hours, minutes] = args.end_time.split(":").map(Number);

		const endTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

		return this.handleAction({
			endTime,
			unit: args.unit,
			value: args.value,
			vehicle: args.vehicle,
		});
	}

	private async handleRelativeTimeAction(args: {
		length_from_now: number;
		length_unit: "minutes" | "hours";
		value: number;
		unit: "kilometers" | "percentage";
		vehicle?: VehicleOption;
	}): Promise<void> {
		const endTime = new Date();

		if (args.length_unit === "minutes") {
			endTime.setMinutes(endTime.getMinutes() + args.length_from_now);
		}

		if (args.length_unit === "hours") {
			endTime.setHours(endTime.getHours() + args.length_from_now);
		}

		return this.handleAction({
			endTime,
			unit: args.unit,
			value: args.value,
			vehicle: args.vehicle,
		});
	}

	private async handleRelativeDaysAction(args: {
		days_from_now: number;
		time: TimeString;
		value: number;
		unit: "kilometers" | "percentage";
		vehicle?: VehicleOption;
	}): Promise<void> {
		const endTime = new Date();

		const [hours, minutes] = args.time.split(":").map(Number);

		endTime.setDate(endTime.getDate() + args.days_from_now);
		endTime.setHours(hours);
		endTime.setMinutes(minutes);
		endTime.setSeconds(0);
		endTime.setMilliseconds(0);

		return this.handleAction({
			endTime,
			unit: args.unit,
			value: args.value,
			vehicle: args.vehicle,
		});
	}

	private async handleStringAction(args: {
		end_date_time: string;
		value: number;
		unit: "kilometers" | "percentage";
		vehicle?: VehicleOption;
	}): Promise<void> {
		const endTime = new Date(args.end_date_time);

		return this.handleAction({
			endTime,
			unit: args.unit,
			value: args.value,
			vehicle: args.vehicle,
		});
	}

	private async handleAction(args: {
		endTime: Date;
		value: number;
		unit: "kilometers" | "percentage";
		vehicle?: VehicleOption;
	}): Promise<void> {
		const chargePoint = this.device.getChargePoint();

		const params: StartDynamicChargingSessionParams = {
			user_constraints: {
				desired_end_time: args.endTime.toISOString(),
				unit: args.unit,
				value: Math.round(args.value),
			},
		};

		if (args.vehicle) {
			params.vehicle = {
				vehicle_uuid: args.vehicle.id,
			};
		}

		await chargePoint.startDynamicChargingSession(params);
		this.device.requestRefresh();
	}

	private async handleVehicleAutocomplete(
		query: string,
	): Promise<VehicleOption[]> {
		const chargePoint = this.device.getChargePoint();
		const { vehicles } = await chargePoint.getChargePoint();

		const filteredVehicles = vehicles.filter((vehicle) =>
			vehicle.label.toLowerCase().includes(query.toLowerCase()),
		);

		return filteredVehicles.map((vehicle) => ({
			id: vehicle.uuid,
			name: vehicle.label,
			image: vehicle.logo_url,
		}));
	}
}
