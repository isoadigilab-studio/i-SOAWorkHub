"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/utils";
import {
  clientProfileSchema,
  freelancerProfileSchema,
  opportunitySchema,
  portfolioSchema,
} from "@/lib/validations";

const P = "/dashboard/profile";

export async function saveFreelancerProfile(fd: FormData) {
  const { sb, user, profile } = await requireUser(P);
  if (profile.role !== "freelancer") back(P, "error", "freelancer_only");
  const parsed = freelancerProfileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const d = parsed.data;
  const { error } = await sb
    .from("freelancer_profiles")
    .update({
      display_name: d.display_name,
      username: d.username,
      headline: d.headline ?? null,
      bio: d.bio ?? null,
      location: d.location ?? null,
      hourly_rate: d.hourly_rate ?? null,
      currency: d.currency,
      experience_level: d.experience_level,
      availability: d.availability,
      languages: d.languages,
      skills: d.skills,
      visibility: d.visibility,
    })
    .eq("user_id", user.id);
  if (error) back(P, "error", error.code === "23505" ? "username_taken" : "save_failed");
  await sb.from("profiles").update({ full_name: d.display_name }).eq("id", user.id);
  revalidatePath("/dashboard");
  back(P, "msg", "saved");
}

export async function saveClientProfile(fd: FormData) {
  const { sb, user, profile } = await requireUser(P);
  if (profile.role !== "client") back(P, "error", "client_only");
  const parsed = clientProfileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const d = parsed.data;
  const { error } = await sb
    .from("client_profiles")
    .update({
      company_name: d.company_name,
      website: d.website ?? null,
      country: d.country ?? null,
      description: d.description ?? null,
    })
    .eq("user_id", user.id);
  if (error) back(P, "error", "save_failed");
  back(P, "msg", "saved");
}

export async function addPortfolio(fd: FormData) {
  const { sb, user, profile } = await requireUser(P);
  if (profile.role !== "freelancer") back(P, "error", "freelancer_only");
  const parsed = portfolioSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const { count } = await sb.from("portfolios").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 20) back(P, "error", "portfolio_limit");
  const { error } = await sb.from("portfolios").insert({
    user_id: user.id,
    title: parsed.data.title,
    url: parsed.data.url,
    description: parsed.data.description ?? null,
  });
  if (error) back(P, "error", "save_failed");
  back(P, "msg", "saved");
}

export async function deletePortfolio(fd: FormData) {
  const { sb, user } = await requireUser(P);
  await sb.from("portfolios").delete().eq("id", String(fd.get("id"))).eq("user_id", user.id);
  back(P, "msg", "deleted");
}

export async function createOpportunity(fd: FormData) {
  const NEW = "/dashboard/opportunities/new";
  const { sb, user, profile } = await requireUser(NEW);
  if (profile.role !== "client") back("/dashboard", "error", "client_only");
  const parsed = opportunitySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const order = parsed.error.issues.some((i) => i.message === "budget_order");
    back(NEW, "error", order ? "budget_order" : "invalid_input");
  }
  if (!(await limit(sb, "create_opp", 10, 3600, `:${user.id}`))) back(NEW, "error", "too_many");
  const d = parsed.data;
  const { data: cp } = await sb.from("client_profiles").select("company_name").eq("user_id", user.id).single();
  const { error } = await sb.from("opportunities").insert({
    client_id: user.id,
    category_id: d.category_id,
    title: d.title,
    slug: uniqueSlug(d.title),
    description: d.description,
    company_name: cp?.company_name || profile.full_name,
    opportunity_type: d.opportunity_type,
    work_mode: d.work_mode,
    location_text: d.location_text ?? null,
    budget_min: d.budget_min ?? null,
    budget_max: d.budget_max ?? null,
    currency: d.currency,
    skills: d.skills,
    deadline: d.deadline ?? null,
    status: d.intent === "draft" ? "draft" : "pending",
  });
  if (error) back(NEW, "error", "save_failed");
  back("/dashboard/opportunities", "msg", d.intent === "draft" ? "saved" : "submitted_for_review");
}

export async function updateOwnOpportunity(fd: FormData) {
  const L = "/dashboard/opportunities";
  const { sb, user } = await requireUser(L);
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  if (action === "delete") {
    await sb.from("opportunities").delete().eq("id", id).eq("client_id", user.id);
    back(L, "msg", "deleted");
  }
  if (action === "close") {
    await sb.from("opportunities").update({ status: "closed" }).eq("id", id).eq("client_id", user.id);
    back(L, "msg", "closed");
  }
  if (action === "submit") {
    await sb.from("opportunities").update({ status: "pending" }).eq("id", id).eq("client_id", user.id);
    back(L, "msg", "submitted_for_review");
  }
  back(L, "error", "invalid_input");
}

export async function setApplicationStatus(fd: FormData) {
  const oppId = String(fd.get("opportunity_id"));
  const path = `/dashboard/opportunities/${oppId}/applications`;
  const { sb } = await requireUser(path);
  const status = String(fd.get("status"));
  if (!["viewed", "shortlisted", "rejected"].includes(status)) back(path, "error", "invalid_input");
  await sb.from("applications").update({ status }).eq("id", String(fd.get("id"))).eq("opportunity_id", oppId);
  back(path, "msg", "saved");
}

export async function withdrawApplication(fd: FormData) {
  const path = "/dashboard/applications";
  const { sb, user } = await requireUser(path);
  await sb.from("applications").update({ status: "withdrawn" }).eq("id", String(fd.get("id"))).eq("freelancer_id", user.id);
  back(path, "msg", "withdrawn");
}

export async function respondInquiry(fd: FormData) {
  const path = "/dashboard/inquiries";
  const { sb } = await requireUser(path);
  const status = String(fd.get("status"));
  if (!["accepted", "declined", "closed"].includes(status)) back(path, "error", "invalid_input");
  await sb.from("project_inquiries").update({ status }).eq("id", String(fd.get("id")));
  back(path, "msg", "saved");
}

export async function markNotificationsRead() {
  const path = "/dashboard/notifications";
  const { sb, user } = await requireUser(path);
  await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
  back(path, "msg", "saved");
}
