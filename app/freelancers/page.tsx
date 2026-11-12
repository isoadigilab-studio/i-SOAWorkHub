import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { cleanSearch, formatMoney } from "@/lib/utils";

export const metadata = { title: "Freelancers" };
const PER_PAGE = 12;

export default async function FreelancersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const sb = await createClient();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = cleanSearch(sp.q ?? "");
  const skill = cleanSearch(sp.skill ?? "").toLowerCase();

  let query = sb
    .from("freelancer_profiles")
    .select("user_id,username,display_name,headline,location,hourly_rate,currency,skills,availability,experience_level", { count: "exact" })
    .eq("visibility", true)
    .neq("display_name", "");
  if (q) query = query.or(`display_name.ilike.%${q}%,headline.ilike.%${q}%`);
  if (skill) query = query.contains("skills", [skill]);
  const from = (page - 1) * PER_PAGE;
  const { data: items, count } = await query.order("created_at", { ascending: false }).range(from, from + PER_PAGE - 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">{t("nav.freelancers")}</h1>
      <form className="card mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" method="get">
        <input className="input" name="q" defaultValue={q} placeholder={t("common.search")} aria-label={t("common.search")} maxLength={80} />
        <input className="input" name="skill" defaultValue={skill} placeholder={t("free.skill")} aria-label={t("free.skill")} maxLength={40} />
        <button className="btn btn-primary">{t("common.apply_filters")}</button>
      </form>
      <p className="my-4 text-sm text-muted">{count ?? 0} {t("free.results")}</p>
      {items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((f: any) => (
            <Link key={f.user_id} href={`/freelancers/${f.username}`} className="card transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                  {f.display_name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base">{f.display_name}</h3>
                  <p className="truncate text-sm text-muted">{f.headline ?? ""}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(f.skills ?? []).slice(0, 4).map((s: string) => <span key={s} className="tag">{s}</span>)}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted">{f.location ?? ""}</span>
                <span className="font-semibold text-navy">{f.hourly_rate != null ? `${formatMoney(f.hourly_rate, null, f.currency)}${t("free.per_hour")}` : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="card text-sm text-muted">{t("free.none")}</p>
      )}
      <Pagination page={page} total={count ?? 0} perPage={PER_PAGE} basePath="/freelancers" params={sp} />
    </div>
  );
}
