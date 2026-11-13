import Link from "next/link";
import { claimOffer } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Invitation" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token: raw } = await params;
  const sp = await searchParams;
  const token = raw.replace(/[^a-z0-9]/gi, "").slice(0, 64);
  const { t, locale } = await getT();
  const { sb, user, profile } = await getSession();
  const { data } = await sb.rpc("offer_by_token", { p_token: token });
  const o: any = Array.isArray(data) ? data[0] : data;
  const path = `/i/${token}`;
  const next = encodeURIComponent(path);

  if (!o) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="card text-sm">{t("flash.invalid")}</p>
      </div>
    );
  }
  const unavailable = o.expired || (o.offer_status !== "open" && o.invite_status !== "accepted");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Flash sp={sp} />
      <div className="card">
        <p className="tag">{t(`cat.${o.category}`)}</p>
        <h1 className="mt-2 text-2xl leading-snug">{o.title}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">{t("invite.reward")}</dt><dd className="text-lg font-bold text-navy">{Number(o.freelancer_amount).toFixed(2)} USDT</dd></div>
          <div><dt className="text-muted">{t("invite.share")}</dt><dd className="font-semibold">{o.pct_freelancer}%</dd></div>
          {o.deadline && <div><dt className="text-muted">{t("invite.deadline")}</dt><dd className="font-semibold">{formatDate(o.deadline, locale)}</dd></div>}
        </dl>
        <h2 className="mt-5 text-base">{t("invite.description")}</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{o.description}</p>
        <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-muted">{t("invite.no_fee")}</p>

        <div className="mt-5">
          {unavailable ? (
            <p className="text-sm text-amber-700">{t(o.expired ? "flash.expired" : "flash.taken")}</p>
          ) : !user ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/register?next=${next}`} className="btn btn-primary">{t("invite.create_account")}</Link>
              <Link href={`/login?next=${next}`} className="btn btn-ghost">{t("nav.login")}</Link>
            </div>
          ) : profile?.role !== "freelancer" ? (
            <p className="text-sm text-muted">{t("flash.freelancer_only")}</p>
          ) : o.invite_status === "accepted" ? (
            <Link href="/dashboard/tasks" className="btn btn-navy">{t("dash.tasks")}</Link>
          ) : (
            <form action={claimOffer} className="flex flex-wrap gap-2">
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-primary">{t("invite.accept")}</button>
              <Link href="/dashboard/wallet" className="btn btn-ghost">{t("dash.wallet")}</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
