import { describe, expect, it } from "vitest";
import { offerSchema, registerSchema, submissionSchema, walletSchema, parseEmails, emailOk, validWalletAddress } from "../../lib/validations";
import { safeNext, slugify } from "../../lib/utils";

describe("registerSchema", () => {
  it("accepts a valid account and lowercases the email", () => {
    const r = registerSchema.safeParse({ full_name: "Rina A", email: "A@Example.com", password: "longenough1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@example.com");
  });
  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ full_name: "X Y", email: "a@b.co", password: "short" }).success).toBe(false);
  });
});

describe("wallet validation", () => {
  const tron = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
  const evm = "0x" + "a".repeat(40);
  it("accepts matching address/network pairs", () => {
    expect(validWalletAddress("usdttrc20", tron)).toBe(true);
    expect(validWalletAddress("usdtbsc", evm)).toBe(true);
    expect(validWalletAddress("usdtmatic", evm)).toBe(true);
  });
  it("rejects mismatched pairs", () => {
    expect(validWalletAddress("usdttrc20", evm)).toBe(false);
    expect(validWalletAddress("usdtbsc", tron)).toBe(false);
    expect(walletSchema.safeParse({ wallet_network: "usdtbsc", wallet_address: tron }).success).toBe(false);
  });
});

describe("offerSchema", () => {
  const base = { title: "Logo design mission", category: "design", description: "A".repeat(40), price_usd: "20", intent: "open" };
  it("coerces the price", () => {
    const r = offerSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price_usd).toBe(20);
  });
  it("rejects zero or negative price and unknown category", () => {
    expect(offerSchema.safeParse({ ...base, price_usd: "0" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...base, category: "hacking" }).success).toBe(false);
  });
});

describe("submissions and emails", () => {
  it("blocks javascript: URLs", () => {
    expect(submissionSchema.safeParse({ offer_id: "123e4567-e89b-12d3-a456-426614174000", url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("accepts https URLs", () => {
    expect(submissionSchema.safeParse({ offer_id: "123e4567-e89b-12d3-a456-426614174000", url: "https://drive.google.com/x" }).success).toBe(true);
  });
  it("parses and de-duplicates email lists", () => {
    const list = parseEmails("A@x.com, a@x.com; b@y.org\nnot-an-email");
    expect(list).toEqual(["a@x.com", "b@y.org", "not-an-email"]);
    expect(list.filter(emailOk)).toEqual(["a@x.com", "b@y.org"]);
  });
});

describe("utils", () => {
  it("only allows relative redirects", () => {
    expect(safeNext("/i/abc")).toBe("/i/abc");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
  });
  it("slugifies accents", () => {
    expect(slugify("Développeur Web !")).toBe("developpeur-web");
  });
});
