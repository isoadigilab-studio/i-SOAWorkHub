import { confirmPayout, startPayout } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { getPayoutState } from "@/lib/nowpayments";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Payouts" };

export default async function AdminPayouts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/payouts");

  // Sync live status of in-flight payouts from NOWPayments (no webhook needed).
  const { data: inflight } = await sb.from("payouts").select("id,status,np_batch_id").in("status", ["created", "processing"]).not("np_batch_id", "is", null);
  for (const p of inflight ?? []) {
    try {
      const s = await getPayoutState(p.np_batch_id);
      if (s.state !== p.status || s.hash) {
        await sb.from("payouts").update({
          status: s.state,
          tx_hash: s.hash,
          paid_at: s.state === "finished" ? new Date().toISOString() : null,
        }).eq("id", p.id);
      }
    } catch {
      /* keep current status; shown error appears on next action */
    }
  }

  const { data } = await sb
    .from("payouts")
    .select("id,amount_usd,network,address,status,tx_hash,last_error,created_at,offers(title),freelancer_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Crypto payouts (NOWPayments)</h1>
      <p className="mt-1 text-sm text-muted">Step 1: Create payout. Step 2: enter the 2FA code from your authenticator/email (required by NOWPayments). Status refreshes when you open this page.</p>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">No payouts yet.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((p: any) => (
            <li key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-semibold text-navy">{p.offers?.title}</span>
                <span className="tag">{p.status}</span>
              </div>
              <p className="mt-1 text-sm">{p.freelancer_profiles?.display_name} · <b>{Number(p.amount_usd).toFixed(2)} USDT</b> · {p.network ?? "no wallet"} · {formatDate(p.created_at)}</p>
              {p.address && <p className="mt-1 break-all text-xs text-muted">{p.address}</p>}
              {p.tx_hash && <p className="mt-1 break-all text-xs text-muted">TX: {p.tx_hash}</p>}
              {p.last_error && <p className="mt-1 text-xs text-red-600">{p.last_error}</p>}
              {p.status === "pending" && (
                <form action={startPayout} className="mt-3"><input type="hidden" name="id" value={p.id} /><button className="btn btn-primary">1 · Create payout</button></form>
              )}
              {p.status === "created" && (
                <form action={confirmPayout} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input className="input !w-40" name="code" inputMode="numeric" pattern="[0-9]{4,10}" placeholder="2FA code" required autoComplete="one-time-code" />
                  <button className="btn btn-navy">2 · Verify &amp; send</button>
                </form>
              )}
              {p.status === "needs_wallet" && <p className="mt-2 text-sm text-amber-700">Waiting for the freelancer to add a wallet; this unlocks automatically once they save it.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
