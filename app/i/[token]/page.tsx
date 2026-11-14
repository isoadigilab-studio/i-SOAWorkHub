import Link from "next/link";
import { claimOffer } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { Isc, rewardIsc } from "@/components/Money";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token: raw } = await params;
  const sp = await searchParams;
  const token = raw.replace(/[^a-z0-9]/gi, "").slice(0, 64);
  const { t, locale } = await getT();
  const { sb, user, profile } = await getSession();
  const { data } = await sb.rpc("offer_by_token", { p_token: token });
  const o: any = Array.isArray(data) ? data[0] : data;
  const next = encodeURIComponent(`/i/${token}`);

  if (!o) return <div className="mx-auto max-w-lg px-4 py-10"><p className="card text-sm">{t("flash.invalid")}</p></div>;
  const unavailable = o.expired || (o.offer_status !== "open" && o.invite_status !== "accepted");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Flash sp={sp} />
      <div className="card">
        <p className="tag">{t(`cat.${o.category}`)}</p>
        <h1 className="mt-3 text-2xl leading-snug">{o.title}</h1>
        <div className="gold-card mt-4 !p-5">
          <p className="text-xs uppercase tracking-wider text-muted">{t("invite.reward")}</p>
          <p className="mt-1 text-3xl font-extrabold text-gold"><Isc value={rewardIsc(o.freelancer_amount)} /></p>
          <p className="mt-1 text-xs text-muted">{t("invite.share")}: {o.pct_freelancer}%{o.deadline ? ` · ${t("invite.deadline")}: ${formatDate(o.deadline, locale)}` : ""}</p>
        </div>
        <h2 className="mt-5 text-base">{t("invite.description")}</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{o.description}</p>
        <p className="mt-4 rounded-xl bg-panel2 p-3 text-xs text-muted">{t("invite.no_fee")}</p>
        <div className="mt-5">
          {unavailable ? (
            <p className="text-sm text-gold2">{t(o.expired ? "flash.expired" : "flash.taken")}</p>
          ) : !user ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/register?next=${next}`} className="btn btn-primary">{t("invite.create_account")}</Link>
              <Link href={`/login?next=${next}`} className="btn btn-ghost">{t("nav.login")}</Link>
            </div>
          ) : profile?.role !== "freelancer" ? (
            <p className="text-sm text-muted">{t("flash.freelancer_only")}</p>
          ) : o.invite_status === "accepted" ? (
            <Link href="/dashboard/tasks" className="btn btn-navy">{t("nav.tasks", "Tasks")}</Link>
          ) : (
            <form action={claimOffer}><input type="hidden" name="token" value={token} /><button className="btn btn-primary">{t("invite.accept")}</button></form>
          )}
        </div>
      </div>
    </div>
  );
}
