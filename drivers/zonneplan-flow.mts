import type { ContractData } from "../src/user.mjs";
import type ZonneplanDevice from "./zonneplan-device.mjs";

export default abstract class ZonneplanFlow<
	T extends ZonneplanDevice<ContractData>,
> {
	constructor(protected readonly device: T) {}

	public abstract register(): Promise<void>;
}
