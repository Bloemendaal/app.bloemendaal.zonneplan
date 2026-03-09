import P1Installation, {
	type VolumeDataPoint,
} from "../../src/p1-installation.mjs";
import type {
	AccountResponse,
	P1InstallationContract,
	P1InstallationMeta,
} from "../../src/user.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

interface Connections {
	electricity: string;
	gas: string | null;
}

export default class P1Device extends ZonneplanDevice<P1InstallationContract> {
	public async refresh(accountResponse: AccountResponse): Promise<void> {
		const contract = this.getContract(accountResponse);

		if (!contract) {
			await this.setUnavailable(this.__("devices.p1.errors.not_found")).catch(
				this.error,
			);

			return;
		}

		const connections = this.getGasConnectionUuid(accountResponse);

		const p1Installation = new P1Installation(
			this.homey,
			connections.electricity,
			connections.gas,
		);

		const { meta } = contract;

		await this.setAvailable().catch(this.error);
		await this.setMeterPower(meta, p1Installation).catch(this.error);
		await this.setMeterGas(meta, p1Installation).catch(this.error);

		if (meta.electricity_last_measured_average_value !== null) {
			await this.setCapabilityValue(
				"measure_power",
				meta.electricity_last_measured_average_value,
			).catch(this.error);
		}
	}

	private getGasConnectionUuid(accountResponse: AccountResponse): Connections {
		const { connectionUuid: electricityConnectionUuid } = this.getData();

		for (const addressGroup of accountResponse.address_groups) {
			let hasElectricityConnection = false;
			let foundGasConnectionUuid: string | null = null;

			for (const connection of addressGroup.connections) {
				if (connection.uuid === electricityConnectionUuid) {
					hasElectricityConnection = true;

					if (foundGasConnectionUuid) {
						return {
							electricity: electricityConnectionUuid,
							gas: foundGasConnectionUuid,
						};
					}
				}

				if (connection.market_segment === "gas") {
					foundGasConnectionUuid = connection.uuid;

					if (hasElectricityConnection) {
						return {
							electricity: electricityConnectionUuid,
							gas: foundGasConnectionUuid,
						};
					}
				}
			}
		}

		return {
			electricity: electricityConnectionUuid,
			gas: null,
		};
	}

	private async setMeterPower(
		meta: P1InstallationMeta,
		p1Installation: P1Installation,
	): Promise<void> {
		if (!meta.electricity_first_measured_at) {
			return;
		}

		const currentYear = new Date().getFullYear();
		const firstMeasuredInYear = new Date(
			meta.electricity_first_measured_at,
		).getFullYear();

		let cumulativeImportedEnergy = 0;
		let cumulativeExportedEnergy = 0;

		for (let year = firstMeasuredInYear; year <= currentYear; year++) {
			const imported = `meter_power.imported.${year}`;
			const importedAdded = await this.addMeterCapability(
				imported,
				`capabilities.meter_power_imported_year.title`,
				year,
			);

			const exported = `meter_power.exported.${year}`;
			const exportedAdded = await this.addMeterCapability(
				exported,
				`capabilities.meter_power_exported_year.title`,
				year,
			);

			let importedMeterPower = this.getCapabilityValue(imported);
			let exportedMeterPower = this.getCapabilityValue(exported);

			if (
				importedAdded ||
				exportedAdded ||
				year === currentYear ||
				typeof importedMeterPower !== "number" ||
				typeof exportedMeterPower !== "number" ||
				(this.getCapabilityValue(`timestamp.${imported}`) ?? 0) < year ||
				(this.getCapabilityValue(`timestamp.${exported}`) ?? 0) < year
			) {
				const { chart } = await p1Installation.getElectricityVolumesChart(
					`${year}-01-01`,
					`${year}-12-31`,
					"months",
				);

				importedMeterPower =
					this.sumVolumes(chart.series.delivery, (v) => v.wh) / 1000; // Wh → kWh
				exportedMeterPower =
					this.sumVolumes(chart.series.production, (v) => v.wh) / 1000; // Wh → kWh

				await this.setCapabilityValue(imported, importedMeterPower);
				await this.setCapabilityValue(exported, exportedMeterPower);

				await this.setCapabilityValue(`timestamp.${imported}`, currentYear);
				await this.setCapabilityValue(`timestamp.${exported}`, currentYear);
			}

			cumulativeImportedEnergy += importedMeterPower;
			cumulativeExportedEnergy += exportedMeterPower;
		}

		await this.setCapabilityValue(
			"meter_power.imported",
			cumulativeImportedEnergy,
		);
		await this.setCapabilityValue(
			"meter_power.exported",
			cumulativeExportedEnergy,
		);
	}

	private async setMeterGas(
		meta: P1InstallationMeta,
		p1Installation: P1Installation,
	): Promise<void> {
		if (!meta.gas_first_measured_at) {
			return;
		}

		if (!this.hasCapability("meter_gas")) {
			await this.addCapability("meter_gas");
		}

		const currentYear = new Date().getFullYear();
		const firstMeasuredInYear = new Date(
			meta.gas_first_measured_at,
		).getFullYear();

		let cumulativeGasConsumption = 0;

		for (let year = firstMeasuredInYear; year <= currentYear; year++) {
			const capability = `meter_gas.${year}`;
			const addedCapability = await this.addMeterCapability(
				capability,
				"capabilities.meter_gas_year.title",
				year,
			);

			let gasMeterValue = this.getCapabilityValue(capability);

			if (
				addedCapability ||
				year === currentYear ||
				typeof gasMeterValue !== "number" ||
				(this.getCapabilityValue(`timestamp.${capability}`) ?? 0) < year
			) {
				const { chart } = await p1Installation.getGasVolumesChart(
					`${year}-01-01`,
					`${year}-12-31`,
					"months",
				);

				gasMeterValue =
					this.sumVolumes(chart.series.delivery, (v) => v.dm3) / 1000; // dm3 → m3

				await this.setCapabilityValue(capability, gasMeterValue);
				await this.setCapabilityValue(`timestamp.${capability}`, currentYear);
			}

			cumulativeGasConsumption += gasMeterValue;
		}

		await this.setCapabilityValue("meter_gas", cumulativeGasConsumption);
	}

	private async addMeterCapability(
		capability: string,
		translation: string,
		year: number,
	): Promise<boolean> {
		const hasCapability = this.hasCapability(capability);

		if (!hasCapability) {
			await this.addCapability(capability);
			await this.setCapabilityOptions(capability, {
				title: this.__(translation, {
					year: year.toString(),
				}),
			});

			await this.addCapability(`timestamp.${capability}`);
			await this.setCapabilityOptions(`timestamp.${capability}`, {
				unit: "years",
			});
		}

		return !hasCapability;
	}

	private sumVolumes<T>(
		data: VolumeDataPoint<T>[],
		getValue: (v: T) => number,
	): number {
		return data.reduce(
			(sum, point) => sum + (point.volume ? getValue(point.volume) : 0),
			0,
		);
	}
}
