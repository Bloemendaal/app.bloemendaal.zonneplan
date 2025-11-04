import Homey from "homey";
import ZonneplanApp from "../app.mjs";
import type {
	AccountResponse,
	ConnectionData,
	ContractData,
} from "../src/user.mjs";
import type ZonneplanFlow from "./zonneplan-flow.mjs";

export default abstract class ZonneplanDevice<
	T extends ContractData,
> extends Homey.Device {
	public abstract refresh(accountResponse: AccountResponse): Promise<void>;

	public onAdded(): void {
		if (this.homey.app instanceof ZonneplanApp) {
			this.homey.app.requestRefresh();
		}
	}

	public async onInit(): Promise<void> {
		await Promise.all(this.getFlows().map((flow) => flow.register()));
	}

	protected getFlows(): ZonneplanFlow<ZonneplanDevice<T>>[] {
		return [];
	}

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
