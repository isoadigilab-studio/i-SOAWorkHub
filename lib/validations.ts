import { z } from "zod";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optStr = (max: number) => z.preprocess(empty, z.string().trim().max(max).optional());

export const optNum = z.preprocess((v) => {
  const e = empty(v);
  return e === undefined || e === null ? undefined : Number(e);
}, z.number().min(0).max(1_000_000_000).optional());

export const safeUrl = z.preprocess(
  empty,
  z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "http(s) only")
    .optional(),
);

export const csvList = (maxItems: number, maxLen: number) =>
  z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [],
    z.array(z.string().max(maxLen)).max(maxItems),
  );

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const CURRENCIES = ["USD", "EUR", "MGA"] as const;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, "password_short").max(200),
  role: z.enum(["freelancer", "client"]),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const passwordSchema = z.object({ password: z.string().min(10, "password_short").max(200) });

export const freelancerProfileSchema = z.object({
  display_name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/),
  headline: optStr(160),
  bio: optStr(3000),
  location: optStr(120),
  hourly_rate: optNum,
  currency: z.enum(CURRENCIES),
  experience_level: z.enum(["entry", "intermediate", "expert"]),
  availability: z.enum(["available", "busy", "unavailable"]),
  languages: csvList(15, 30),
  skills: csvList(30, 40),
  visibility: checkbox,
});

export const clientProfileSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  website: safeUrl,
  country: optStr(80),
  description: optStr(3000),
});

export const portfolioSchema = z.object({
  title: z.string().trim().min(2).max(120),
  url: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "http(s) only"),
  description: optStr(500),
});

export const opportunitySchema = z
  .object({
    title: z.string().trim().min(5).max(140),
    description: z.string().trim().min(30).max(5000),
    category_id: z.string().uuid(),
    opportunity_type: z.enum(["freelance", "full_time", "part_time"]),
    work_mode: z.enum(["remote", "on_site", "hybrid"]),
    location_text: optStr(120),
    budget_min: optNum,
    budget_max: optNum,
    currency: z.enum(CURRENCIES),
    skills: csvList(20, 40),
    deadline: z.preprocess(empty, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    intent: z.enum(["draft", "submit"]),
  })
  .refine((v) => v.budget_min == null || v.budget_max == null || v.budget_min <= v.budget_max, {
    message: "budget_order",
  });

export const applicationSchema = z.object({
  opportunity_id: z.string().uuid(),
  slug: z.string().max(200),
  cover_note: z.string().trim().min(20).max(3000),
  portfolio_url: safeUrl,
});

export const reportSchema = z.object({
  opportunity_id: z.string().uuid(),
  slug: z.string().max(200),
  reason: z.enum(["scam", "fee_required", "misleading", "inappropriate", "other"]),
  details: optStr(2000),
});

export const inquirySchema = z.object({
  freelancer_id: z.string().uuid(),
  username: z.string().max(40),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(3000),
  budget: optStr(80),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  name_fr: z.string().trim().min(2).max(80),
  name_mg: z.string().trim().min(2).max(80),
});
