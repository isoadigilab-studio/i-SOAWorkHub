import { formatIscNumeric, toUnits, unitsToUsd } from "@/lib/isc";

export function Isc({ value, className = "" }: { value: number | string | null | undefined; className?: string }) {
  return <span className={className}>{formatIscNumeric(value)} <span className="text-[0.7em] font-semibold opacity-80">ISC</span></span>;
}

export function usdHint(value: number | string | null | undefined): string {
  return `≈ $${unitsToUsd(toUnits(value))}`;
}

/** Mission reward: offers store the freelancer share in USD (cents); 1 USD = 0.01 ISC, so cents map 1:1 to ISC units. */
export function rewardIsc(usd: number | string | null | undefined): number {
  return Math.round(Number(usd ?? 0) * 100) / 10000;
}
