import Link from "next/link";
import { Icon } from "@/components/icons";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const { t } = await getT();
  const { profile } = await getSession();
  const steps = [1, 2, 3, 4];
  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 py-14 md:py-20">
          <h1 className="text-4xl leading-tight !text-white md:text-5xl">{t("home.hero_title")}</h1>
          <p className="mt-4 max-w-xl text-slate-200">{t("home.hero_sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile ? (
              <Link href={profile.role === "admin" ? "/admin" : "/dashboard/tasks"} className="btn btn-primary">{t("nav.dashboard")}</Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary">{t("home.cta_join")}</Link>
                <Link href="/login" className="btn border border-white/30 text-white hover:bg-white/10">{t("nav.login")}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-12">
        <h2 className="mb-5 text-2xl">{t("home.how")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((n) => (
            <li key={n} className="card">
              <h3 className="text-base">{t(`home.step${n}_title`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`home.step${n}_text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-12">
        <div className="card border-orange-200 bg-orange-50/60">
          <h2 className="text-xl">{t("home.split_title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("home.split_text")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-6">
        <div className="card flex flex-col gap-3 md:flex-row md:items-center">
          <Icon name="shield" className="h-8 w-8 shrink-0 text-accent" />
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
