import Link from "next/link";
import { Flash } from "@/components/Flash";
import { Isc, rewardIsc } from "@/components/Money";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireUser("/dashboard/tasks");
  const { t, locale } = await getT();
  const tab = sp.tab === "open" ? "open" : "mine";
  const cols = "id,title,category,status,deadline,freelancer_amount";
  const { data } =
    tab === "mine"
      ? await sb.from("offers").select(cols).eq("assigned_to", user.id).order("assigned_at", { ascending: false })
      : await sb.from("offers").select(cols).eq("status", "open").eq("visibility", "open").is("assigned_to", null).order("created_at", { ascending: false }).limit(50);
  const tabCls = (on: boolean) => `rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-gold text-bg" : "bg-panel2 text-muted ring-1 ring-line hover:text-ink"}`;
  return (
    <div>
      <h1 className="text-2xl">{t("nav.tasks", "Tasks")}</h1>
      <div className="mt-4 flex gap-2">
        <Link href="/dashboard/tasks" className={tabCls(tab === "mine")}>{t("task.mine", "My missions")}</Link>
        <Link href="/dashboard/tasks?tab=open" className={tabCls(tab === "open")}>{t("task.open", "Open missions")}</Link>
      </div>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? (
        <p className="card text-sm text-muted">{tab === "mine" ? t("dash.none_tasks") : t("dash.no_open", "No open missions right now. Check your email for invitations.")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((o: any) => (
            <li key={o.id}>
              <Link href={`/dashboard/tasks/${o.id}`} className="card block h-full transition hover:border-gold/50">
                <div className="flex items-start justify-between gap-2">
                  <span className="tag">{t(`cat.${o.category}`)}</span>
                  <span className="tag !text-gold">{t(`task_status.${o.status}`)}</span>
                </div>
                <h3 className="mt-3 text-base leading-snug">{o.title}</h3>
                <p className="mt-3 text-lg font-bold text-gold"><Isc value={rewardIsc(o.freelancer_amount)} /></p>
                {o.deadline && <p className="mt-1 text-xs text-muted">{t("invite.deadline")}: {formatDate(o.deadline, locale)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
