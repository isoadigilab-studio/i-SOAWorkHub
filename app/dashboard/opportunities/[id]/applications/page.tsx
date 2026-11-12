import { notFound } from "next/navigation";
import Link from "next/link";
import { setApplicationStatus } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function OppApplications({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireRole("client", `/dashboard/opportunities/${id}/applications`);
  const { t, locale } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: o } = await sb.from("opportunities").select("id,title").eq("id", id).eq("client_id", user.id).maybeSingle();
  if (!o) notFound();
  const { data } = await sb
    .from("applications")
    .select("*, freelancer_profiles(display_name,username,headline,skills)")
    .eq("opportunity_id", id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <Link href="/dashboard/opportunities" className="text-sm text-accent">← {t("dash.my_opportunities")}</Link>
      <h1 className="mt-2 text-2xl">{o.title}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_applications")}</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((a: any) => (
            <li key={a.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/freelancers/${a.freelancer_profiles?.username}`} className="font-semibold text-navy hover:text-accent">{a.freelancer_profiles?.display_name}</Link>
                <span className="tag">{t(`app_status.${a.status}`)}</span>
              </div>
              <p className="text-xs text-muted">{a.freelancer_profiles?.headline} · {formatDate(a.created_at, locale)}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{a.cover_note}</p>
              {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-2 inline-block text-sm text-accent underline">{t("opp.portfolio_url")}</a>}
              {a.status !== "withdrawn" && (
                <form action={setApplicationStatus} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="opportunity_id" value={id} />
                  <button name="status" value="shortlisted" className="btn btn-primary !min-h-[36px] !py-1">{t("app_status.shortlisted")}</button>
                  <button name="status" value="rejected" className="btn btn-danger !min-h-[36px] !py-1">{t("app_status.rejected")}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
