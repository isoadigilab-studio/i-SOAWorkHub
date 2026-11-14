import { z } from "zod";
import { parseIsc } from "./isc";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optStr = (max: number) => z.preprocess(empty, z.string().trim().max(max).optional());

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "http(s) only");

export const CATEGORIES = [
  "design",
  "development",
  "social_media",
  "video",
  "writing",
  "translation",
  "data_entry",
  "assistant",
  "other",
] as const;

export const NETWORKS = {
  usdttrc20: "USDT (TRC20 / Tron)",
  usdtbsc: "USDT (BEP20 / BNB Chain)",
  usdtmatic: "USDT (Polygon)",
} as const;
export type Network = keyof typeof NETWORKS;

export function validWalletAddress(network: string, address: string): boolean {
  if (network === "usdttrc20") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  if (network === "usdtbsc" || network === "usdtmatic") return /^0x[a-fA-F0-9]{40}$/.test(address);
  return false;
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, "password_short").max(200),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const passwordSchema = z.object({ password: z.string().min(10, "password_short").max(200) });
export const profileSchema = z.object({ display_name: z.string().trim().min(2).max(120) });


export const offerSchema = z.object({
  visibility: z.enum(["invite", "open"]).default("invite"),
  title: z.string().trim().min(5).max(140),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(20).max(5000),
  instructions: optStr(5000),
  price_usd: z.coerce.number().positive().max(10_000_000),
  deadline: z.preprocess(empty, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  intent: z.enum(["draft", "open"]),
});

export function parseEmails(raw: string): string[] {
  const list = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(list));
}
export const emailOk = (e: string) => z.string().email().max(254).safeParse(e).success;

export const inviteSchema = z.object({
  offer_id: z.string().uuid(),
  emails: z.string().min(3).max(5000),
});

export const submissionSchema = z.object({
  offer_id: z.string().uuid(),
  url: httpUrl,
  note: optStr(2000),
});

export const reviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  review_note: optStr(1000),
});

export const verifyCodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().trim().regex(/^\d{4,10}$/),
});

const iscAmount = z.string().trim().refine((v) => parseIsc(v) !== null, "invalid_amount");
const idemKey = z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const transferSchema = z.object({
  to_code: z.string().trim().toUpperCase().regex(/^ISC-[A-Z0-9]{10}$/),
  amount: iscAmount,
  note: optStr(100),
  key: idemKey,
});
export const paySchema = z.object({ product_id: z.string().uuid(), key: idemKey });
export const ticketSchema = z.object({
  service_code: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  purpose: z.string().trim().min(3).max(80),
  amount: iscAmount,
  minutes: z.coerce.number().int().refine((n) => [15, 60, 1440, 4320].includes(n)),
  key: idemKey,
});
export const withdrawSchema = z
  .object({
    amount: iscAmount,
    network: z.enum(["usdttrc20", "usdtbsc", "usdtmatic"]),
    address: z.string().trim().min(20).max(120),
    key: idemKey,
  })
  .refine((v) => validWalletAddress(v.network, v.address), { message: "wallet_invalid" });
export const kycSchema = z.object({
  legal_name: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80),
  doc_type: z.enum(["national_id", "passport", "driver_license"]),
});
export const serviceSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/),
  name: z.string().trim().min(2).max(80),
  description: optStr(300),
});
export const productSchema = z.object({
  service_code: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  name: z.string().trim().min(2).max(100),
  price_isc: iscAmount,
});
