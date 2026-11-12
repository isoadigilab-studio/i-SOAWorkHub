import Link from "next/link";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Pagination } from "@/components/Pagination";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { catName, getT } from "@/lib/i18n";
import { cleanSearch } from "@/lib/utils";

export const metadata = { title: "Opportunities" };
const PER_PAGE = 10;
const TYPES = ["freelance", "full_time", "part_time"];
const MODES = ["remote", "on_site", "hybrid"];

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const sb = await createClient();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = cleanSearch(sp.q ?? "");
  const minBudget = Number(sp.min);

  const { data: cats } = await sb.from("categories").select("*").eq("is_active", true).order("sort_order");

  let query = sb
    .from("opportunities")
    .select(
      "id,slug,title,company_name,opportunity_type,work_mode,budget_min,budget_max,currency,is_demo,created_at,categories!inner(name,name_fr,name_mg,slug)",
      { count: "exact" },
    )
    .eq("status", "published");
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (sp.category) query = query.eq("categories.slug", sp.category);
  if (sp.type && TYPES.includes(sp.type)) query = query.eq("opportunity_type", sp.type);
  if (sp.mode && MODES.includes(sp.mode)) query = query.eq("work_mode", sp.mode);
  if (Number.isFinite(minBudget) && minBudget > 0) query = query.gte("budget_max", minBudget);
  if (sp.sort === "budget") query = query.order("budget_max", { ascending: false, nullsFirst: false });
  else if (sp.sort === "oldest") query = query.order("published_at", { ascending: true });
  else query = query.order("published_at", { ascending: false });
  const from = (page - 1) * PER_PAGE;
  const { data: items, count } = await query.range(from, from + PER_PAGE - 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">{t("nav.opportunities")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form className="card h-fit space-y-4" method="get">
          <div>
            <label className="label" htmlFor="q">{t("common.search")}</label>
            <input className="input" id="q" name="q" defaultValue={q} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="category">{t("opp.category")}</label>
            <select className="input" id="category" name="category" defaultValue={sp.category ?? ""}>
              <option value="">{t("common.all")}</option>
              {(cats ?? []).map((c: any) => <option key={c.id} value={c.slug}>{catName(c, locale)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">{t("opp.type")}</label>
            <select className="input" id="type" name="type" defaultValue={sp.type ?? ""}>
              <option value="">{t("common.all")}</option>
              {TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="mode">{t("opp.mode")}</label>
            <select className="input" id="mode" name="mode" defaultValue={sp.mode ?? ""}>
              <option value="">{t("common.all")}</option>
              {MODES.map((x) => <option key={x} value={x}>{t(`mode.${x}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="min">{t("opp.min_budget")}</label>
            <input className="input" id="min" name="min" type="number" min={0} defaultValue={sp.min ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="sort">{t("opp.sort")}</label>
            <select className="input" id="sort" name="sort" defaultValue={sp.sort ?? ""}>
              <option value="">{t("opp.sort_new")}</option>
              <option value="oldest">{t("opp.sort_old")}</option>
              <option value="budget">{t("opp.sort_budget")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1">{t("common.apply_filters")}</button>
            <Link href="/opportunities" className="btn btn-ghost">{t("common.reset")}</Link>
          </div>
        </form>

        <div>
          <p className="mb-3 text-sm text-muted">{count ?? 0} {t("opp.results")}</p>
          {items && items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((o: any) => <OpportunityCard key={o.id} o={o} t={t} locale={locale} />)}
            </div>
          ) : (
            <p className="card text-sm text-muted">{t("opp.none")}</p>
          )}
          <Pagination page={page} total={count ?? 0} perPage={PER_PAGE} basePath="/opportunities" params={sp} />
        </div>
      </div>
    </div>
  );
}
