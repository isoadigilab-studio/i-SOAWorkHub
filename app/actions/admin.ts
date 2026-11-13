"use server";

import { audit, requireRole } from "@/lib/auth";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { esc, sendMail } from "@/lib/mail";
import { createPayout, verifyPayout } from "@/lib/nowpayments";
import { uniqueSlug } from "@/lib/utils";
import { emailOk, inviteSchema, offerSchema, parseEmails, reviewSchema, verifyCodeSchema } from "@/lib/validations";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

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
      instructions: d.instructions ?? null,
      deadline: d.deadline ?? null,
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
  await audit(sb, user.id, "offer.create", "offer", o.id, { title: d.title });
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

  let sent = 0;
  for (const email of emails) {
    const { data: inv, error } = await sb
      .from("invitations")
      .upsert({ offer_id: offer.id, email, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() }, { onConflict: "offer_id,email" })
      .select("id,token,status")
      .single();
    if (error || !inv || inv.status === "accepted") continue;
    const link = `${site()}/i/${inv.token}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px">
      <h2 style="color:#14243B">i-SOA WorkHub</h2>
      <p><b>${esc(offer.title)}</b></p>
      <p>Vola azonao / Votre part : <b>${Number(offer.freelancer_amount).toFixed(2)} USDT</b></p>
      <p><a href="${link}" style="background:#FF6B35;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block">Jereo ny asa / Voir la mission</a></p>
      <p style="color:#64748B;font-size:12px">Raha tsy mahazo ny bokotra: ${link}<br/>Tsy misy vola alohan'ny asa. Aucun paiement n'est demandé pour participer.</p></div>`;
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

export async function startPayout(fd: FormData) {
  const P = "/admin/payouts";
  const { sb, user } = await requireRole("admin", P);
  const id = String(fd.get("id"));
  // Atomic claim so a double tap can never create two payouts.
  const { data: row } = await sb
    .from("payouts")
    .update({ status: "created", last_error: null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,address,network,amount_usd,offer_id")
    .maybeSingle();
  if (!row) back(P, "error", "payout_not_pending");
  try {
    const r = await createPayout(row.address, row.network, Number(row.amount_usd), `i-SOA WorkHub ${row.offer_id}`.slice(0, 100));
    await sb.from("payouts").update({ np_batch_id: r.batchId, np_withdrawal_id: r.withdrawalId }).eq("id", id);
    await audit(sb, user.id, "payout.create", "payout", id, { amount: row.amount_usd, network: row.network });
  } catch (e: any) {
    await sb.from("payouts").update({ status: "pending", last_error: String(e?.message ?? e).slice(0, 500) }).eq("id", id);
    back(P, "error", "payout_api_error");
  }
  back(P, "msg", "payout_created_enter_2fa");
}

export async function confirmPayout(fd: FormData) {
  const P = "/admin/payouts";
  const { sb, user } = await requireRole("admin", P);
  const parsed = verifyCodeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(P, "error", "invalid_input");
  const { data: row } = await sb.from("payouts").select("id,np_batch_id,status").eq("id", parsed.data.id).single();
  if (!row?.np_batch_id || row.status !== "created") back(P, "error", "payout_not_pending");
  try {
    await verifyPayout(row.np_batch_id, parsed.data.code);
    await sb.from("payouts").update({ status: "processing", last_error: null }).eq("id", row.id);
    await audit(sb, user.id, "payout.verify", "payout", row.id);
  } catch (e: any) {
    await sb.from("payouts").update({ last_error: String(e?.message ?? e).slice(0, 500) }).eq("id", row.id);
    back(P, "error", "payout_verify_failed");
  }
  back(P, "msg", "payout_processing");
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
    : null;
  if (!patch) back(path, "error", "invalid_input");
  const { error } = await sb.from("profiles").update(patch).eq("id", id);
  if (error) back(path, "error", "save_failed");
  await audit(sb, user.id, `user.${action}`, "user", id);
  back(path, "msg", "saved");
}
