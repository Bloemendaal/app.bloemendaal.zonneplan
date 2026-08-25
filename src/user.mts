import Authenticatable, { type TokensResponse } from "./authenticatable.mjs";
import type {
	ChargeScheduleEntry,
	ChargeTimelineEntry,
} from "./charge-point.mjs";
import createPkcePair, { CODE_CHALLENGE_METHOD } from "./pkce.mjs";
import type {
	DateString,
	DateTimeString,
	Integer,
	PossiblyUnknownString,
	Response,
} from "./types.mjs";

const SOURCE_NAME_MAX_LENGTH = 255;

/**
 * Starting a challenge is answered with a 403, which is the success path
 * of that step rather than an error.
 */
const CHALLENGE_STARTED_STATUS = 403;

interface ChallengeStartedResponse {
	error: "insufficient_authorization" | PossiblyUnknownString;
	auth_session: string;
	otp_required: boolean;
	expires_in: Integer;
}

interface ChallengeCompletedResponse {
	authorization_code: string;
}

interface LoginChallenge {
	authSession: string;
	codeVerifier: string;
	expiresAt: Integer;
}

/**
 * Thrown when the one-time password is submitted without a challenge to
 * complete, or after that challenge has expired. Either way the user has
 * to request a new code.
 */
export class NoLoginChallengeError extends Error {}

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

export interface ChargePointMeta {
	serial_number: string;
	identifier: string;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	show_in_contract_screen: boolean;
	charge_timeline: ChargeTimelineEntry[];
}

export interface ChargePointContract
	extends BaseContractData<"charge_point_installation", ChargePointMeta> {
	charge_schedules: ChargeScheduleEntry[];
}

export interface HomeBatteryMeta {
	identifier: string;
	first_measured_at: DateTimeString | null;
	last_measured_at: DateTimeString | null;
	state_of_charge: Integer;
	power_ac: Integer;
	inverter_state: "Operative" | PossiblyUnknownString;
	battery_state: "Operative" | PossiblyUnknownString;
	dynamic_charging_enabled: boolean;
	home_optimization_enabled: boolean;
	home_optimization_active: boolean;
	dynamic_load_balancing_enabled: boolean;
	dynamic_load_balancing_overload_active: boolean;
	grid_congestion_active: boolean;
	manual_control_enabled: boolean;
	manual_control_state: unknown | null;
	self_consumption_enabled: boolean;
	cycle_count: Integer;
	show_in_contract_screen: boolean;
	reserve_discharge_cutoff_wh: Integer | null;
	backup_power_capable: boolean;
}

export interface HomeBatteryContract
	extends BaseContractData<"home_battery_installation", HomeBatteryMeta> {}

export type ContractData =
	| PvInstallationContract
	| P1InstallationContract
	| ElectricityContract
	| GasContract
	| ChargePointContract
	| HomeBatteryContract;

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
	private challenge: LoginChallenge | null = null;

	public get hasLoginChallenge(): boolean {
		return this.challenge !== null && Date.now() < this.challenge.expiresAt;
	}

	public cancelLoginChallenge(): void {
		this.challenge = null;
	}

	public async getAccount(): Promise<AccountResponse> {
		const client = await this.getClient();

		const response =
			await client.get<Response<AccountResponse>>("/user-accounts/me");

		return response.data.data;
	}

	public async requestOneTimePassword(
		email: string,
		sourceName: string,
	): Promise<void> {
		const { codeVerifier, codeChallenge } = createPkcePair();

		const response = await this.loginClient.post<ChallengeStartedResponse>(
			"/oauth/authorize-challenge",
			{
				response_type: "code",
				email,
				code_challenge: codeChallenge,
				code_challenge_method: CODE_CHALLENGE_METHOD,
				source_name: sourceName.slice(0, SOURCE_NAME_MAX_LENGTH),
			},
			{
				validateStatus: (status) =>
					status === CHALLENGE_STARTED_STATUS ||
					(status >= 200 && status < 300),
			},
		);

		const { auth_session: authSession, expires_in: expiresIn } = response.data;

		if (typeof authSession !== "string" || authSession === "") {
			throw new Error("No authorization session returned");
		}

		this.challenge = {
			authSession,
			codeVerifier,
			expiresAt: Date.now() + expiresIn * 1000,
		};

		this.homey.settings.set("email", email);
	}

	public async setTokensByOneTimePassword(otp: string): Promise<void> {
		const challenge = this.challenge;

		if (challenge === null) {
			throw new NoLoginChallengeError("No login attempt in progress");
		}

		if (Date.now() >= challenge.expiresAt) {
			this.challenge = null;

			throw new NoLoginChallengeError("The login attempt has expired");
		}

		const challengeResponse =
			await this.loginClient.post<ChallengeCompletedResponse>(
				"/oauth/authorize-challenge",
				{
					auth_session: challenge.authSession,
					otp,
				},
			);

		// The challenge is consumed the moment a code is issued, so it can
		// never produce a second one.
		this.challenge = null;

		const response = await this.loginClient.post<TokensResponse>(
			"/oauth/token",
			{
				grant_type: "authorization_code",
				code: challengeResponse.data.authorization_code,
				code_verifier: challenge.codeVerifier,
			},
		);

		this.applySettings(response.data);
	}
}
