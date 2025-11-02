import Homey from "homey";
import type {
	AccountResponse,
	ConnectionData,
	ContractData,
} from "../src/user.mjs";

export default abstract class ZonneplanDevice<
	T extends ContractData,
> extends Homey.Device {
	public abstract refresh(accountResponse: AccountResponse): Promise<void>;

	protected getConnection(
		accountResponse: AccountResponse,
	): ConnectionData | null {
		const data = this.getData();

		for (const addressGroup of accountResponse.address_groups) {
			for (const connection of addressGroup.connections) {
				if (connection.uuid === data.connectionUuid) {
					return connection;
				}
			}
		}

		return null;
	}

	protected getContract(accountResponse: AccountResponse): T | null {
		const connection = this.getConnection(accountResponse);

		if (!connection) {
			return null;
		}

		const data = this.getData();

		for (const contract of connection.contracts) {
			if (contract.uuid === data.contractUuid) {
				return contract as T;
			}
		}

		return null;
	}
}
