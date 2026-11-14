"use server";

import { cookies } from "next/headers";
import { audit, requireRole } from "@/lib/auth";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { back } from "@/lib/flash";
import { parseIsc, unitsToDecimal } from "@/lib/isc";
import { limit } from "@/lib/rate-limit";
import { esc, sendMail } from "@/lib/mail";
import { createPayout, getPayoutState, verifyPayout } from "@/lib/nowpayments";
import { uniqueSlug } from "@/lib/utils";
import { emailOk, inviteSchema, offerSchema, parseEmails, productSchema, reviewSchema, serviceSchema, verifyCodeSchema } from "@/lib/validations";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// ───────── Offers ─────────
export async function createOffer(fd: FormData) {
  const P = "/admin/offers";
  const { sb, user } = await requireRole("admin", P);
  const parsed = offerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const d = parsed.data;
  const { data: o, error } = await sb
    .from("offers")
    .insert({
      slug: uniqueSlug(d.title),
      title: d.title,
      category: d.category,
      description: d.description,
      deadline: d.deadline ?? null,
      visibility: d.visibility,
      status: d.intent,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !o) back(P, "error", "save_failed");
  const { error: e2 } = await sb.from("offer_finance").insert({ offer_id: o.id, price_usd: d.price_usd });
  if (e2) {
    await sb.from("offers").delete().eq("id", o.id);
    back(P, "error", "save_failed");
  }
  if (d.instructions) await sb.from("offer_private").insert({ offer_id: o.id, instructions: d.instructions });
  await audit(sb, user.id, "offer.create", "offer", o.id, { title: d.title, visibility: d.visibility });
  back(P, "msg", "saved");
}

export async function setOfferStatus(fd: FormData) {
  const P = "/admin/offers";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  if (action === "open") await sb.from("offers").update({ status: "open" }).eq("id", id).eq("status", "draft");
  else if (action === "cancel") await sb.from("offers").update({ status: "cancelled" }).eq("id", id).in("status", ["draft", "open", "assigned"]);
  else back(P, "error", "invalid_input");
  await audit(sb, user.id, `offer.${action}`, "offer", id);
  back(P, "msg", "saved");
}

export async function sendInvitations(fd: FormData) {
  const P = "/admin/offers";
  const { sb, user } = await requireRole("admin", P);
  const parsed = inviteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const emails = parseEmails(parsed.data.emails).filter(emailOk).slice(0, 50);
  if (emails.length === 0) back(P, "error", "no_valid_email");
  if (!(await limit(sb, "invite", 10, 3600, `:${user.id}`))) back(P, "error", "too_many");
  const { data: offer } = await sb.from("offers").select("id,title,status,freelancer_amount,deadline").eq("id", parsed.data.offer_id).single();
  if (!offer || offer.status !== "open") back(P, "error", "offer_not_open");
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) back(P, "error", "mail_not_configured");
  const isc = (Math.round(Number(offer.freelancer_amount) * 100) / 10000).toFixed(4);

  let sent = 0;
  for (const email of emails) {
    const { data: inv, error } = await sb
      .from("invitations")
      .upsert({ offer_id: offer.id, email, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() }, { onConflict: "offer_id,email" })
      .select("id,token,status")
      .single();
    if (error || !inv || inv.status === "accepted") continue;
    const link = `${site()}/i/${inv.token}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;background:#0b0e14;color:#f4f4f5;padding:24px;border-radius:16px">
      <h2 style="color:#e8bd62;margin:0 0 12px">i-SOA WorkHub</h2>
      <p style="font-size:16px"><b>${esc(offer.title)}</b></p>
      <p>Vola azonao / Votre part : <b style="color:#e8bd62">${isc} ISC</b></p>
      <p><a href="${link}" style="background:#e8bd62;color:#0b0e14;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:bold">Jereo ny asa / Voir la mission</a></p>
      <p style="color:#9ca3af;font-size:12px">Raha tsy mahazo ny bokotra: ${link}<br/>Tsy misy vola alohan'ny asa. Aucun paiement n'est demandé pour participer.</p></div>`;
    const ok = await sendMail(email, "i-SOA WorkHub — Asa vaovao / Nouvelle mission", html);
    await sb.from("invitations").update({ status: ok ? "sent" : "failed", sent_at: ok ? new Date().toISOString() : null }).eq("id", inv.id);
    if (ok) sent++;
  }
  await audit(sb, user.id, "offer.invite", "offer", offer.id, { sent, total: emails.length });
  back(P, sent > 0 ? "msg" : "error", sent > 0 ? "invites_sent" : "invites_failed");
}

