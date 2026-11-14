/**
 * ISC money helpers — exact integer arithmetic, no floating point for persistence.
 * Fixed rate (non-negotiable): 1 USD = 0.01 ISC  =>  1 ISC = 100 USD.
 * Internal unit: 1 "unit" = 0.0001 ISC = 1 US cent (because 1 USD = 0.01 ISC = 100 units).
 * The database is the source of truth (usd_to_isc / isc_to_usd); this module mirrors it for display and validation.
 */
export const ISC_SCALE = 10_000; // units per ISC
export const UNITS_PER_USD = 100; // 1 USD = 0.01 ISC = 100 units
export const MIN_WITHDRAW_UNITS = 200; // 0.02 ISC = $2.00

/** Parse a user-entered decimal string ("0.02", "12.5") into integer units, or null if invalid (max 4 decimals). */
export function parseIsc(input: string): number | null {
  const s = String(input ?? "").trim().replace(",", ".");
  const m = /^(\d{1,11})(?:\.(\d{1,4}))?$/.exec(s);
  if (!m) return null;
  const units = Number(m[1]) * ISC_SCALE + Number((m[2] ?? "").padEnd(4, "0") || "0");
  return units > 0 ? units : null;
}

/** Integer units -> exact decimal string with 4 decimals, safe to send to Postgres numeric. */
export function unitsToDecimal(units: number): string {
  const neg = units < 0;
  const u = Math.abs(Math.trunc(units));
  const s = `${Math.trunc(u / ISC_SCALE)}.${String(u % ISC_SCALE).padStart(4, "0")}`;
  return neg ? `-${s}` : s;
}

/** Postgres numeric (number|string) -> integer units. Rounds to 4 decimals. */
export function toUnits(n: number | string | null | undefined): number {
  if (n == null || n === "") return 0;
  return Math.round(Number(n) * ISC_SCALE);
}

/** Display: at least 2 decimals, up to 4, trailing zeros trimmed (12.50, 0.0200 -> 0.02, 0.0001). */
export function formatIsc(units: number): string {
  const neg = units < 0;
  const u = Math.abs(Math.trunc(units));
  const int = Math.trunc(u / ISC_SCALE);
  let frac = String(u % ISC_SCALE).padStart(4, "0");
  while (frac.length > 2 && frac.endsWith("0")) frac = frac.slice(0, -1);
  return `${neg ? "-" : ""}${int.toLocaleString("en-US")}.${frac}`;
}

export function formatIscNumeric(n: number | string | null | undefined): string {
  return formatIsc(toUnits(n));
}

/** USD (number, e.g. mission share 8) -> ISC units. Cents are exact: 1 cent = 1 unit. */
export function usdToUnits(usd: number | string | null | undefined): number {
  if (usd == null || usd === "") return 0;
  return Math.round(Number(usd) * 100);
}

/** ISC units -> indicative USD string with 2 decimals (1 unit = 1 cent). */
export function unitsToUsd(units: number): string {
  const neg = units < 0;
  const cents = Math.abs(Math.trunc(units));
  return `${neg ? "-" : ""}${Math.trunc(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
}
