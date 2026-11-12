import { respondInquiry } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Inquiries" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser("/dashboard/inquiries");
  const { t, locale } = await getT();
  const { data } = await sb
    .from("project_inquiries")
    .select("*, freelancer_profiles(display_name,username), client_profiles(company_name)")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  const isFreelancer = profile.role === "freelancer";
  return (
    <div>
      <h1 className="text-2xl">{t("dash.inquiries")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_inquiries")}</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((i: any) => (
            <li key={i.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base">{i.subject}</h3>
                <span className="tag">{t(`inq_status.${i.status}`)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {isFreelancer ? i.client_profiles?.company_name : i.freelancer_profiles?.display_name} · {formatDate(i.created_at, locale)}
                {i.budget ? ` · ${i.budget}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm">{i.message}</p>
              <form action={respondInquiry} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={i.id} />
                {isFreelancer && i.status === "new" && (
                  <>
                    <button name="status" value="accepted" className="btn btn-primary !min-h-[36px] !py-1">{t("dash.accept")}</button>
                    <button name="status" value="declined" className="btn btn-danger !min-h-[36px] !py-1">{t("dash.decline")}</button>
                  </>
                )}
                {i.status !== "closed" && <button name="status" value="closed" className="btn btn-ghost !min-h-[36px] !py-1">{t("dash.close")}</button>}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
