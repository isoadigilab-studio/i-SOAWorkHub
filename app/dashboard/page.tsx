import Link from "next/link";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/icons";
import { Isc, rewardIsc, usdHint } from "@/components/Money";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function DashboardHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser();
  const { t } = await getT();
  const [{ data: mine }, { data: open }, { data: wallet }] = await Promise.all([
    sb.from("offers").select("id,status").eq("assigned_to", user.id),
    sb.from("offers").select("id,title,category,freelancer_amount,deadline").eq("status", "open").eq("visibility", "open").is("assigned_to", null).order("created_at", { ascending: false }).limit(4),
    sb.from("wallet_accounts").select("available,held").eq("user_id", user.id).maybeSingle(),
  ]);
  const count = (st: string[]) => (mine ?? []).filter((o: any) => st.includes(o.status)).length;
  const stats = [
    { label: t("dash.active_tasks"), value: count(["assigned"]), icon: "tasks" },
    { label: t("dash.in_review", "Under review"), value: count(["submitted"]), icon: "clock" },
    { label: t("dash.completed", "Completed"), value: count(["paid"]), icon: "check" },
  ];
  const first = (profile.full_name || "").split(" ")[0];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{t("dash.welcome")}</p>
        <h1 className="text-2xl">{first || "—"}</h1>
      </div>
      <Flash sp={sp} />

      <section className="gold-card">
        <h2 className="max-w-md text-xl leading-snug">{t("dash.hero_title", "Find missions. Deliver. Earn ISC.")}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{t("dash.hero_text", "Browse open missions, accept the ones that fit your skills, deliver your work and get paid in ISC.")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/tasks?tab=open" className="btn btn-primary">{t("dash.browse", "Browse missions")}</Link>
          <Link href="/dashboard/search" className="btn btn-ghost"><Icon name="search" className="h-4 w-4" />{t("nav.search", "Search")}</Link>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href="/dashboard/tasks" className="card !p-4 transition hover:border-gold/50">
            <Icon name={s.icon} className="h-5 w-5 text-gold" />
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">{t("dash.recommended", "Recommended missions")}</h2>
          <Link href="/dashboard/tasks?tab=open" className="text-sm font-semibold text-gold">{t("common.view_all", "View all")}</Link>
        </div>
        {(open ?? []).length === 0 ? (
          <p className="card text-sm text-muted">{t("dash.no_open", "No open missions right now. Check your email for invitations.")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(open ?? []).map((o: any) => (
              <Link key={o.id} href={`/dashboard/tasks/${o.id}`} className="card transition hover:border-gold/50">
                <p className="tag">{t(`cat.${o.category}`)}</p>
                <h3 className="mt-2 text-base leading-snug">{o.title}</h3>
                <p className="mt-3 text-lg font-bold text-gold"><Isc value={rewardIsc(o.freelancer_amount)} /></p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link href="/dashboard/wallet" className="gold-card block transition hover:border-gold/60">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">{t("w.balance", "Available balance")}</p>
          <Icon name="wallet" className="h-5 w-5 text-gold" />
        </div>
        <p className="mt-1 text-3xl font-extrabold text-gold"><Isc value={wallet?.available ?? 0} /></p>
        <p className="mt-1 text-xs text-muted">{usdHint(wallet?.available ?? 0)} · {t("w.indicative", "indicative value")}</p>
      </Link>

      {profile.kyc_status !== "approved" && (
        <Link href="/dashboard/kyc" className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold2">
          <Icon name="shieldcheck" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{t("dash.kyc_banner", "Verify your identity (KYC) to be able to withdraw your ISC.")}</span>
        </Link>
      )}
    </div>
  );
}
