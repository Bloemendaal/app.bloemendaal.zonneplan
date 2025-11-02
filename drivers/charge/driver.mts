import type { AccountResponse } from "../../src/user.mjs";
import ZonneplanDriver, {
	type ZonneplanDeviceData,
} from "../zonneplan-driver.mjs";

export default class ChargeDriver extends ZonneplanDriver {
	protected toDevices(accountResponse: AccountResponse): ZonneplanDeviceData[] {
		return accountResponse.address_groups.flatMap((group) =>
			group.connections.flatMap((connection) =>
				connection.contracts
					.filter((contract) => contract.type === "charge_point_installation")
					.map((contract) => ({
						name: contract.label,
						data: {
							contractUuid: contract.uuid,
							connectionUuid: connection.uuid,
						},
					})),
			),
		);
	}
}
