import { saveWallet } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { NETWORKS } from "@/lib/validations";

export const metadata = { title: "Wallet" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireRole("freelancer", "/dashboard/wallet");
  const { t, locale } = await getT();
  const [{ data: fp }, { data: payouts }] = await Promise.all([
    sb.from("freelancer_profiles").select("wallet_address,wallet_network").eq("user_id", user.id).single(),
    sb.from("payouts").select("id,amount_usd,status,tx_hash,created_at,paid_at,offers(title)").eq("freelancer_id", user.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <h1 className="text-2xl">{t("dash.wallet")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <form action={saveWallet} className="card space-y-3">
        <p className="text-sm text-muted">{t("wallet.help")}</p>
        <div>
          <label className="label" htmlFor="wallet_network">{t("wallet.network")}</label>
          <select className="input" id="wallet_network" name="wallet_network" defaultValue={fp?.wallet_network ?? "usdttrc20"}>
            {Object.entries(NETWORKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wallet_address">{t("wallet.address")}</label>
          <input className="input" id="wallet_address" name="wallet_address" defaultValue={fp?.wallet_address ?? ""} required minLength={20} maxLength={120} autoComplete="off" spellCheck={false} />
        </div>
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{t("wallet.warning")}</p>
        <button className="btn btn-primary">{t("common.save")}</button>
      </form>

      <h2 className="mb-2 mt-6 text-lg">{t("wallet.payouts")}</h2>
      {(payouts ?? []).length === 0 ? <p className="card text-sm text-muted">{t("wallet.none")}</p> : (
        <ul className="space-y-2">
          {(payouts ?? []).map((p: any) => (
            <li key={p.id} className="card !p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-navy">{p.offers?.title}</span><span className="tag">{t(`pay_status.${p.status}`)}</span></div>
              <p className="mt-1 text-muted">{Number(p.amount_usd).toFixed(2)} USDT · {formatDate(p.paid_at ?? p.created_at, locale)}</p>
              {p.tx_hash && <p className="mt-1 break-all text-xs text-muted">TX: {p.tx_hash}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
