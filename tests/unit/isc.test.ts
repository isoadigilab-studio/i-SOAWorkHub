import { describe, expect, it } from "vitest";
import { formatIsc, MIN_WITHDRAW_UNITS, parseIsc, toUnits, unitsToDecimal, unitsToUsd, usdToUnits } from "../../lib/isc";

describe("ISC conversion (1 USD = 0.01 ISC, 1 ISC = 100 USD)", () => {
  it("2 USD -> 0.02 ISC", () => {
    expect(usdToUnits(2)).toBe(200);
    expect(formatIsc(usdToUnits(2))).toBe("0.02");
  });
  it("1 USD -> 0.01 ISC and 1 cent -> 0.0001 ISC", () => {
    expect(formatIsc(usdToUnits(1))).toBe("0.01");
    expect(unitsToDecimal(usdToUnits(0.01))).toBe("0.0001");
  });
  it("1 ISC -> 100 USD", () => {
    expect(unitsToUsd(10_000)).toBe("100.00");
  });
  it("mission example: $20 mission, 40% = $8 -> 0.08 ISC", () => {
    expect(formatIsc(usdToUnits(8))).toBe("0.08");
  });
  it("minimum withdrawal is exactly 0.02 ISC = $2.00", () => {
    expect(MIN_WITHDRAW_UNITS).toBe(200);
    expect(unitsToUsd(MIN_WITHDRAW_UNITS)).toBe("2.00");
  });
});

describe("parsing and precision", () => {
  it("parses up to 4 decimals exactly", () => {
    expect(parseIsc("0.02")).toBe(200);
    expect(parseIsc("12.5")).toBe(125_000);
    expect(parseIsc("0.0001")).toBe(1);
    expect(parseIsc("1,5")).toBe(15_000);
  });
  it("rejects invalid, zero, negative and over-precise values", () => {
    for (const bad of ["", "0", "0.0000", "-1", "1.00001", "abc", "1e3", "99999999999999"]) expect(parseIsc(bad)).toBeNull();
  });
  it("has no float drift (0.1 + 0.2 style)", () => {
    expect(parseIsc("0.1")! + parseIsc("0.2")!).toBe(parseIsc("0.3"));
    expect(unitsToDecimal(parseIsc("0.3")!)).toBe("0.3000");
  });
  it("converts Postgres numerics to units", () => {
    expect(toUnits("12.5000")).toBe(125_000);
    expect(toUnits(0.02)).toBe(200);
    expect(toUnits(null)).toBe(0);
  });
  it("formats with 2 to 4 decimals", () => {
    expect(formatIsc(125_000)).toBe("12.50");
    expect(formatIsc(1)).toBe("0.0001");
    expect(formatIsc(1_234_567)).toBe("123.4567");
    expect(formatIsc(-200)).toBe("-0.02");
  });
});
