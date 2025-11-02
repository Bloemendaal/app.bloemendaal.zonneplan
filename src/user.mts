import Authenticatable, { type TokensResponse } from "./authenticatable.mjs";
import type { ChargePointContract } from "./charge-point.mjs";
import type {
	DateString,
	DateTimeString,
	Integer,
	PossiblyUnknownString,
	Response,
} from "./types.mjs";

interface LoginBlockedResponse {
	uuid: string;
	email: string;
	is_activated: false;
	expires_at: DateTimeString;
}

interface LoginActivatedResponse {
	uuid: string;
	email: string;
	password: string;
	is_activated: true;
	expires_at: DateTimeString;
}

export type LoginResponse = LoginBlockedResponse | LoginActivatedResponse;

type ButtonData = unknown;

export interface UserAccountData {
	initials: string;
	uuid: string;
	email: string;
	first_name: string;
	full_name: string;
	is_representative: boolean;
	show_energy_product: boolean;
}

export interface FeatureData {
	code: string;
	start_date: DateString;
	label: string;
}

export interface BaseContractData<T extends string, M extends object> {
	uuid: string;
	label: string;
	type: T;
	start_date: DateTimeString;
	end_date: DateTimeString | null;
	meta: M;
}

export interface PvInstallationMeta {
	identifier: string;
	name: string;
	panel_count: Integer;
	panel_type: unknown | null;
	installation_wp: Integer;
	panel_wp: Integer;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	last_measured_power_value: Integer | null;
	total_power_measured: Integer;
	sgn_serial_number: string;
	module_firmware_version: string;
	inverter_firmware_version: string;
	show_in_contract_screen: boolean;
	enable_pv_analysis: boolean;
	dynamic_control_enabled: boolean;
	expected_surplus_kwh: Integer;
	power_limit_active: boolean;
	current_scenario: unknown | null;
}

export interface PvInstallationContract
	extends BaseContractData<"pv_installation", PvInstallationMeta> {}

export interface P1InstallationMeta {
	electricity_meter_code: string;
	electricity_meter_identifier: string;
	electricity_first_measured_at: DateTimeString | null;
	electricity_last_measured_at: DateTimeString | null;
	electricity_last_measured_production_at: DateTimeString | null;
	electricity_last_measured_delivery_value: Integer | null;
	electricity_last_measured_production_value: Integer | null;
	electricity_last_measured_average_value: Integer | null;
	gas_first_measured_at: DateTimeString | null;
	gas_last_measured_at: DateTimeString | null;
	gas_meter_code: string;
	gas_meter_identifier: string;
	dsmr_version: string;
	sgn_serial_number: string;
	sgn_firmware: string;
	show_in_contract_screen: boolean;
}

export interface P1InstallationContract
	extends BaseContractData<"p1_installation", P1InstallationMeta> {}

export interface ElectricitGasMeta {
	external_contract_id: string;
	agreement_date: DateString;
	original_end_date: DateString | null;
	contract_type: "smart" | PossiblyUnknownString;
	proposition_reference: string;
	start_reason: unknown | null;
	end_reason: unknown | null;
	show_in_contract_screen: boolean;
	expected_delivery: Integer;
	expected_production: Integer;
	gas_price_ceiling_contract_start_date: DateString | null;
	gas_price_ceiling_contract_end_date: DateString | null;
	deposit_type: "dynamic" | PossiblyUnknownString;
	monthly_advanced_deposit_amount: unknown | null;
}

export interface ElectricityContract
	extends BaseContractData<"electricity", ElectricitGasMeta> {}

export interface GasContract
	extends BaseContractData<"gas", ElectricitGasMeta> {}

export type ContractData =
	| PvInstallationContract
	| P1InstallationContract
	| ElectricityContract
	| GasContract
	| ChargePointContract;

export interface ConnectionData {
	uuid: string;
	ean: string;
	market_segment: "electricity" | "gas";
	contracts: ContractData[];
	features: FeatureData[];
	buttons: ButtonData[];
}

export interface AddressData {
	id: string;
	zipcode: string;
	street: string;
	number: string;
	addition: string;
	city: string;
	sunrise: DateTimeString;
	sunset: DateTimeString;
}

export interface DebtorData {
	name: string;
	bank_account_number: string;
	mandate_reference: string;
	mandate_date: DateString;
	payment_method: string;
}

export interface OrganisationData {
	number: string;
	name: string;
	phone_numbers: string[];
	emails: string[];
	privacy_service_code: string;
	address: AddressData;
	debtor: DebtorData;
}

export interface GuestAddressGroupData {
	uuid: string;
	connections: ConnectionData[];
	address: AddressData;
	is_representative: false;
	organization_uuid: string;
}

export interface RepresentativeAddressGroupData {
	uuid: string;
	connections: ConnectionData[];
	address: AddressData;
	is_representative: true;
	organization: OrganisationData;
	organization_uuid: string;
}

export type AddressGroupData =
	| GuestAddressGroupData
	| RepresentativeAddressGroupData;

export interface ChatData {
	user: {
		identifier: string;
		email: string;
		name: string;
	};
	custom_attributes: {
		source: "app" | PossiblyUnknownString;
	};
}

export interface NotificationSettingData {
	slug: string;
	name: string;
	description: string;
	push_enabled: boolean;
}

export interface NotificationSettingGroupData {
	slug: string;
	name: string;
	description: string;
	settings: NotificationSettingData[];
}

export interface AccountResponse {
	user_account: UserAccountData;
	address_groups: AddressGroupData[];
	buttons: ButtonData[];
	iar_enabled: boolean;
	unread_notification_count: number;
	notification_setting_groups: NotificationSettingGroupData[];
}

export default class User extends Authenticatable {
	public async getAccount(): Promise<AccountResponse> {
		const client = await this.getClient();

		const response =
			await client.get<Response<AccountResponse>>("/user-accounts/me");

		return response.data.data;
	}

	public async getAuthentication(email: string): Promise<LoginResponse> {
		const response = await this.loginClient.post<Response<LoginResponse>>(
			"/auth/request",
			{ email },
		);

		this.homey.settings.set("email", email);

		return response.data.data;
	}

	public async getOneTimePassword(uuid: string): Promise<LoginResponse> {
		const response = await this.loginClient.get<Response<LoginResponse>>(
			`/auth/request/${uuid}`,
		);

		return response.data.data;
	}

	public async setTokensByPassword(password: string): Promise<void> {
		const email = this.homey.settings.get("email");

		if (typeof email !== "string") {
			throw new Error("No email available");
		}

		const response = await this.loginClient.post<TokensResponse>(
			"/oauth/token",
			{
				email,
				password,
				grant_type: "one_time_password",
			},
		);

		this.applySettings(response.data);
	}
}
