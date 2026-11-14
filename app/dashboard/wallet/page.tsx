import Link from "next/link";
import { cookies } from "next/headers";
import { cancelTicket, cancelWithdrawal, createTicket, payProduct, requestWithdrawal, transferIsc } from "@/app/actions/wallet";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/icons";
import { usdHint } from "@/components/Money";
import { formatIscNumeric, toUnits } from "@/lib/isc";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { NETWORKS } from "@/lib/validations";

export const metadata = { title: "Wallet" };

const TABS = [
  { id: "overview", icon: "home", fr: "Accueil" },
  { id: "transfer", icon: "send", fr: "Transfert" },
  { id: "payment", icon: "card", fr: "Paiement" },
  { id: "ticket", icon: "ticket", fr: "Ticket" },
  { id: "withdraw", icon: "download", fr: "Retrait" },
  { id: "history", icon: "history", fr: "Historique" },
] as const;

function TxList({ rows, t, locale }: { rows: any[]; t: any; locale: any }) {
  if (rows.length === 0) return <p className="card text-sm text-muted">{t("history.none", "No activity yet.")}</p>;
  return (
    <ul className="card divide-y divide-line !p-0">
      {rows.map((l) => {
        const pos = Number(l.amount) >= 0;
        return (
          <li key={l.id} className="flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 ${pos ? "text-emerald-300" : "text-gold"}`}><Icon name={pos ? "arrowdown" : "arrowup"} className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t(`ledger.${l.kind}`, l.kind)}</p>
              <p className="truncate text-xs text-muted">{l.description ? `${l.description} · ` : ""}{formatDate(l.created_at, locale)}</p>
            </div>
            <span className={`shrink-0 text-sm font-bold ${pos ? "text-emerald-300" : "text-ink"}`}>{pos ? "+" : ""}{formatIscNumeric(l.amount)} ISC</span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser("/dashboard/wallet");
  const { t, locale } = await getT();
  const tab = TABS.some((x) => x.id === sp.tab) ? (sp.tab as string) : "overview";

  await sb.rpc("ticket_release_expired");
  const [{ data: wallet }, { data: ledger }, { data: earned }, { data: products }, { data: services }, { data: tickets }, { data: withdrawals }] = await Promise.all([
    sb.from("wallet_accounts").select("code,available,held").eq("user_id", user.id).maybeSingle(),
    sb.from("ledger_entries").select("id,created_at,amount,kind,description").eq("user_id", user.id).eq("bucket", "available").order("created_at", { ascending: false }).limit(tab === "history" ? 100 : 6),
    sb.from("ledger_entries").select("amount").eq("user_id", user.id).eq("kind", "earning").limit(1000),
    sb.from("service_products").select("id,name,price_isc,service_code,services(name)").eq("active", true).order("service_code"),
    sb.from("services").select("code,name,description").eq("active", true).order("name"),
    sb.from("payment_tickets").select("id,service_code,purpose,amount_isc,status,expires_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    sb.from("withdrawals").select("id,amount_isc,usd_value,network,status,tx_hash,created_at,last_error").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const earnedUnits = (earned ?? []).reduce((a: number, r: any) => a + toUnits(r.amount), 0);
  const key = () => crypto.randomUUID();
  const ticketToken = tab === "ticket" ? (await cookies()).get("tk_once")?.value : undefined;
  const pendingWd = (withdrawals ?? []).filter((w: any) => ["requested", "processing"].includes(w.status)).length;
  const tabCls = (on: boolean) => `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-gold text-bg" : "bg-panel2 text-muted ring-1 ring-line hover:text-ink"}`;
  const label = (x: (typeof TABS)[number]) => t(`w.tab_${x.id}`, x.fr);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl">{t("nav.wallet", "Wallet")}</h1>

      <section className="gold-card">
        <p className="text-xs uppercase tracking-wider text-muted">{t("w.balance", "Available balance")}</p>
        <p className="mt-1 text-4xl font-extrabold text-gold">{formatIscNumeric(wallet?.available ?? 0)} <span className="text-lg">ISC</span></p>
        <p className="mt-1 text-sm text-muted">{usdHint(wallet?.available ?? 0)} · {t("w.indicative", "indicative value, not a promise of market value")}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div><p className="text-xs text-muted">{t("w.earned", "Earned")}</p><p className="font-bold text-emerald-300">+{formatIscNumeric(earnedUnits / 10000)}</p></div>
          <div><p className="text-xs text-muted">{t("w.held", "On hold")}</p><p className="font-bold">{formatIscNumeric(wallet?.held ?? 0)}</p></div>
          <div><p className="text-xs text-muted">{t("w.min_withdraw", "Min. withdrawal")}</p><p className="font-bold">0.02 ISC</p></div>
        </div>
        <p className="mt-4 text-xs text-muted">{t("w.my_id", "My wallet ID")}: <span className="select-all font-mono text-ink">{wallet?.code}</span></p>
      </section>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Wallet">
        {TABS.map((x) => (
          <Link key={x.id} href={`/dashboard/wallet?tab=${x.id}`} className={tabCls(tab === x.id)}><Icon name={x.icon} className="h-4 w-4" />{label(x)}</Link>
        ))}
      </nav>

      <Flash sp={sp} />

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[{ id: "transfer", icon: "send" }, { id: "payment", icon: "card" }, { id: "withdraw", icon: "download" }, { id: "history", icon: "history" }].map((a) => (
              <Link key={a.id} href={`/dashboard/wallet?tab=${a.id}`} className="card flex items-center gap-3 !p-4 transition hover:border-gold/50"><Icon name={a.icon} className="h-5 w-5 text-gold" /><span className="text-sm font-semibold">{t(`w.tab_${a.id}`, a.id)}</span></Link>
            ))}
          </div>
          <h2 className="text-lg">{t("w.recent", "Recent transactions")}</h2>
          <TxList rows={ledger ?? []} t={t} locale={locale} />
          <h2 className="text-lg">{t("w.network", "i-SOA payment network")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(services ?? []).map((s: any) => (
              <li key={s.code} className="card !p-4"><p className="font-semibold">{s.name}</p><p className="text-xs text-muted">{s.description}</p></li>
            ))}
          </ul>
          {pendingWd > 0 && <p className="text-sm text-gold2">{pendingWd} {t("w.pending_wd", "withdrawal(s) in progress")}</p>}
        </>
      )}

      {tab === "transfer" && (
        <form action={transferIsc} className="card space-y-3">
          <p className="text-sm text-muted">{t("w.transfer_help", "Send ISC to another WorkHub account. No crypto or blockchain involved.")}</p>
          <input type="hidden" name="key" value={key()} />
          <div><label className="label" htmlFor="to_code">{t("w.recipient", "Recipient wallet ID")}</label><input className="input font-mono uppercase" id="to_code" name="to_code" placeholder="ISC-XXXXXXXXXX" required maxLength={14} autoComplete="off" /></div>
          <div><label className="label" htmlFor="amount">{t("w.amount", "Amount (ISC)")}</label><input className="input" id="amount" name="amount" inputMode="decimal" placeholder="0.0100" required autoComplete="off" /></div>
          <div><label className="label" htmlFor="note">{t("w.note", "Note (optional)")}</label><input className="input" id="note" name="note" maxLength={100} /></div>
          <p className="text-xs text-muted">{t("w.available", "Available")}: {formatIscNumeric(wallet?.available ?? 0)} ISC</p>
          <button className="btn btn-primary w-full">{t("w.confirm_transfer", "Confirm transfer")}</button>
        </form>
      )}

      {tab === "payment" && (
        <form action={payProduct} className="card space-y-3">
          <p className="text-sm text-muted">{t("w.pay_help", "Pay a subscription or product from your ISC balance.")}</p>
          <input type="hidden" name="key" value={key()} />
          {(products ?? []).length === 0 ? <p className="text-sm text-muted">{t("w.no_products", "No products available yet.")}</p> : (
            <>
              <div>
                <label className="label" htmlFor="product_id">{t("w.product", "Service / Product")}</label>
                <select className="input" id="product_id" name="product_id" required>
                  {(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.services?.name} — {p.name} · {formatIscNumeric(p.price_isc)} ISC</option>)}
                </select>
              </div>
              <p className="text-xs text-muted">{t("w.available", "Available")}: {formatIscNumeric(wallet?.available ?? 0)} ISC</p>
              <button className="btn btn-primary w-full">{t("w.pay_now", "Pay with ISC")}</button>
            </>
          )}
        </form>
      )}

      {tab === "ticket" && (
        <>
          {ticketToken && (
            <div className="gold-card">
              <p className="text-sm font-semibold">{t("w.ticket_once", "Your ticket (shown once — copy it now)")}</p>
              <p className="mt-2 break-all rounded-xl bg-bg p-3 font-mono text-xs text-gold select-all">{ticketToken}</p>
              <p className="mt-2 text-xs text-muted">{t("w.ticket_help2", "Give this code to the i-SOA service at checkout. The service redeems it server-to-server; it cannot be used twice.")}</p>
            </div>
          )}
          <form action={createTicket} className="card space-y-3">
            <p className="text-sm text-muted">{t("w.ticket_help", "Reserve ISC in a one-time ticket bound to a service, a purpose and an expiry. Unused tickets return the ISC to your balance.")}</p>
            <input type="hidden" name="key" value={key()} />
            <div><label className="label" htmlFor="service_code">{t("w.service", "Service")}</label><select className="input" id="service_code" name="service_code">{(services ?? []).map((s: any) => <option key={s.code} value={s.code}>{s.name}</option>)}</select></div>
            <div><label className="label" htmlFor="purpose">{t("w.purpose", "Purpose / order")}</label><input className="input" id="purpose" name="purpose" required minLength={3} maxLength={80} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="t_amount">{t("w.amount", "Amount (ISC)")}</label><input className="input" id="t_amount" name="amount" inputMode="decimal" placeholder="0.0100" required /></div>
              <div><label className="label" htmlFor="minutes">{t("w.expires", "Expires in")}</label><select className="input" id="minutes" name="minutes"><option value="15">15 min</option><option value="60">1 h</option><option value="1440">24 h</option><option value="4320">3 d</option></select></div>
            </div>
            <button className="btn btn-primary w-full">{t("w.gen_ticket", "Generate ticket")}</button>
          </form>
          <h2 className="text-lg">{t("w.my_tickets", "My tickets")}</h2>
          {(tickets ?? []).length === 0 ? <p className="card text-sm text-muted">{t("history.none", "No activity yet.")}</p> : (
            <ul className="space-y-2">
              {(tickets ?? []).map((k: any) => (
                <li key={k.id} className="card !p-4 text-sm">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold">{k.service_code} — {k.purpose}</span><span className="tag">{t(`ticket_status.${k.status}`, k.status)}</span></div>
                  <p className="mt-1 text-muted">{formatIscNumeric(k.amount_isc)} ISC · {t("w.expires", "Expires in")} {formatDate(k.expires_at, locale)}</p>
                  {k.status === "open" && <form action={cancelTicket} className="mt-2"><input type="hidden" name="id" value={k.id} /><button className="btn btn-danger !min-h-[36px] !py-1">{t("common.cancel", "Cancel")}</button></form>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "withdraw" && (
        <>
          {profile.kyc_status !== "approved" ? (
            <div className="card space-y-3">
              <Icon name="shieldcheck" className="h-8 w-8 text-gold" />
              <p className="text-sm">{t("w.kyc_needed", "Identity verification (KYC) is required before your first withdrawal.")}</p>
              <p className="text-xs text-muted">{t("w.kyc_status", "Status")}: {t(`kyc_status.${profile.kyc_status}`, profile.kyc_status)}</p>
              <Link href="/dashboard/kyc" className="btn btn-primary">{t("w.kyc_go", "Verify my identity")}</Link>
            </div>
          ) : (
            <form action={requestWithdrawal} className="card space-y-3">
              <p className="text-sm text-muted">{t("w.wd_help", "ISC is removed from your wallet and paid in USDT through NOWPayments after admin confirmation. Minimum 0.02 ISC ($2).")}</p>
              <input type="hidden" name="key" value={key()} />
              <div><label className="label" htmlFor="w_amount">{t("w.wd_amount", "Amount to withdraw (ISC)")}</label><input className="input" id="w_amount" name="amount" inputMode="decimal" placeholder="0.0200" required /></div>
              <div><label className="label" htmlFor="network">{t("w.network_label", "Network")}</label><select className="input" id="network" name="network">{Object.entries(NETWORKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label" htmlFor="address">{t("w.address", "Receiving wallet address")}</label><input className="input font-mono" id="address" name="address" required minLength={20} maxLength={120} autoComplete="off" spellCheck={false} /></div>
              <p className="rounded-xl bg-gold/10 p-3 text-xs text-gold2">{t("w.wd_warning", "Check the address and network carefully. Crypto payments cannot be reversed.")}</p>
              <button className="btn btn-primary w-full">{t("w.request_wd", "Request withdrawal")}</button>
            </form>
          )}
          <h2 className="text-lg">{t("w.my_wd", "My withdrawals")}</h2>
          {(withdrawals ?? []).length === 0 ? <p className="card text-sm text-muted">{t("history.none", "No activity yet.")}</p> : (
            <ul className="space-y-2">
              {(withdrawals ?? []).map((w: any) => (
                <li key={w.id} className="card !p-4 text-sm">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold">{formatIscNumeric(w.amount_isc)} ISC <span className="text-muted">(${Number(w.usd_value).toFixed(2)})</span></span><span className="tag">{t(`wd_status.${w.status}`, w.status)}</span></div>
                  <p className="text-xs text-muted">{NETWORKS[w.network as keyof typeof NETWORKS]} · {formatDate(w.created_at, locale)}</p>
                  {w.tx_hash && <p className="mt-1 break-all text-xs text-muted">TX: {w.tx_hash}</p>}
                  {w.status === "requested" && <form action={cancelWithdrawal} className="mt-2"><input type="hidden" name="id" value={w.id} /><button className="btn btn-danger !min-h-[36px] !py-1">{t("common.cancel", "Cancel")}</button></form>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "history" && <TxList rows={ledger ?? []} t={t} locale={locale} />}
    </div>
  );
}
