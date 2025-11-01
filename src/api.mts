import axios, { type AxiosInstance } from "axios";
import type { DateTimeString, Response } from "./types.mjs";

const BASE_URL = "https://app-api.zonneplan.cloud";

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

type LoginResponse = LoginBlockedResponse | LoginActivatedResponse;

export interface TokensResponse {
	token_type: "Bearer";
	expires_in: number;
	access_token: string;
	refresh_token: string;
}

export default class ZonneplanAppApi {
	private readonly apiClient: AxiosInstance;

	constructor() {
		this.apiClient = axios.create({
			baseURL: BASE_URL,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	public async canAccess(): Promise<boolean> {
		return false;
	}

	public async login(email: string): Promise<LoginResponse> {
		const response = await this.apiClient.post<Response<LoginResponse>>(
			"/auth/request",
			{ email },
		);

		return response.data.data;
	}

	public async getOneTimePassword(uuid: string): Promise<LoginResponse> {
		const response = await this.apiClient.get<Response<LoginResponse>>(
			`/auth/request/${uuid}`,
		);

		return response.data.data;
	}

	public async getTokens(
		email: string,
		password: string,
	): Promise<TokensResponse> {
		const response = await this.apiClient.post<TokensResponse>("/oauth/token", {
			email,
			password,
			grant_type: "one_time_password",
		});

		return response.data;
	}
}
