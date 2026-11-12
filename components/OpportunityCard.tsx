import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { catName, type Locale, type T } from "@/lib/i18n";

export function OpportunityCard({ o, t, locale }: { o: any; t: T; locale: Locale }) {
  const money = formatMoney(o.budget_min, o.budget_max, o.currency);
  return (
    <article className="card flex flex-col justify-between transition hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base leading-snug">
            <Link href={`/opportunities/${o.slug}`} className="hover:text-accent">
              {o.title}
            </Link>
          </h3>
          {o.is_demo && <span className="badge-demo">DEMO</span>}
        </div>
        <p className="mt-1 text-sm text-muted">{o.company_name}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {o.categories && <span className="tag">{catName(o.categories, locale)}</span>}
          <span className="tag">{t(`type.${o.opportunity_type}`)}</span>
          <span className="tag">{t(`mode.${o.work_mode}`)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm font-semibold text-navy">{money ?? t("opp.budget_unspecified")}</span>
        <Link href={`/opportunities/${o.slug}`} className="text-sm font-semibold text-accent hover:underline">
          {t("common.view")} →
        </Link>
      </div>
    </article>
  );
}
