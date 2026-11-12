import Link from "next/link";
import { Icon } from "@/components/icons";
import { OpportunityCard } from "@/components/OpportunityCard";
import { createClient } from "@/lib/supabase/server";
import { catName, getT } from "@/lib/i18n";

export default async function Home() {
  const { t, locale } = await getT();
  const sb = await createClient();
  const [{ data: cats }, { data: latest }] = await Promise.all([
    sb.from("categories").select("*").eq("is_active", true).order("sort_order"),
    sb
      .from("opportunities")
      .select("id,slug,title,company_name,opportunity_type,work_mode,budget_min,budget_max,currency,is_demo,categories!inner(name,name_fr,name_mg,slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
  ]);

  const steps = [
    { icon: "user", title: t("home.step1_title"), text: t("home.step1_text") },
    { icon: "search", title: t("home.step2_title"), text: t("home.step2_text") },
    { icon: "check", title: t("home.step3_title"), text: t("home.step3_text") },
  ];
  const benefits = ["b1", "b2", "b3", "b4"];

  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h1 className="max-w-2xl text-4xl leading-tight !text-white md:text-5xl">{t("home.hero_title")}</h1>
          <p className="mt-4 max-w-xl text-slate-200">{t("home.hero_sub")}</p>
          <form action="/opportunities" className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-1.5">
            <input
              name="q"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl px-3 text-sm text-ink outline-none"
              placeholder={t("home.search_placeholder")}
              aria-label={t("home.search_placeholder")}
              maxLength={80}
            />
            <button className="btn btn-primary">
              <Icon name="search" className="h-4 w-4" />
              <span className="hidden sm:inline">{t("home.search_btn")}</span>
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">{t("home.cta_freelancer")}</Link>
            <Link href="/freelancers" className="btn border border-white/30 text-white hover:bg-white/10">{t("home.cta_hire")}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl">{t("home.categories")}</h2>
          <Link href="/opportunities" className="text-sm font-semibold text-accent">{t("common.view_all")} →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(cats ?? []).map((c: any) => (
            <Link key={c.id} href={`/opportunities?category=${c.slug}`} className="card flex min-h-[64px] items-center text-sm font-semibold text-navy hover:border-accent">
              {catName(c, locale)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl">{t("home.featured")}</h2>
          <Link href="/opportunities" className="text-sm font-semibold text-accent">{t("common.view_all")} →</Link>
        </div>
        {latest && latest.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((o: any) => (
              <OpportunityCard key={o.id} o={o} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="card text-sm text-muted">{t("opp.none")}</p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="mb-5 text-2xl">{t("home.how")}</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-accent">
                <Icon name={s.icon} />
              </span>
              <h3 className="mt-3 text-base">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="mb-5 text-2xl">{t("home.benefits")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <li key={b} className="card flex gap-3 text-sm">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span>{t(`home.${b}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="card flex flex-col gap-3 border-navy/10 bg-orange-50/60 md:flex-row md:items-center">
          <Icon name="shield" className="h-8 w-8 shrink-0 text-accent" />
          <div className="flex-1">
            <h2 className="text-xl">{t("home.trust_title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("home.trust_text")}</p>
          </div>
          <Link href="/safety" className="btn btn-ghost">{t("nav.safety")}</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-navy p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl !text-white">{t("home.final_title")}</h2>
            <p className="mt-1 text-sm text-slate-300">{t("home.final_text")}</p>
          </div>
          <Link href="/register" className="btn btn-primary">{t("nav.register")}</Link>
        </div>
      </section>
    </>
  );
}
