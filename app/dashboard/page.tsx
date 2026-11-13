import Link from "next/link";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function DashboardHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser();
  const { t } = await getT();
  const [{ data: fp }, { data: offers }, { data: payouts }, { count: unread }] = await Promise.all([
    sb.from("freelancer_profiles").select("wallet_address").eq("user_id", user.id).maybeSingle(),
    sb.from("offers").select("id,status").eq("assigned_to", user.id),
    sb.from("payouts").select("amount_usd,status").eq("freelancer_id", user.id),
    sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  const active = (offers ?? []).filter((o: any) => ["assigned", "submitted", "approved"].includes(o.status)).length;
  const sum = (st: string[]) => (payouts ?? []).filter((p: any) => st.includes(p.status)).reduce((a: number, p: any) => a + Number(p.amount_usd), 0);
  const cards = [
    { label: t("dash.active_tasks"), value: String(active), href: "/dashboard/tasks" },
    { label: t("dash.pending_pay"), value: `${sum(["pending", "created", "processing", "needs_wallet"]).toFixed(2)} USDT`, href: "/dashboard/wallet" },
    { label: t("dash.paid_total"), value: `${sum(["finished"]).toFixed(2)} USDT`, href: "/dashboard/wallet" },
    { label: t("dash.notifications"), value: String(unread ?? 0), href: "/dashboard/notifications" },
  ];
  return (
    <div>
      <h1 className="text-2xl">{t("dash.welcome")}, {profile.full_name || ""}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {profile.role === "freelancer" && !fp?.wallet_address && (
        <Link href="/dashboard/wallet" className="mb-4 block rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t("dash.wallet_missing")} →</Link>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card hover:border-accent">
            <p className="text-xl font-bold text-navy">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
      {profile.role === "admin" && <Link href="/admin" className="btn btn-navy mt-4">Admin →</Link>}
    </div>
  );
}