export async function reviewSubmission(fd: FormData) {
  const P = "/admin/submissions";
  const { sb, user } = await requireRole("admin", P);
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const { id, decision, review_note } = parsed.data;
  if (decision === "approve") {
    const { error } = await sb.rpc("approve_submission", { p_id: id });
    if (error) back(P, "error", "save_failed");
  } else {
    const { error } = await sb.from("submissions").update({ status: "rejected", review_note: review_note ?? null }).eq("id", id).eq("status", "submitted");
    if (error) back(P, "error", "save_failed");
  }
  await audit(sb, user.id, `submission.${decision}`, "submission", id);
  back(P, "msg", "saved");
}

// ───────── Withdrawals (ISC held → crypto via NOWPayments, admin 2FA) ─────────
export async function startWithdrawalPayout(fd: FormData) {
  const P = "/admin/withdrawals";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  const { data: w } = await sb.from("withdrawals").select("id,status,np_batch_id,address,network,usd_value").eq("id", id).single();
  if (!w || w.status !== "requested" || w.np_batch_id) back(P, "error", "payout_not_pending");
  try {
    const r = await createPayout(w.address, w.network, Number(w.usd_value), `i-SOA WorkHub ${w.id}`.slice(0, 100));
    const { error } = await sb.rpc("withdrawal_progress", { p_id: w.id, p_batch: r.batchId, p_wid: r.withdrawalId, p_error: null });
    if (error) throw new Error("db_update_failed");
    await audit(sb, user.id, "withdrawal.payout_created", "withdrawal", w.id, { usd: w.usd_value, network: w.network });
  } catch (e: any) {
    await sb.rpc("withdrawal_progress", { p_id: w.id, p_batch: null, p_wid: null, p_error: String(e?.message ?? e).slice(0, 500) });
    back(P, "error", "payout_api_error");
  }
  back(P, "msg", "payout_created_enter_2fa");
}

export async function confirmWithdrawalPayout(fd: FormData) {
  const P = "/admin/withdrawals";
  const { sb, user } = await requireRole("admin", P);
  const parsed = verifyCodeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const { data: w } = await sb.from("withdrawals").select("id,status,np_batch_id").eq("id", parsed.data.id).single();
  if (!w?.np_batch_id || w.status !== "processing") back(P, "error", "payout_not_pending");
  try {
    await verifyPayout(w.np_batch_id, parsed.data.code);
    await sb.rpc("withdrawal_progress", { p_id: w.id, p_batch: null, p_wid: null, p_error: null });
    await audit(sb, user.id, "withdrawal.payout_verified", "withdrawal", w.id);
  } catch (e: any) {
    await sb.rpc("withdrawal_progress", { p_id: w.id, p_batch: null, p_wid: null, p_error: String(e?.message ?? e).slice(0, 500) });
    back(P, "error", "payout_verify_failed");
  }
  back(P, "msg", "payout_processing");
}

/** Authoritative status sync: asks NOWPayments directly (with our credentials) instead of trusting any inbound request. */
export async function syncWithdrawals(sb: any) {
  const { data } = await sb.from("withdrawals").select("id,np_batch_id").eq("status", "processing").not("np_batch_id", "is", null);
  for (const w of data ?? []) {
    try {
      const s = await getPayoutState(w.np_batch_id);
      if (s.state === "finished") await sb.rpc("withdrawal_complete", { p_id: w.id, p_hash: s.hash ?? "" });
      else if (s.state === "failed") await sb.rpc("withdrawal_fail", { p_id: w.id, p_error: "Provider reported failure" });
    } catch {
      /* leave as is; visible on next sync */
    }
  }
}

