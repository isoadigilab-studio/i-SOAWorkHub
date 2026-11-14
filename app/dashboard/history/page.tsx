import { Icon } from "@/components/icons";
import { formatIscNumeric, toUnits } from "@/lib/isc";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "History" };

type Item = { id: string; at: string; title: string; sub: string; amount?: number; status?: string; icon: string };

export default async function HistoryPage() {
  const { sb, user } = await requireUser("/dashboard/history");
  const { t, locale } = await getT();
  const [{ data: ledger }, { data: subs }, { data: legacy }] = await Promise.all([
    sb.from("ledger_entries").select("id,created_at,amount,kind,description,bucket").eq("user_id", user.id).eq("bucket", "available").order("created_at", { ascending: false }).limit(60),
    sb.from("submissions").select("id,created_at,status,offers(title)").eq("freelancer_id", user.id).order("created_at", { ascending: false }).limit(30),
    sb.from("payouts").select("id,created_at,amount_usd,status,offers(title)").eq("freelancer_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const items: Item[] = [
    ...(ledger ?? []).map((l: any) => ({ id: `l${l.id}`, at: l.created_at, title: t(`ledger.${l.kind}`, l.kind), sub: l.description ?? "", amount: toUnits(l.amount), icon: Number(l.amount) >= 0 ? "arrowdown" : "arrowup" })),
    ...(subs ?? []).map((s: any) => ({ id: `s${s.id}`, at: s.created_at, title: t("history.submission", "Work submitted"), sub: s.offers?.title ?? "", status: t(`sub_status.${s.status}`), icon: "upload" })),
    ...(legacy ?? []).map((p: any) => ({ id: `p${p.id}`, at: p.created_at, title: t("history.legacy", "Legacy USDT payout"), sub: `${p.offers?.title ?? ""} · ${Number(p.amount_usd).toFixed(2)} USDT`, status: t(`pay_status.${p.status}`), icon: "clock" })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <div>
      <h1 className="text-2xl">{t("nav.history", "History")}</h1>
      {items.length === 0 ? <p className="card mt-4 text-sm text-muted">{t("history.none", "No activity yet.")}</p> : (
        <ul className="card mt-4 divide-y divide-line !p-0">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-gold"><Icon name={i.icon} className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.title}</p>
                <p className="truncate text-xs text-muted">{i.sub}{i.sub ? " · " : ""}{formatDate(i.at, locale)}</p>
              </div>
              {i.amount != null ? (
                <span className={`shrink-0 text-sm font-bold ${i.amount >= 0 ? "text-emerald-300" : "text-ink"}`}>{i.amount >= 0 ? "+" : ""}{formatIscNumeric(i.amount / 10000)} ISC</span>
              ) : (
                <span className="tag shrink-0">{i.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
