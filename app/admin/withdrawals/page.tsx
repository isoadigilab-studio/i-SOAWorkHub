import { confirmWithdrawalPayout, failWithdrawal, startWithdrawalPayout, syncWithdrawals } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { formatIscNumeric } from "@/lib/isc";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Withdrawals" };

export default async function AdminWithdrawals({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/withdrawals");
  await syncWithdrawals(sb);
  const { data } = await sb
    .from("withdrawals")
    .select("id,amount_isc,usd_value,network,address,status,np_batch_id,tx_hash,last_error,created_at,profiles(full_name,kyc_status)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Withdrawals (NOWPayments)</h1>
      <p className="mt-1 text-sm text-muted">The user&apos;s ISC is already held. 1 · Create payout (sends USD value in USDT). 2 · Enter the 2FA code. Status syncs from NOWPayments when you open this page. If it fails, the ISC is returned to the user.</p>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">No withdrawals.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((w: any) => (
            <li key={w.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-semibold">{w.profiles?.full_name} · {formatIscNumeric(w.amount_isc)} ISC <span className="text-muted">(${Number(w.usd_value).toFixed(2)})</span></span>
                <span className="tag">{w.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{w.network} · {formatDate(w.created_at)} · KYC {w.profiles?.kyc_status}</p>
              <p className="mt-1 break-all font-mono text-xs">{w.address}</p>
              {w.tx_hash && <p className="mt-1 break-all text-xs text-muted">TX: {w.tx_hash}</p>}
              {w.last_error && <p className="mt-1 text-xs text-red-300">{w.last_error}</p>}
              {w.status === "requested" && !w.np_batch_id && (
                <form action={startWithdrawalPayout} className="mt-3"><input type="hidden" name="id" value={w.id} /><button className="btn btn-primary">1 · Create payout</button></form>
              )}
              {w.status === "processing" && (
                <form action={confirmWithdrawalPayout} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input className="input !w-40" name="code" inputMode="numeric" pattern="[0-9]{4,10}" placeholder="2FA code" required autoComplete="one-time-code" />
                  <button className="btn btn-navy">2 · Verify &amp; send</button>
                </form>
              )}
              {["requested", "processing"].includes(w.status) && (
                <form action={failWithdrawal} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input className="input !w-56" name="reason" placeholder="Reason (returns ISC to user)" maxLength={300} />
                  <button className="btn btn-danger">Reject &amp; refund ISC</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
