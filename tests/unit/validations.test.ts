import { describe, expect, it } from "vitest";
import { offerSchema, registerSchema, submissionSchema, transferSchema, withdrawSchema, ticketSchema, parseEmails, emailOk, validWalletAddress } from "../../lib/validations";
import { safeNext, slugify } from "../../lib/utils";
import { sniffMime } from "../../lib/crypto";

const tron = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
const evm = "0x" + "a".repeat(40);

describe("auth", () => {
  it("register lowercases email and rejects short passwords", () => {
    const ok = registerSchema.safeParse({ full_name: "Rina A", email: "A@Example.com", password: "longenough1" });
    expect(ok.success && ok.data.email).toBe("a@example.com");
    expect(registerSchema.safeParse({ full_name: "X Y", email: "a@b.co", password: "short" }).success).toBe(false);
  });
});

describe("wallet inputs", () => {
  it("validates addresses per network", () => {
    expect(validWalletAddress("usdttrc20", tron)).toBe(true);
    expect(validWalletAddress("usdtbsc", evm)).toBe(true);
    expect(validWalletAddress("usdttrc20", evm)).toBe(false);
    expect(validWalletAddress("btc", tron)).toBe(false);
  });
  it("transfer requires a wallet code and a valid amount", () => {
    const base = { to_code: "isc-abcdef1234", amount: "0.0100", key: "abcdefgh-1234" };
    expect(transferSchema.safeParse(base).success).toBe(true);
    expect(transferSchema.safeParse({ ...base, to_code: "someone@mail.com" }).success).toBe(false);
    expect(transferSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(transferSchema.safeParse({ ...base, amount: "1.00001" }).success).toBe(false);
  });
  it("withdrawal only supports USDT networks and matching addresses", () => {
    const base = { amount: "0.02", network: "usdttrc20", address: tron, key: "abcdefgh-1234" };
    expect(withdrawSchema.safeParse(base).success).toBe(true);
    expect(withdrawSchema.safeParse({ ...base, network: "btc" }).success).toBe(false);
    expect(withdrawSchema.safeParse({ ...base, address: evm }).success).toBe(false);
  });
  it("tickets only allow fixed expiries", () => {
    const base = { service_code: "shop-game", purpose: "Order 42", amount: "0.01", minutes: "60", key: "abcdefgh-1234" };
    expect(ticketSchema.safeParse(base).success).toBe(true);
    expect(ticketSchema.safeParse({ ...base, minutes: "99999" }).success).toBe(false);
  });
});

describe("offers and submissions", () => {
  const base = { title: "Logo design mission", category: "design", description: "A".repeat(40), price_usd: "20", intent: "open" };
  it("defaults to invitation-only and accepts open", () => {
    const r = offerSchema.safeParse(base);
    expect(r.success && r.data.visibility).toBe("invite");
    expect(offerSchema.safeParse({ ...base, visibility: "open" }).success).toBe(true);
    expect(offerSchema.safeParse({ ...base, visibility: "public" }).success).toBe(false);
  });
  it("rejects bad price/category and javascript: URLs", () => {
    expect(offerSchema.safeParse({ ...base, price_usd: "0" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...base, category: "hacking" }).success).toBe(false);
    expect(submissionSchema.safeParse({ offer_id: "123e4567-e89b-12d3-a456-426614174000", url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("parses and de-duplicates email lists", () => {
    const list = parseEmails("A@x.com, a@x.com; b@y.org\nnot-an-email");
    expect(list.filter(emailOk)).toEqual(["a@x.com", "b@y.org"]);
  });
});

describe("utils and file sniffing", () => {
  it("only allows relative redirects", () => {
    expect(safeNext("/i/abc")).toBe("/i/abc");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
  });
  it("slugifies accents", () => expect(slugify("Développeur Web !")).toBe("developpeur-web"));
  it("detects real file types from magic bytes", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7 hello"))).toBe("application/pdf");
    expect(sniffMime(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});
