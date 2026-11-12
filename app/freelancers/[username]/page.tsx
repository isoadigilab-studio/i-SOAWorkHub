import { notFound } from "next/navigation";
import Link from "next/link";
import { sendInquiry } from "@/app/actions/public";
import { Flash } from "@/components/Flash";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

export default async function FreelancerPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const { t } = await getT();
  const { sb, user, profile } = await getSession();
  const { data: f } = await sb.from("freelancer_profiles").select("*").eq("username", username).maybeSingle();
  if (!f) notFound();
  const { data: portfolio } = await sb.from("portfolios").select("*").eq("user_id", f.user_id).order("created_at", { ascending: false });
  const rate = f.hourly_rate != null ? formatMoney(f.hourly_rate, null, f.currency) : null;
  const path = `/freelancers/${f.username}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/freelancers" className="text-sm text-accent">← {t("nav.freelancers")}</Link>
      <div className="mt-3"><Flash sp={sp} /></div>
      <div className="card">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white">
            {(f.display_name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl">{f.display_name}</h1>
            <p className="text-sm text-muted">{f.headline}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          {f.location && <div><dt className="text-muted">{t("free.location")}</dt><dd className="font-semibold">{f.location}</dd></div>}
          {rate && <div><dt className="text-muted">{t("free.rate")}</dt><dd className="font-semibold">{rate}{t("free.per_hour")}</dd></div>}
          <div><dt className="text-muted">{t("free.experience")}</dt><dd className="font-semibold">{t(`exp.${f.experience_level}`)}</dd></div>
          <div><dt className="text-muted">{t("free.availability")}</dt><dd className="font-semibold">{t(`avail.${f.availability}`)}</dd></div>
        </dl>
        {f.bio && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{f.bio}</p>}
        {f.skills?.length > 0 && (
          <div className="mt-4"><h2 className="mb-2 text-base">{t("free.skills")}</h2><div className="flex flex-wrap gap-1.5">{f.skills.map((s: string) => <span key={s} className="tag">{s}</span>)}</div></div>
        )}
        {f.languages?.length > 0 && (
          <div className="mt-4"><h2 className="mb-2 text-base">{t("free.languages")}</h2><div className="flex flex-wrap gap-1.5">{f.languages.map((s: string) => <span key={s} className="tag">{s}</span>)}</div></div>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg">{t("free.portfolio")}</h2>
        {portfolio && portfolio.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {portfolio.map((p: any) => (
              <li key={p.id} className="rounded-xl border border-line p-3 text-sm">
                <a href={p.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-semibold text-accent hover:underline">{p.title}</a>
                {p.description && <p className="mt-1 text-muted">{p.description}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">{t("free.no_portfolio")}</p>}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg">{t("free.contact")}</h2>
        {!user ? (
          <p className="mt-2 text-sm"><Link className="text-accent underline" href={`/login?next=${encodeURIComponent(path)}`}>{t("nav.login")}</Link> {t("free.login_to_contact")}</p>
        ) : profile.role !== "client" ? (
          <p className="mt-2 text-sm text-muted">{t("flash.client_only")}</p>
        ) : (
          <form action={sendInquiry} className="mt-3 space-y-3">
            <input type="hidden" name="freelancer_id" value={f.user_id} />
            <input type="hidden" name="username" value={f.username} />
            <div><label className="label" htmlFor="subject">{t("free.subject")}</label><input className="input" id="subject" name="subject" required minLength={3} maxLength={140} /></div>
            <div><label className="label" htmlFor="message">{t("free.message")}</label><textarea className="input" id="message" name="message" rows={5} required minLength={10} maxLength={3000} /></div>
            <div><label className="label" htmlFor="budget">{t("free.budget")}</label><input className="input" id="budget" name="budget" maxLength={80} /></div>
            <button className="btn btn-primary">{t("free.send")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
