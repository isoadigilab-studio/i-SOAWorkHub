import Link from "next/link";
import { adminSetOpportunity } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Moderate opportunities" };
const STATUSES = ["pending", "published", "rejected", "closed", "draft"];

export default async function AdminOpportunities({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/opportunities");
  const status = STATUSES.includes(sp.status ?? "") ? (sp.status as string) : "pending";
  const { data } = await sb
    .from("opportunities")
    .select("id,slug,title,company_name,status,is_demo,created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Opportunity moderation</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/opportunities?status=${s}`} className={`tag !px-3 !py-2 text-sm ${s === status ? "!bg-navy !text-white" : ""}`}>{s}</Link>
        ))}
      </div>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">Nothing here.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((o: any) => (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/opportunities/${o.slug}`} className="font-semibold text-navy hover:text-accent">{o.title}</Link>
                {o.is_demo && <span className="badge-demo">DEMO</span>}
              </div>
              <p className="text-xs text-muted">{o.company_name}</p>
              <form action={adminSetOpportunity} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                {o.status !== "published" && <button name="action" value="published" className="btn btn-primary !min-h-[36px] !py-1">Approve</button>}
                {o.status !== "rejected" && <button name="action" value="rejected" className="btn btn-ghost !min-h-[36px] !py-1">Reject</button>}
                {o.status === "published" && <button name="action" value="closed" className="btn btn-ghost !min-h-[36px] !py-1">Close</button>}
                <button name="action" value="delete" className="btn btn-danger !min-h-[36px] !py-1">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
