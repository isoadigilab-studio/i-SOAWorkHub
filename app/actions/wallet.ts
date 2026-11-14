"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sha256Hex, randomToken } from "@/lib/crypto";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { parseIsc, unitsToDecimal } from "@/lib/isc";
import { paySchema, ticketSchema, transferSchema, withdrawSchema } from "@/lib/validations";

const W = (tab: string) => `/dashboard/wallet?tab=${tab}`;

async function rpc(sb: any, fn: string, args: Record<string, unknown>): Promise<string> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) return "save_failed";
  return typeof data === "string" ? data : "save_failed";
}

export async function transferIsc(fd: FormData) {
  const { sb, user } = await requireUser(W("transfer"));
  const parsed = transferSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(W("transfer"), "error", "invalid_input");
  if (!(await limit(sb, "transfer", 20, 3600, `:${user.id}`))) back(W("transfer"), "error", "too_many");
  const units = parseIsc(parsed.data.amount) as number;
  const r = await rpc(sb, "wallet_transfer", {
    p_to_code: parsed.data.to_code,
    p_amount: unitsToDecimal(units),
    p_note: parsed.data.note ?? null,
    p_key: parsed.data.key,
  });
  revalidatePath("/dashboard", "layout");
  back(W("transfer"), r === "ok" ? "msg" : "error", r === "ok" ? "transfer_done" : r);
}

export async function payProduct(fd: FormData) {
  const { sb, user } = await requireUser(W("payment"));
  const parsed = paySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(W("payment"), "error", "invalid_input");
  if (!(await limit(sb, "pay", 30, 3600, `:${user.id}`))) back(W("payment"), "error", "too_many");
  const r = await rpc(sb, "wallet_pay_product", { p_product: parsed.data.product_id, p_key: parsed.data.key });
  revalidatePath("/dashboard", "layout");
  back(W("payment"), r === "ok" ? "msg" : "error", r === "ok" ? "payment_done" : r);
}

export async function createTicket(fd: FormData) {
  const { sb, user } = await requireUser(W("ticket"));
  const parsed = ticketSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(W("ticket"), "error", "invalid_input");
  if (!(await limit(sb, "ticket", 20, 3600, `:${user.id}`))) back(W("ticket"), "error", "too_many");
  const token = `tk_${randomToken(32)}`;
  const units = parseIsc(parsed.data.amount) as number;
  const r = await rpc(sb, "ticket_create", {
    p_service: parsed.data.service_code,
    p_purpose: parsed.data.purpose,
    p_amount: unitsToDecimal(units),
    p_minutes: Math.round(parsed.data.minutes),
    p_token_hash: await sha256Hex(token),
    p_key: parsed.data.key,
  });
  if (r !== "ok") back(W("ticket"), "error", r);
  // The clear token is shown ONCE through a short-lived httpOnly cookie (never in URLs/logs).
  (await cookies()).set("tk_once", token, { httpOnly: true, secure: true, sameSite: "strict", path: "/dashboard/wallet", maxAge: 90 });
  revalidatePath("/dashboard", "layout");
  back(W("ticket"), "msg", "ticket_created");
}

export async function cancelTicket(fd: FormData) {
  const { sb } = await requireUser(W("ticket"));
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back(W("ticket"), "error", "invalid_input");
  const r = await rpc(sb, "ticket_cancel", { p_id: id });
  revalidatePath("/dashboard", "layout");
  back(W("ticket"), r === "ok" ? "msg" : "error", r === "ok" ? "ticket_cancelled" : r);
}

export async function requestWithdrawal(fd: FormData) {
  const { sb, user } = await requireUser(W("withdraw"));
  const parsed = withdrawSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const bad = parsed.error.issues.some((i) => i.message === "wallet_invalid");
    back(W("withdraw"), "error", bad ? "wallet_invalid" : "invalid_input");
  }
  if (!(await limit(sb, "withdraw", 10, 3600, `:${user.id}`))) back(W("withdraw"), "error", "too_many");
  const units = parseIsc(parsed.data.amount) as number;
  const r = await rpc(sb, "withdrawal_request", {
    p_amount: unitsToDecimal(units),
    p_network: parsed.data.network,
    p_address: parsed.data.address,
    p_key: parsed.data.key,
  });
  revalidatePath("/dashboard", "layout");
  back(W("withdraw"), r === "ok" ? "msg" : "error", r === "ok" ? "withdraw_requested" : r);
}

export async function cancelWithdrawal(fd: FormData) {
  const { sb } = await requireUser(W("withdraw"));
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back(W("withdraw"), "error", "invalid_input");
  const r = await rpc(sb, "withdrawal_cancel", { p_id: id });
  revalidatePath("/dashboard", "layout");
  back(W("withdraw"), r === "ok" ? "msg" : "error", r === "ok" ? "withdraw_cancelled" : r);
}
