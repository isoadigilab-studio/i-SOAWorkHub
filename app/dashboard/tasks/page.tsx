import Link from "next/link";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireUser("/dashboard/tasks");
  const { t, locale } = await getT();
  const { data } = await sb
    .from("offers")
    .select("id,title,category,status,deadline,freelancer_amount,assigned_at")
    .eq("assigned_to", user.id)
    .order("assigned_at", { ascending: false });
  return (
    <div>
      <h1 className="text-2xl">{t("dash.tasks")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_tasks")}</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((o: any) => (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/dashboard/tasks/${o.id}`} className="font-semibold text-navy hover:text-accent">{o.title}</Link>
                <span className="tag">{t(`task_status.${o.status}`)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {Number(o.freelancer_amount).toFixed(2)} USDT{o.deadline ? ` · ${t("invite.deadline")}: ${formatDate(o.deadline, locale)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
