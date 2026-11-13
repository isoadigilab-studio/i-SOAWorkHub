import { notFound } from "next/navigation";
import Link from "next/link";
import { submitWork } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireUser(`/dashboard/tasks/${id}`);
  const { t, locale } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: o } = await sb.from("offers").select("*").eq("id", id).eq("assigned_to", user.id).maybeSingle();
  if (!o) notFound();
  const { data: subs } = await sb.from("submissions").select("*").eq("offer_id", id).order("created_at", { ascending: false });
  return (
    <div>
      <Link href="/dashboard/tasks" className="text-sm text-accent">← {t("dash.tasks")}</Link>
      <div className="mt-2"><Flash sp={sp} /></div>
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl leading-snug">{o.title}</h1>
          <span className="tag">{t(`task_status.${o.status}`)}</span>
        </div>
        <p className="mt-2 text-lg font-bold text-navy">{Number(o.freelancer_amount).toFixed(2)} USDT</p>
        {o.deadline && <p className="text-sm text-muted">{t("invite.deadline")}: {formatDate(o.deadline, locale)}</p>}
        <h2 className="mt-4 text-base">{t("invite.description")}</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{o.description}</p>
        {o.instructions && (<><h2 className="mt-4 text-base">{t("task.instructions")}</h2><p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{o.instructions}</p></>)}
      </div>

      {o.status === "assigned" && (
        <form action={submitWork} className="card mt-4 space-y-3">
          <h2 className="text-lg">{t("task.submit_title")}</h2>
          <input type="hidden" name="offer_id" value={o.id} />
          <div><label className="label" htmlFor="url">{t("task.url")}</label><input className="input" id="url" name="url" type="url" placeholder="https://" required maxLength={500} /></div>
          <div><label className="label" htmlFor="note">{t("task.note")}</label><textarea className="input" id="note" name="note" rows={3} maxLength={2000} /></div>
          <button className="btn btn-primary">{t("task.submit")}</button>
        </form>
      )}
      {o.status === "submitted" && <p className="card mt-4 text-sm text-muted">{t("task.waiting_review")}</p>}

      {(subs ?? []).length > 0 && (
        <div className="card mt-4">
          <h2 className="text-lg">{t("task.history")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(subs ?? []).map((s: any) => (
              <li key={s.id} className="rounded-xl border border-line p-3">
                <div className="flex justify-between gap-2"><a href={s.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="min-w-0 truncate font-semibold text-accent">{s.url}</a><span className="tag">{t(`sub_status.${s.status}`)}</span></div>
                {s.review_note && <p className="mt-1 text-muted">{s.review_note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
