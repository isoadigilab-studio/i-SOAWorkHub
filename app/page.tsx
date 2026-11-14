import Link from "next/link";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const { t } = await getT();
  const { profile } = await getSession();
  const steps = [
    { n: 1, icon: "search" },
    { n: 2, icon: "tasks" },
    { n: 3, icon: "upload" },
    { n: 4, icon: "wallet" },
  ];
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_0%,rgba(232,189,98,0.12),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-24">
          <p className="tag mb-4 !text-gold">i-SOA DigiLab</p>
          <h1 className="max-w-2xl text-4xl leading-tight md:text-5xl">{t("home.hero_title")}</h1>
          <p className="mt-4 max-w-xl text-muted">{t("home.hero_sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile ? (
              <Link href="/dashboard" className="btn btn-primary">{t("nav.dashboard")}</Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary">{t("home.cta_join")}</Link>
                <Link href="/login" className="btn btn-ghost">{t("nav.login")}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-12">
        <h2 className="mb-5 text-2xl">{t("home.how")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="card flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><Icon name={s.icon} /></span>
              <div>
                <h3 className="text-base">{t(`home.step${s.n}_title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`home.step${s.n}_text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-6">
        <div className="gold-card">
          <h2 className="text-xl">{t("home.split_title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("home.split_text")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-6">
        <div className="card flex flex-col gap-3 md:flex-row md:items-center">
          <Icon name="shieldcheck" className="h-8 w-8 shrink-0 text-gold" />
          <div className="flex-1">
            <h2 className="text-xl">{t("home.trust_title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("home.trust_text")}</p>
          </div>
          <Link href="/safety" className="btn btn-ghost">{t("nav.safety")}</Link>
        </div>
      </section>
    </>
  );
}
