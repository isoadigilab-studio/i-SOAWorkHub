import Link from "next/link";
import { Icon } from "@/components/icons";
import { Isc, rewardIsc } from "@/components/Money";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { cleanSearch } from "@/lib/utils";
import { CATEGORIES } from "@/lib/validations";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser("/dashboard/search");
  const { t } = await getT();
  const q = cleanSearch(sp.q ?? "");
  const cat = (CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category : "";
  let results: any[] = [];
  if (q || cat) {
    let query = sb.from("offers").select("id,title,category,status,freelancer_amount,deadline").in("status", ["open", "assigned", "submitted", "paid"]).limit(30);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (cat) query = query.eq("category", cat);
    const { data } = await query.order("created_at", { ascending: false });
    results = data ?? [];
  }
  return (
    <div>
      <h1 className="text-2xl">{t("nav.search", "Search")}</h1>
      <form method="get" className="card mt-4 space-y-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" name="q" defaultValue={q} maxLength={80} placeholder={t("search.placeholder", "Search missions, skills…")} aria-label={t("nav.search", "Search")} />
        </div>
        <div className="flex gap-2">
          <select className="input" name="category" defaultValue={cat} aria-label={t("opp.category", "Category")}>
            <option value="">{t("common.all", "All")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
          </select>
          <button className="btn btn-primary">{t("nav.search", "Search")}</button>
        </div>
      </form>
      <div className="mt-4">
        {!q && !cat ? (
          <p className="text-sm text-muted">{t("search.hint", "Type a keyword or pick a category. Only missions you are allowed to see are searched.")}</p>
        ) : results.length === 0 ? (
          <p className="card text-sm text-muted">{t("search.none", "No results.")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {results.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/tasks/${o.id}`} className="card block transition hover:border-gold/50">
                  <div className="flex justify-between gap-2"><span className="tag">{t(`cat.${o.category}`)}</span><span className="tag !text-gold">{t(`task_status.${o.status}`)}</span></div>
                  <h3 className="mt-3 text-base leading-snug">{o.title}</h3>
                  <p className="mt-2 text-lg font-bold text-gold"><Isc value={rewardIsc(o.freelancer_amount)} /></p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
