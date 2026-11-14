import { notFound } from "next/navigation";
import Link from "next/link";
import { claimOpenOffer, submitWork } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { Isc, rewardIsc } from "@/components/Money";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser(`/dashboard/tasks/${id}`);
  const { t, locale } = await getT();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // RLS decides visibility: assigned to me, or open to everyone.
  const { data: o } = await sb.from("offers").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();
  const mineTask = o.assigned_to === user.id;
  const claimable = !mineTask && o.status === "open" && o.visibility === "open" && !o.assigned_to;
  const [{ data: priv }, { data: subs }] = mineTask
    ? await Promise.all([
        sb.from("offer_private").select("instructions").eq("offer_id", id).maybeSingle(),
        sb.from("submissions").select("*").eq("offer_id", id).order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: [] }];
  return (
    <div className="space-y-4">
      <Link href="/dashboard/tasks" className="text-sm text-gold">← {t("nav.tasks", "Tasks")}</Link>
      <Flash sp={sp} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{t(`cat.${o.category}`)}</span>
          <span className="tag !text-gold">{t(`task_status.${o.status}`)}</span>
        </div>
        <h1 className="mt-3 text-2xl leading-snug">{o.title}</h1>
        <div className="gold-card mt-4 !p-5">
          <p className="text-xs uppercase tracking-wider text-muted">{t("invite.reward")}</p>
          <p className="mt-1 text-3xl font-extrabold text-gold"><Isc value={rewardIsc(o.freelancer_amount)} /></p>
          {o.deadline && <p className="mt-1 text-xs text-muted">{t("invite.deadline")}: {formatDate(o.deadline, locale)}</p>}
        </div>
        <h2 className="mt-5 text-base">{t("invite.description")}</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{o.description}</p>
        {priv?.instructions && (<><h2 className="mt-4 text-base">{t("task.instructions")}</h2><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{priv.instructions}</p></>)}
        {claimable && profile.role === "freelancer" && (
          <form action={claimOpenOffer} className="mt-5">
            <input type="hidden" name="offer_id" value={o.id} />
            <button className="btn btn-primary">{t("invite.accept")}</button>
          </form>
        )}
      </div>

      {mineTask && o.status === "assigned" && (
        <form action={submitWork} className="card space-y-3">
          <h2 className="text-lg">{t("task.submit_title")}</h2>
          <input type="hidden" name="offer_id" value={o.id} />
          <div><label className="label" htmlFor="url">{t("task.url")}</label><input className="input" id="url" name="url" type="url" placeholder="https://" required maxLength={500} /></div>
          <div><label className="label" htmlFor="note">{t("task.note")}</label><textarea className="input" id="note" name="note" rows={3} maxLength={2000} /></div>
          <button className="btn btn-primary">{t("task.submit")}</button>
        </form>
      )}
      {mineTask && o.status === "submitted" && <p className="card text-sm text-muted">{t("task.waiting_review")}</p>}
      {mineTask && o.status === "paid" && <p className="card text-sm text-emerald-300">{t("task.paid", "Approved. Your reward was credited to your ISC wallet.")}</p>}

      {(subs ?? []).length > 0 && (
        <div className="card">
          <h2 className="text-lg">{t("task.history")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(subs ?? []).map((s: any) => (
              <li key={s.id} className="rounded-xl border border-line p-3">
                <div className="flex justify-between gap-2"><a href={s.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="min-w-0 truncate font-semibold text-gold">{s.url}</a><span className="tag">{t(`sub_status.${s.status}`)}</span></div>
                {s.review_note && <p className="mt-1 text-muted">{s.review_note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
