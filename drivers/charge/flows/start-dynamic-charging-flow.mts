import type { StartDynamicChargingSessionParams } from "../../../src/charge-point.mjs";
import type { DateString, TimeString } from "../../../src/types.mjs";
import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type ChargeDevice from "../device.mjs";

export class StartDynamicChargingFlow extends ZonneplanFlow<ChargeDevice> {
	public async register(): Promise<void> {
		const card = this.device.homey.flow.getActionCard("start_dynamic_charging");

		card.registerRunListener(async (args) => {
			await this.handleAction(args);
		});

		card.registerArgumentAutocompleteListener("vehicle", async (query) => {
			return this.handleVehicleAutocomplete(query);
		});
	}

	private async handleAction(args: {
		end_date: DateString;
		end_time: TimeString;
		unit: "kilometers" | "percentage";
		value: number;
		vehicle?: { id: string; name: string };
	}): Promise<void> {
		const chargePoint = this.device.getChargePoint();

		const [day, month, year] = args.end_date.split("-").map(Number);
		const [hours, minutes] = args.end_time.split(":").map(Number);

		// Create datetime from date and time
		const endTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

		const params: StartDynamicChargingSessionParams = {
			user_constraints: {
				desired_end_time: endTime.toISOString(),
				unit: args.unit,
				value: Math.round(args.value),
			},
		};

		// Add vehicle if selected
		if (args.vehicle) {
			params.vehicle = {
				vehicle_uuid: args.vehicle.id,
			};
		}

		await chargePoint.startDynamicChargingSession(params);
		this.device.log("Started dynamic charging session", params);
	}

	private async handleVehicleAutocomplete(
		query: string,
	): Promise<{ id: string; name: string; image?: string }[]> {
		const chargePoint = this.device.getChargePoint();
		const data = await chargePoint.getChargePoint();
		const vehicles = data.vehicles;

		// Filter vehicles based on query
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