export async function failWithdrawal(fd: FormData) {
  const P = "/admin/withdrawals";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  const { error } = await sb.rpc("withdrawal_fail", { p_id: id, p_error: String(fd.get("reason") ?? "Rejected by admin").slice(0, 300) });
  if (error) back(P, "error", "save_failed");
  await audit(sb, user.id, "withdrawal.fail", "withdrawal", id);
  back(P, "msg", "saved");
}

// ───────── KYC ─────────
export async function reviewKyc(fd: FormData) {
  const P = "/admin/kyc";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  const decision = String(fd.get("decision"));
  if (!["approved", "rejected"].includes(decision) || !/^[0-9a-f-]{36}$/i.test(id)) back(P, "error", "invalid_input");
  const note = String(fd.get("note") ?? "").slice(0, 500);
  const { error } = await sb.rpc("kyc_review", { p_id: id, p_decision: decision, p_note: note || null });
  if (error) back(P, "error", "save_failed");
  await audit(sb, user.id, `kyc.${decision}`, "kyc", id);
  back(P, "msg", "saved");
}

// ───────── Services catalog, products, merchant keys ─────────
export async function addService(fd: FormData) {
  const P = "/admin/catalog";
  const { sb, user } = await requireRole("admin", P);
  const parsed = serviceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const { error } = await sb.from("services").insert({ code: parsed.data.code, name: parsed.data.name, description: parsed.data.description ?? null });
  if (error) back(P, "error", "save_failed");
  await audit(sb, user.id, "service.create", "service", parsed.data.code);
  back(P, "msg", "saved");
}

export async function addProduct(fd: FormData) {
  const P = "/admin/catalog";
  const { sb, user } = await requireRole("admin", P);
  const parsed = productSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const units = parseIsc(parsed.data.price_isc) as number;
  const { error } = await sb.from("service_products").insert({ service_code: parsed.data.service_code, name: parsed.data.name, price_isc: unitsToDecimal(units) });
  if (error) back(P, "error", "save_failed");
  await audit(sb, user.id, "product.create", "product", null, { name: parsed.data.name });
  back(P, "msg", "saved");
}

export async function toggleProduct(fd: FormData) {
  const P = "/admin/catalog";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  const active = String(fd.get("active")) === "true";
  await sb.from("service_products").update({ active: !active }).eq("id", id);
  await audit(sb, user.id, active ? "product.disable" : "product.enable", "product", id);
  back(P, "msg", "saved");
}

export async function rotateMerchantKey(fd: FormData) {
  const P = "/admin/catalog";
  const { sb, user } = await requireRole("admin", P);
  const code = String(fd.get("service_code") ?? "");
  if (!/^[a-z0-9_-]{2,40}$/.test(code)) back(P, "error", "invalid_input");
  const key = `mk_${randomToken(32)}`;
  const { error } = await sb.from("ticket_merchants").upsert({ service_code: code, key_hash: await sha256Hex(key), rotated_at: new Date().toISOString() }, { onConflict: "service_code" });
  if (error) back(P, "error", "save_failed");
  (await cookies()).set("mk_once", `${code}:${key}`, { httpOnly: true, secure: true, sameSite: "strict", path: "/admin/catalog", maxAge: 90 });
  await audit(sb, user.id, "merchant.key_rotated", "service", code);
  back(P, "msg", "merchant_key_created");
}

// ───────── Users ─────────
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
    : null;
  if (!patch) back(path, "error", "invalid_input");
  const { error } = await sb.from("profiles").update(patch).eq("id", id);
  if (error) back(path, "error", "save_failed");
  await audit(sb, user.id, `user.${action}`, "user", id);
  back(path, "msg", "saved");
}
