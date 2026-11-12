import Link from "next/link";
import { markNotificationsRead } from "@/app/actions/dashboard";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireUser("/dashboard/notifications");
  const { t, locale } = await getT();
  const { data } = await sb.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t("dash.notifications")}</h1>
        <form action={markNotificationsRead}><button className="btn btn-ghost">{t("dash.mark_read")}</button></form>
      </div>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">{t("dash.none_notifications")}</p> : (
        <ul className="space-y-2">
          {(data ?? []).map((n: any) => (
            <li key={n.id} className={`card !p-4 ${n.read_at ? "" : "border-accent/40 bg-orange-50/40"}`}>
              <p className="text-sm font-semibold text-navy">{t(`notif.${n.type}`, n.type)}</p>
              <p className="text-sm text-muted">{n.body}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>{formatDate(n.created_at, locale)}</span>
                {n.link && <Link href={n.link} className="font-semibold text-accent">{t("common.view")} →</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
