import Link from "next/link";
import { withdrawApplication } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My applications" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireRole("freelancer", "/dashboard/applications");
  const { t, locale } = await getT();
  const { data } = await sb
    .from("applications")
    .select("id,status,created_at,opportunities(slug,title,company_name)")
    .eq("freelancer_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <h1 className="text-2xl">{t("dash.applications")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_applications")}</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((a: any) => (
            <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/opportunities/${a.opportunities?.slug}`} className="font-semibold text-navy hover:text-accent">{a.opportunities?.title}</Link>
                <p className="text-xs text-muted">{a.opportunities?.company_name} · {formatDate(a.created_at, locale)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tag">{t(`app_status.${a.status}`)}</span>
                {a.status !== "withdrawn" && a.status !== "rejected" && (
                  <form action={withdrawApplication}><input type="hidden" name="id" value={a.id} /><button className="btn btn-danger !min-h-[36px] !py-1">{t("dash.withdraw")}</button></form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
