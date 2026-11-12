import { OpportunityCard } from "@/components/OpportunityCard";
import { Flash } from "@/components/Flash";
import { toggleBookmark } from "@/app/actions/public";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Saved" };

export default async function SavedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireUser("/dashboard/saved");
  const { t, locale } = await getT();
  const { data } = await sb
    .from("bookmarks")
    .select("created_at, opportunities(id,slug,title,company_name,opportunity_type,work_mode,budget_min,budget_max,currency,is_demo,categories(name,name_fr,name_mg))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const items = (data ?? []).filter((b: any) => b.opportunities);
  return (
    <div>
      <h1 className="text-2xl">{t("dash.saved")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {items.length === 0 ? <p className="card text-sm text-muted">{t("dash.none_saved")}</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((b: any) => (
            <div key={b.opportunities.id}>
              <OpportunityCard o={b.opportunities} t={t} locale={locale} />
              <form action={toggleBookmark} className="mt-2">
                <input type="hidden" name="opportunity_id" value={b.opportunities.id} />
                <input type="hidden" name="path" value="/dashboard/saved" />
                <button className="btn btn-ghost w-full">{t("opp.unsave")}</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
