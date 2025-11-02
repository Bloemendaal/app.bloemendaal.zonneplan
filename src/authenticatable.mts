import axios, { type AxiosInstance } from "axios";
import type Homey from "homey/lib/Homey.js";
import type { Integer } from "./types.mjs";

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 1 minute
export const BASE_URL = "https://app-api.zonneplan.cloud";

export interface TokensResponse {
	token_type: "Bearer";
	expires_in: Integer;
	access_token: string;
	refresh_token: string;
}

export default abstract class Authenticatable {
	protected readonly loginClient: AxiosInstance;

	constructor(protected readonly homey: Homey) {
		this.loginClient = axios.create({
			baseURL: BASE_URL,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	protected async getClient(): Promise<AxiosInstance> {
		const accessToken = await this.getValidAccessToken();

		return axios.create({
			baseURL: BASE_URL,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
		});
	}

	protected applySettings(tokens: TokensResponse): void {
		this.homey.settings.set("accessToken", tokens.access_token);
		this.homey.settings.set("refreshToken", tokens.refresh_token);
		this.homey.settings.set("expiresAt", Date.now() + tokens.expires_in * 1000);
	}

	private async getValidAccessToken(): Promise<string> {
		const accessToken = this.homey.settings.get("accessToken");

		if (accessToken && !this.isTokenExpired()) {
			return accessToken;
		}

		return await this.refreshTokens();
	}

	private async refreshTokens(): Promise<string> {
		const refreshToken = this.homey.settings.get("refreshToken");

		if (typeof refreshToken !== "string") {
			throw new Error("No refresh token available");
		}

		const response = await this.loginClient.post<TokensResponse>(
			"/oauth/token",
			{
				refresh_token: refreshToken,
				grant_type: "refresh_token",
			},
		);

		this.applySettings(response.data);

		return response.data.access_token;
	}

	private isTokenExpired(): boolean {
		const expiresAt = this.homey.settings.get("expiresAt") || 0;

		if (!expiresAt) {
			return true;
		}

		const now = Date.now();

		return expiresAt * 1000 - now < TOKEN_EXPIRY_BUFFER_MS;
	}
}
