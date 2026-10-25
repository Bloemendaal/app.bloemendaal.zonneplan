export type Float = number;
export type Integer = number;
export type DateString = string;
export type TimeString = string;
export type DateTimeString = string;
/** ISO 8601 duration, e.g. PT15M */
export type DurationString = string;
export type PossiblyUnknownString = string;

export interface Response<T> {
	data: T;
}
