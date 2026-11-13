/**
 * NOWPayments Mass Payouts client.
 * Flow (per NOWPayments docs): POST /auth -> JWT, POST /payout (create), POST /payout/{id}/verify (2FA code),
 * GET /payout/{id} (status). Secrets come from Cloudflare secrets, never from the repo.
 */
const BASE = "https://api.nowpayments.io/v1";

function creds() {
  const key = process.env.NOWPAYMENTS_API_KEY;
  const email = process.env.NOWPAYMENTS_EMAIL;
  const password = process.env.NOWPAYMENTS_PASSWORD;
  if (!key || !email || !password) throw new Error("NOWPayments is not configured (missing secrets).");
  return { key, email, password };
}

async function jwt(): Promise<{ token: string; key: string }> {
  const { key, email, password } = creds();
  const r = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`NOWPayments auth failed (${r.status})`);
  const j: any = await r.json();
  if (!j?.token) throw new Error("NOWPayments auth returned no token");
  return { token: j.token as string, key };
}

async function errText(r: Response): Promise<string> {
  try {
    const j: any = await r.json();
    return String(j?.message ?? j?.error ?? j?.code ?? r.status).slice(0, 300);
  } catch {
    return String(r.status);
  }
}

export async function createPayout(address: string, currency: string, amount: number, description: string) {
  const { token, key } = await jwt();
  const r = await fetch(`${BASE}/payout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ payout_description: description.slice(0, 100), withdrawals: [{ address, currency, amount }] }),
  });
  if (!r.ok) throw new Error(await errText(r));
  const j: any = await r.json();
  const batchId = String(j?.id ?? "");
  const withdrawalId = j?.withdrawals?.[0]?.id != null ? String(j.withdrawals[0].id) : null;
  if (!batchId) throw new Error("NOWPayments returned no payout id");
  return { batchId, withdrawalId };
}

export async function verifyPayout(batchId: string, code: string) {
  const { token, key } = await jwt();
  const r = await fetch(`${BASE}/payout/${encodeURIComponent(batchId)}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ verification_code: code }),
  });
  if (!r.ok) throw new Error(await errText(r));
}

export type PayoutState = "created" | "processing" | "finished" | "failed";

export async function getPayoutState(batchId: string): Promise<{ state: PayoutState; hash: string | null }> {
  const { token, key } = await jwt();
  const r = await fetch(`${BASE}/payout/${encodeURIComponent(batchId)}`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": key },
  });
  if (!r.ok) throw new Error(await errText(r));
  const j: any = await r.json();
  const w = j?.withdrawals?.[0];
  const raw = String(w?.status ?? j?.status ?? "").toLowerCase();
  const hash = w?.hash ? String(w.hash) : null;
  if (raw === "finished") return { state: "finished", hash };
  if (["failed", "rejected", "expired"].includes(raw)) return { state: "failed", hash };
  if (raw === "creating" || raw === "") return { state: "created", hash };
  return { state: "processing", hash };
}
