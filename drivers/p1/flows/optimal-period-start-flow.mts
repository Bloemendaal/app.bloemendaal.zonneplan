import type { FlowCardTriggerDevice } from "homey";
import Connection, { type ConnectionSummary } from "../../../src/connection.mjs";
import ZonneplanFlow from "../../zonneplan-flow.mjs";
import type P1Device from "../device.mjs";

type OptimizationType = "cheapest" | "sustainable";

interface TriggerArgs {
	type: OptimizationType;
	hours: number;
}

interface PricePerHour {
	electricity_price: number;
	sustainability_score: number;
	datetime: string;
}

export default class OptimalPeriodStartFlow extends ZonneplanFlow<P1Device> {
	private triggerCard: FlowCardTriggerDevice | null = null;
	private scheduledTriggers: Map<string, NodeJS.Timeout> = new Map();

	public async register(): Promise<void> {
		this.triggerCard = this.device.homey.flow.getDeviceTriggerCard(
			"optimal_period_start",
		);

		this.triggerCard.registerRunListener(
			async (
				args: TriggerArgs,
				state: { type: OptimizationType; hours: number },
			) => {
				return args.type === state.type && args.hours === state.hours;
			},
		);
	}

	/**
	 * Called when the device is refreshed with new data.
	 * Schedules triggers for optimal periods based on the current price data.
	 */
	public async scheduleOptimalPeriodTriggers(
		connectionUuid: string,
	): Promise<void> {
		try {
			const connection = new Connection(this.device.homey, connectionUuid);
			const summary = await connection.getSummary();

			if (!summary.price_per_hour || summary.price_per_hour.length === 0) {
				return;
			}

			// Schedule triggers for both types and all hour configurations
			for (const type of ["cheapest", "sustainable"] as OptimizationType[]) {
				for (let hours = 1; hours <= 8; hours++) {
					await this.scheduleOptimalTrigger(summary, type, hours);
				}
			}
		} catch (error) {
			this.device.error("Failed to schedule optimal period triggers:", error);
		}
	}

	private async scheduleOptimalTrigger(
		summary: ConnectionSummary,
		type: OptimizationType,
		hours: number,
	): Promise<void> {
		const priceData = summary.price_per_hour;

		if (priceData.length < hours) {
			return;
		}

		const optimalPeriod = this.findOptimalPeriod(priceData, type, hours);

		if (!optimalPeriod) {
			return;
		}

		const triggerKey = `${type}-${hours}`;
		const startTime = new Date(optimalPeriod.datetime);
		const now = new Date();

		// Clear any existing scheduled trigger for this configuration
		const existingTimeout = this.scheduledTriggers.get(triggerKey);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
			this.scheduledTriggers.delete(triggerKey);
		}

		// Only schedule if the start time is in the future
		if (startTime <= now) {
			return;
		}

		const delay = startTime.getTime() - now.getTime();

		// Don't schedule if the delay is more than 24 hours (to avoid scheduling too far ahead)
		const maxDelay = 24 * 60 * 60 * 1000;
		if (delay > maxDelay) {
			return;
		}

		const timeout = setTimeout(async () => {
			this.scheduledTriggers.delete(triggerKey);
			await this.triggerOptimalPeriodStart(type, hours);
		}, delay);

		this.scheduledTriggers.set(triggerKey, timeout);
	}

	private findOptimalPeriod(
		priceData: PricePerHour[],
		type: OptimizationType,
		hours: number,
	): PricePerHour | null {
		if (priceData.length < hours) {
			return null;
		}

		// Filter to only include future hours
		const now = new Date();
		const futureData = priceData.filter(
			(entry) => new Date(entry.datetime) > now,
		);

		if (futureData.length < hours) {
			return null;
		}

		// Sort by datetime to ensure chronological order
		const sortedData = [...futureData].sort(
			(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
		);

		let bestStartIndex = 0;
		let bestScore =
			type === "cheapest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

		// Sliding window to find the best contiguous period
		for (let i = 0; i <= sortedData.length - hours; i++) {
			// Check if the hours are actually contiguous
			let isContiguous = true;
			for (let j = 0; j < hours - 1; j++) {
				const current = new Date(sortedData[i + j].datetime);
				const next = new Date(sortedData[i + j + 1].datetime);
				const diff = (next.getTime() - current.getTime()) / (1000 * 60 * 60);
				if (diff !== 1) {
					isContiguous = false;
					break;
				}
			}

			if (!isContiguous) {
				continue;
			}

			// Calculate the score for this window
			let windowScore = 0;
			for (let j = 0; j < hours; j++) {
				if (type === "cheapest") {
					windowScore += sortedData[i + j].electricity_price;
				} else {
					windowScore += sortedData[i + j].sustainability_score;
				}
			}

			// For cheapest, we want the lowest score; for sustainable, the highest
			if (type === "cheapest") {
				if (windowScore < bestScore) {
					bestScore = windowScore;
					bestStartIndex = i;
				}
			} else {
				if (windowScore > bestScore) {
					bestScore = windowScore;
					bestStartIndex = i;
				}
			}
		}

		return sortedData[bestStartIndex];
	}

	private async triggerOptimalPeriodStart(
		type: OptimizationType,
		hours: number,
	): Promise<void> {
		if (!this.triggerCard) {
			return;
		}

		try {
			await this.triggerCard.trigger(this.device, {}, { type, hours });
		} catch (error) {
			this.device.error("Failed to trigger optimal period start:", error);
		}
	}

	/**
	 * Clears all scheduled triggers when the device is uninitialized.
	 */
	public clearScheduledTriggers(): void {
		for (const timeout of this.scheduledTriggers.values()) {
			clearTimeout(timeout);
		}
		this.scheduledTriggers.clear();
	}
}
