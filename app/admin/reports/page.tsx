import Link from "next/link";
import { adminSetReport } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/reports");
  const { data } = await sb
    .from("reports")
    .select("id,reason,details,status,created_at,opportunities(slug,title)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Reports & complaints</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">No reports.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((r: any) => (
            <li key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/opportunities/${r.opportunities?.slug}`} className="font-semibold text-navy hover:text-accent">{r.opportunities?.title}</Link>
                <span className="flex gap-1.5"><span className="tag">{r.reason}</span><span className="tag">{r.status}</span></span>
              </div>
              <p className="text-xs text-muted">{formatDate(r.created_at)}</p>
              {r.details && <p className="mt-2 whitespace-pre-line text-sm">{r.details}</p>}
              <form action={adminSetReport} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="reviewing" className="btn btn-ghost !min-h-[36px] !py-1">Reviewing</button>
                <button name="status" value="resolved" className="btn btn-primary !min-h-[36px] !py-1">Resolved</button>
                <button name="status" value="dismissed" className="btn btn-ghost !min-h-[36px] !py-1">Dismiss</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
