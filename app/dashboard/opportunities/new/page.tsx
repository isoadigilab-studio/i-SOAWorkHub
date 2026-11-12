import { createOpportunity } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { catName, getT } from "@/lib/i18n";

export const metadata = { title: "New opportunity" };

export default async function NewOpportunity({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("client", "/dashboard/opportunities/new");
  const { t, locale } = await getT();
  const { data: cats } = await sb.from("categories").select("*").eq("is_active", true).order("sort_order");
  return (
    <div>
      <h1 className="text-2xl">{t("dash.new_opportunity")}</h1>
      <p className="mt-1 text-sm text-muted">{t("dash.moderation_note")}</p>
      <div className="mt-4"><Flash sp={sp} /></div>
      <form action={createOpportunity} className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="title">{t("opp.title")}</label><input className="input" id="title" name="title" required minLength={5} maxLength={140} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">{t("opp.description")}</label><textarea className="input" id="description" name="description" rows={7} required minLength={30} maxLength={5000} /></div>
        <div><label className="label" htmlFor="category_id">{t("opp.category")}</label><select className="input" id="category_id" name="category_id" required>{(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{catName(c, locale)}</option>)}</select></div>
        <div><label className="label" htmlFor="opportunity_type">{t("opp.type")}</label><select className="input" id="opportunity_type" name="opportunity_type">{["freelance", "full_time", "part_time"].map((x) => <option key={x} value={x}>{t(`type.${x}`)}</option>)}</select></div>
        <div><label className="label" htmlFor="work_mode">{t("opp.mode")}</label><select className="input" id="work_mode" name="work_mode">{["remote", "on_site", "hybrid"].map((x) => <option key={x} value={x}>{t(`mode.${x}`)}</option>)}</select></div>
        <div><label className="label" htmlFor="location_text">{t("free.location")}</label><input className="input" id="location_text" name="location_text" maxLength={120} /></div>
        <div><label className="label" htmlFor="budget_min">{t("opp.budget_min")}</label><input className="input" id="budget_min" name="budget_min" type="number" min={0} /></div>
        <div><label className="label" htmlFor="budget_max">{t("opp.budget_max")}</label><input className="input" id="budget_max" name="budget_max" type="number" min={0} /></div>
        <div><label className="label" htmlFor="currency">{t("opp.currency")}</label><select className="input" id="currency" name="currency"><option>USD</option><option>EUR</option><option>MGA</option></select></div>
        <div><label className="label" htmlFor="deadline">{t("opp.deadline")}</label><input className="input" id="deadline" name="deadline" type="date" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="skills">{t("free.skills")} <span className="text-muted">({t("common.comma_separated")})</span></label><input className="input" id="skills" name="skills" /></div>
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">{t("dash.no_fees_note")}</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button name="intent" value="submit" className="btn btn-primary">{t("dash.submit_review")}</button>
          <button name="intent" value="draft" className="btn btn-ghost">{t("dash.save_draft")}</button>
        </div>
      </form>
    </div>
  );
}
