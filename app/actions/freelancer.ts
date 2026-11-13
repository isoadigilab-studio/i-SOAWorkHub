"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { profileSchema, submissionSchema, walletSchema } from "@/lib/validations";

export async function claimOffer(fd: FormData) {
  const token = String(fd.get("token") ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 64);
  const path = `/i/${token}`;
  const { sb, user, profile } = await requireUser(path);
  if (profile.role !== "freelancer") back(path, "error", "freelancer_only");
  if (!(await limit(sb, "claim", 20, 3600, `:${user.id}`))) back(path, "error", "too_many");
  const { data, error } = await sb.rpc("claim_offer", { p_token: token });
  if (error) back(path, "error", "save_failed");
  if (data !== "ok") back(path, "error", String(data));
  back("/dashboard/tasks", "msg", "offer_accepted");
}

export async function saveWallet(fd: FormData) {
  const P = "/dashboard/wallet";
  const { sb, user } = await requireRole("freelancer", P);
  const parsed = walletSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const bad = parsed.error.issues.some((i) => i.message === "wallet_invalid");
    back(P, "error", bad ? "wallet_invalid" : "invalid_input");
  }
  const { error } = await sb
    .from("freelancer_profiles")
    .update({ wallet_network: parsed.data.wallet_network, wallet_address: parsed.data.wallet_address })
    .eq("user_id", user.id);
  if (error) back(P, "error", "save_failed");
  revalidatePath("/dashboard");
  back(P, "msg", "saved");
}

export async function saveProfile(fd: FormData) {
  const P = "/dashboard/profile";
  const { sb, user } = await requireUser(P);
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  await sb.from("freelancer_profiles").update({ display_name: parsed.data.display_name }).eq("user_id", user.id);
  await sb.from("profiles").update({ full_name: parsed.data.display_name }).eq("id", user.id);
  back(P, "msg", "saved");
}

export async function submitWork(fd: FormData) {
  const parsed = submissionSchema.safeParse(Object.fromEntries(fd));
  const id = String(fd.get("offer_id") ?? "");
  const path = `/dashboard/tasks/${encodeURIComponent(id)}`;
  if (!parsed.success) back(path, "error", "invalid_input");
  const { sb, user } = await requireRole("freelancer", path);
  if (!(await limit(sb, "submit", 20, 3600, `:${user.id}`))) back(path, "error", "too_many");
  const { error } = await sb.from("submissions").insert({
    offer_id: parsed.data.offer_id,
    freelancer_id: user.id,
    url: parsed.data.url,
    note: parsed.data.note ?? null,
  });
  if (error) back(path, "error", "submit_failed");
  back(path, "msg", "work_submitted");
}

export async function markNotificationsRead() {
  const path = "/dashboard/notifications";
  const { sb, user } = await requireUser(path);
  await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
  back(path, "msg", "saved");
}
