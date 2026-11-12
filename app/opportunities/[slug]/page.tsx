import { notFound } from "next/navigation";
import Link from "next/link";
import { applyToOpportunity, reportOpportunity, toggleBookmark } from "@/app/actions/public";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { catName, getT } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const { sb, user, profile } = await getSession();
  const { data: o } = await sb
    .from("opportunities")
    .select("*, categories(name,name_fr,name_mg,slug)")
    .eq("slug", slug)
    .maybeSingle();
  if (!o) notFound();

  let saved = false;
  let applied = false;
  if (user) {
    const [{ data: b }, { data: a }] = await Promise.all([
      sb.from("bookmarks").select("opportunity_id").eq("user_id", user.id).eq("opportunity_id", o.id).maybeSingle(),
      sb.from("applications").select("id").eq("freelancer_id", user.id).eq("opportunity_id", o.id).maybeSingle(),
    ]);
    saved = Boolean(b);
    applied = Boolean(a);
  }
  const money = formatMoney(o.budget_min, o.budget_max, o.currency);
  const path = `/opportunities/${o.slug}`;
  const canApply = o.status === "published" && !o.is_demo;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/opportunities" className="text-sm text-accent">← {t("nav.opportunities")}</Link>
      <div className="mt-3"><Flash sp={sp} /></div>
      {o.status !== "published" && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t(`status.${o.status}`)}</p>
      )}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl leading-snug">{o.title}</h1>
            <p className="mt-1 text-sm text-muted">{o.company_name}</p>
          </div>
          {o.is_demo && <span className="badge-demo">DEMO</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {o.categories && <span className="tag">{catName(o.categories, locale)}</span>}
          <span className="tag">{t(`type.${o.opportunity_type}`)}</span>
          <span className="tag">{t(`mode.${o.work_mode}`)}</span>
          {o.location_text && <span className="tag">{o.location_text}</span>}
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">{t("opp.budget")}</dt><dd className="font-semibold text-navy">{money ?? t("opp.budget_unspecified")}</dd></div>
          {o.deadline && <div><dt className="text-muted">{t("opp.deadline")}</dt><dd className="font-semibold text-navy">{formatDate(o.deadline, locale)}</dd></div>}
          {o.published_at && <div><dt className="text-muted">{t("opp.posted")}</dt><dd className="font-semibold text-navy">{formatDate(o.published_at, locale)}</dd></div>}
        </dl>
        <h2 className="mt-6 text-lg">{t("opp.description")}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{o.description}</p>
        {o.skills?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">{o.skills.map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {user ? (
            <form action={toggleBookmark}>
              <input type="hidden" name="opportunity_id" value={o.id} />
              <input type="hidden" name="path" value={path} />
              <button className="btn btn-ghost"><Icon name="bookmark" className="h-4 w-4" />{saved ? t("opp.unsave") : t("opp.save")}</button>
            </form>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-ghost">{t("opp.login_to_save")}</Link>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg">{t("opp.apply")}</h2>
        {o.is_demo ? (
          <p className="mt-2 text-sm text-muted">{t("opp.demo_notice")}</p>
        ) : !user ? (
          <p className="mt-2 text-sm"><Link className="text-accent underline" href={`/login?next=${encodeURIComponent(path)}`}>{t("nav.login")}</Link> {t("opp.login_to_apply")}</p>
        ) : applied ? (
          <p className="mt-2 text-sm text-green-700">{t("flash.already_applied")}</p>
        ) : profile.role !== "freelancer" ? (
          <p className="mt-2 text-sm text-muted">{t("flash.freelancer_only")}</p>
        ) : canApply ? (
          <form action={applyToOpportunity} className="mt-3 space-y-3">
            <input type="hidden" name="opportunity_id" value={o.id} />
            <input type="hidden" name="slug" value={o.slug} />
            <div>
              <label className="label" htmlFor="cover_note">{t("opp.cover_note")}</label>
              <textarea className="input" id="cover_note" name="cover_note" rows={5} required minLength={20} maxLength={3000} />
            </div>
            <div>
              <label className="label" htmlFor="portfolio_url">{t("opp.portfolio_url")}</label>
              <input className="input" id="portfolio_url" name="portfolio_url" type="url" placeholder="https://" />
            </div>
            <button className="btn btn-primary">{t("opp.send_application")}</button>
          </form>
        ) : null}
      </div>

      {user && (
        <details className="card mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-navy">
            <Icon name="flag" className="h-4 w-4" /> {t("opp.report")}
          </summary>
          <form action={reportOpportunity} className="mt-3 space-y-3">
            <input type="hidden" name="opportunity_id" value={o.id} />
            <input type="hidden" name="slug" value={o.slug} />
            <select className="input" name="reason" required aria-label={t("opp.report_reason")}>
              {["scam", "fee_required", "misleading", "inappropriate", "other"].map((r) => (
                <option key={r} value={r}>{t(`report.${r}`)}</option>
              ))}
            </select>
            <textarea className="input" name="details" rows={3} maxLength={2000} placeholder={t("opp.report_details")} />
            <button className="btn btn-danger">{t("opp.report_send")}</button>
          </form>
        </details>
      )}
    </div>
  );
}
