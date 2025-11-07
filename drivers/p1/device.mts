import P1Installation from "../../src/p1-installation.mjs";
import type {
	AccountResponse,
	P1InstallationContract,
	P1InstallationMeta,
} from "../../src/user.mjs";
import ZonneplanDevice from "../zonneplan-device.mjs";

export default class P1Device extends ZonneplanDevice<P1InstallationContract> {
	public getP1Installation(): P1Installation {
		const { connectionUuid } = this.getData();
		return new P1Installation(this.homey, connectionUuid);
	}

	public async refresh(accountResponse: AccountResponse): Promise<void> {
		const contract = this.getContract(accountResponse);

		if (!contract) {
			this.error(this.__("devices.p1.errors.not_found"));
			return;
		}

		const { meta } = contract;

		await this.setMeterPower(meta).catch(this.error);
		await this.setMeterGas(meta).catch(this.error);

		if (meta.electricity_last_measured_average_value !== null) {
			await this.setCapabilityValue(
				"measure_power",
				meta.electricity_last_measured_average_value,
			).catch(this.error);
		}
	}

	private async setMeterPower(meta: P1InstallationMeta): Promise<void> {
		if (!meta.electricity_first_measured_at) {
			return;
		}

		const p1Installation = this.getP1Installation();
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
				const response = await p1Installation.getElectricityMonthlyCharts(
					`${year}-01-01`,
				);

				const [chart] = response.measurement_groups;

				importedMeterPower = (chart?.totals?.d ?? 0) / 1000; // Convert Wh to kWh
				exportedMeterPower = (chart?.totals?.p ?? 0) / 1000; // Convert Wh to kWh

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

	private async setMeterGas(meta: P1InstallationMeta): Promise<void> {
		if (!meta.gas_first_measured_at) {
			return;
		}

		if (!this.hasCapability("meter_gas")) {
			await this.addCapability("meter_gas");
		}

		const p1Installation = this.getP1Installation();
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
				const response = await p1Installation.getGasMonthlyCharts(
					`${year}-01-01`,
				);

				const [chart] = response.measurement_groups;

				gasMeterValue = (chart?.total ?? 0) / 1000;

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
}
