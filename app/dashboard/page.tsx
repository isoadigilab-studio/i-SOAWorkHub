import Link from "next/link";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

async function count(sb: any, table: string, build: (q: any) => any) {
  const { count } = await build(sb.from(table).select("*", { count: "exact", head: true }));
  return count ?? 0;
}

export default async function DashboardHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser();
  const { t } = await getT();
  const unread = await count(sb, "notifications", (q) => q.eq("user_id", user.id).is("read_at", null));
  let cards: { label: string; value: number | string; href: string }[] = [];
  let extra: React.ReactNode = null;

  if (profile.role === "freelancer") {
    const [{ data: fp }, { count: pf }] = await Promise.all([
      sb.from("freelancer_profiles").select("*").eq("user_id", user.id).single(),
      sb.from("portfolios").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const checks = [fp?.display_name, fp?.headline, fp?.bio, fp?.location, fp?.skills?.length, fp?.hourly_rate != null, fp?.languages?.length, (pf ?? 0) > 0];
    const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const [saved, apps] = await Promise.all([
      count(sb, "bookmarks", (q) => q.eq("user_id", user.id)),
      count(sb, "applications", (q) => q.eq("freelancer_id", user.id)),
    ]);
    cards = [
      { label: t("dash.saved"), value: saved, href: "/dashboard/saved" },
      { label: t("dash.applications"), value: apps, href: "/dashboard/applications" },
      { label: t("dash.notifications"), value: unread, href: "/dashboard/notifications" },
    ];
    extra = (
      <div className="card mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-navy">{t("dash.completion")}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {pct < 100 && <Link href="/dashboard/profile" className="mt-3 inline-block text-sm font-semibold text-accent">{t("dash.complete_profile")} →</Link>}
      </div>
    );
  } else if (profile.role === "client") {
    const [mine, pending, inq] = await Promise.all([
      count(sb, "opportunities", (q) => q.eq("client_id", user.id)),
      count(sb, "opportunities", (q) => q.eq("client_id", user.id).eq("status", "pending")),
      count(sb, "project_inquiries", (q) => q.eq("client_id", user.id)),
    ]);
    cards = [
      { label: t("dash.my_opportunities"), value: mine, href: "/dashboard/opportunities" },
      { label: t("status.pending"), value: pending, href: "/dashboard/opportunities" },
      { label: t("dash.inquiries"), value: inq, href: "/dashboard/inquiries" },
      { label: t("dash.notifications"), value: unread, href: "/dashboard/notifications" },
    ];
    extra = <Link href="/dashboard/opportunities/new" className="btn btn-primary mt-4">{t("dash.new_opportunity")}</Link>;
  } else {
    extra = <Link href="/admin" className="btn btn-navy mt-4">Admin →</Link>;
  }

  return (
    <div>
      <h1 className="text-2xl">{t("dash.welcome")}, {profile.full_name || ""}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card hover:border-accent">
            <p className="text-2xl font-bold text-navy">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
      {extra}
    </div>
  );
}
