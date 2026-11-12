"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { applicationSchema, inquirySchema, reportSchema } from "@/lib/validations";

export async function toggleBookmark(fd: FormData) {
  const id = String(fd.get("opportunity_id") ?? "");
  const path = String(fd.get("path") ?? "/opportunities");
  const target = path.startsWith("/") && !path.startsWith("//") ? path : "/opportunities";
  const { sb, user } = await getSession();
  if (!user) back(`/login?next=${encodeURIComponent(target)}`, "error", "login_required");
  const { data: existing } = await sb.from("bookmarks").select("opportunity_id").eq("user_id", user.id).eq("opportunity_id", id).maybeSingle();
  if (existing) await sb.from("bookmarks").delete().eq("user_id", user.id).eq("opportunity_id", id);
  else await sb.from("bookmarks").insert({ user_id: user.id, opportunity_id: id });
  revalidatePath(target);
  back(target, "msg", existing ? "bookmark_removed" : "bookmark_saved");
}

export async function applyToOpportunity(fd: FormData) {
  const parsed = applicationSchema.safeParse(Object.fromEntries(fd));
  const slug = String(fd.get("slug") ?? "");
  const path = `/opportunities/${encodeURIComponent(slug)}`;
  if (!parsed.success) back(path, "error", "invalid_input");
  const { sb, user, profile } = await getSession();
  if (!user) back("/login", "error", "login_required");
  if (profile.role !== "freelancer") back(path, "error", "freelancer_only");
  if (!(await limit(sb, "apply", 15, 3600, `:${user.id}`))) back(path, "error", "too_many");
  const { error } = await sb.from("applications").insert({
    opportunity_id: parsed.data.opportunity_id,
    freelancer_id: user.id,
    cover_note: parsed.data.cover_note,
    portfolio_url: parsed.data.portfolio_url ?? null,
  });
  if (error) back(path, "error", error.code === "23505" ? "already_applied" : "apply_failed");
  back("/dashboard/applications", "msg", "application_sent");
}

export async function reportOpportunity(fd: FormData) {
  const parsed = reportSchema.safeParse(Object.fromEntries(fd));
  const slug = String(fd.get("slug") ?? "");
  const path = `/opportunities/${encodeURIComponent(slug)}`;
  if (!parsed.success) back(path, "error", "invalid_input");
  const { sb, user } = await getSession();
  if (!user) back("/login", "error", "login_required");
  if (!(await limit(sb, "report", 10, 3600, `:${user.id}`))) back(path, "error", "too_many");
  const { error } = await sb.from("reports").insert({
    reporter_id: user.id,
    opportunity_id: parsed.data.opportunity_id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  if (error) back(path, "error", "report_failed");
  back(path, "msg", "report_sent");
}

export async function sendInquiry(fd: FormData) {
  const parsed = inquirySchema.safeParse(Object.fromEntries(fd));
  const username = String(fd.get("username") ?? "");
  const path = `/freelancers/${encodeURIComponent(username)}`;
  if (!parsed.success) back(path, "error", "invalid_input");
  const { sb, user, profile } = await getSession();
  if (!user) back("/login", "error", "login_required");
  if (profile.role !== "client") back(path, "error", "client_only");
  if (!(await limit(sb, "inquiry", 10, 3600, `:${user.id}`))) back(path, "error", "too_many");
  const { error } = await sb.from("project_inquiries").insert({
    client_id: user.id,
    freelancer_id: parsed.data.freelancer_id,
    subject: parsed.data.subject,
    message: parsed.data.message,
    budget: parsed.data.budget ?? null,
  });
  if (error) back(path, "error", "inquiry_failed");
  back("/dashboard/inquiries", "msg", "inquiry_sent");
}
