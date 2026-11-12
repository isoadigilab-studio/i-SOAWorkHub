"use server";

import { audit, requireRole } from "@/lib/auth";
import { back } from "@/lib/flash";
import { slugify } from "@/lib/utils";
import { categorySchema } from "@/lib/validations";

const OPP_STATUSES = ["published", "rejected", "closed", "pending"];
const REPORT_STATUSES = ["reviewing", "resolved", "dismissed"];

export async function adminSetOpportunity(fd: FormData) {
  const path = "/admin/opportunities";
  const { sb, user } = await requireRole("admin", path);
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  if (action === "delete") {
    await sb.from("opportunities").delete().eq("id", id);
    await audit(sb, user.id, "opportunity.delete", "opportunity", id);
    back(path, "msg", "deleted");
  }
  if (!OPP_STATUSES.includes(action)) back(path, "error", "invalid_input");
  const { error } = await sb.from("opportunities").update({ status: action }).eq("id", id);
  if (error) back(path, "error", "save_failed");
  await audit(sb, user.id, `opportunity.${action}`, "opportunity", id);
  back(path, "msg", "saved");
}

export async function adminSetUser(fd: FormData) {
  const path = "/admin/users";
  const { sb, user } = await requireRole("admin", path);
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  if (id === user.id) back(path, "error", "cannot_self");
  const patch: Record<string, string> | null =
    action === "suspend" ? { status: "suspended" }
    : action === "activate" ? { status: "active" }
    : action === "make_admin" ? { role: "admin" }
    : action === "make_freelancer" ? { role: "freelancer" }
    : action === "make_client" ? { role: "client" }
    : null;
  if (!patch) back(path, "error", "invalid_input");
  const { error } = await sb.from("profiles").update(patch).eq("id", id);
  if (error) back(path, "error", "save_failed");
  await audit(sb, user.id, `user.${action}`, "user", id);
  back(path, "msg", "saved");
}

export async function adminAddCategory(fd: FormData) {
  const path = "/admin/categories";
  const { sb, user } = await requireRole("admin", path);
  const parsed = categorySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(path, "error", "invalid_input");
  const { data: last } = await sb.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { error } = await sb.from("categories").insert({
    ...parsed.data,
    slug: slugify(parsed.data.name),
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
  });
  if (error) back(path, "error", "save_failed");
  await audit(sb, user.id, "category.create", "category", null, { name: parsed.data.name });
  back(path, "msg", "saved");
}

export async function adminToggleCategory(fd: FormData) {
  const path = "/admin/categories";
  const { sb, user } = await requireRole("admin", path);
  const id = String(fd.get("id"));
  const active = String(fd.get("active")) === "true";
  await sb.from("categories").update({ is_active: !active }).eq("id", id);
  await audit(sb, user.id, active ? "category.disable" : "category.enable", "category", id);
  back(path, "msg", "saved");
}

export async function adminSetReport(fd: FormData) {
  const path = "/admin/reports";
  const { sb, user } = await requireRole("admin", path);
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!REPORT_STATUSES.includes(status)) back(path, "error", "invalid_input");
  await sb.from("reports").update({ status }).eq("id", id);
  await audit(sb, user.id, `report.${status}`, "report", id);
  back(path, "msg", "saved");
}
