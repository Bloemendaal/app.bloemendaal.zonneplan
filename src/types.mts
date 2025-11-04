export type Integer = number;
export type DateString = string;
export type TimeString = string;
export type DateTimeString = string;
export type PossiblyUnknownString = string;

export interface Response<T> {
	data: T;
}
