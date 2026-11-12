import Link from "next/link";
import { updateOwnOpportunity } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "My opportunities" };

export default async function MyOpportunities({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireRole("client", "/dashboard/opportunities");
  const { t } = await getT();
  const { data } = await sb
    .from("opportunities")
    .select("id,slug,title,status,created_at,applications(count)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t("dash.my_opportunities")}</h1>
        <Link href="/dashboard/opportunities/new" className="btn btn-primary">{t("dash.new_opportunity")}</Link>
      </div>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_opportunities")}</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((o: any) => (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/opportunities/${o.slug}`} className="font-semibold text-navy hover:text-accent">{o.title}</Link>
                <span className="tag">{t(`status.${o.status}`)}</span>
              </div>
              <form action={updateOwnOpportunity} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                <Link href={`/dashboard/opportunities/${o.id}/applications`} className="btn btn-ghost !min-h-[36px] !py-1">
                  {t("dash.applications")} ({o.applications?.[0]?.count ?? 0})
                </Link>
                {o.status === "draft" && <button name="action" value="submit" className="btn btn-primary !min-h-[36px] !py-1">{t("dash.submit_review")}</button>}
                {(o.status === "published" || o.status === "pending") && <button name="action" value="close" className="btn btn-ghost !min-h-[36px] !py-1">{t("dash.close")}</button>}
                <button name="action" value="delete" className="btn btn-danger !min-h-[36px] !py-1">{t("common.delete")}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
