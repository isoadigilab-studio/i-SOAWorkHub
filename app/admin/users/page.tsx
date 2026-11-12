import Link from "next/link";
import { adminSetUser } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { cleanSearch, formatDate } from "@/lib/utils";

export const metadata = { title: "Users" };
const ROLES = ["freelancer", "client", "admin"];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user } = await requireRole("admin", "/admin/users");
  const q = cleanSearch(sp.q ?? "");
  let query = sb.from("profiles").select("id,full_name,role,status,created_at").order("created_at", { ascending: false }).limit(100);
  if (sp.role && ROLES.includes(sp.role)) query = query.eq("role", sp.role);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  return (
    <div>
      <h1 className="text-2xl">User management</h1>
      <form className="mt-3 flex flex-wrap gap-2" method="get">
        <input className="input !w-auto flex-1" name="q" defaultValue={q} placeholder="Search name" aria-label="Search name" />
        <select className="input !w-auto" name="role" defaultValue={sp.role ?? ""} aria-label="Role">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn btn-primary">Filter</button>
        <Link href="/admin/users" className="btn btn-ghost">Reset</Link>
      </form>
      <div className="mt-4"><Flash sp={sp} /></div>
      <ul className="space-y-3">
        {(data ?? []).map((u: any) => (
          <li key={u.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-navy">{u.full_name || "(no name)"}</span>
              <span className="flex gap-1.5"><span className="tag">{u.role}</span><span className={`tag ${u.status === "suspended" ? "!bg-red-100 !text-red-700" : ""}`}>{u.status}</span></span>
            </div>
            <p className="text-xs text-muted">{formatDate(u.created_at)} · {u.id}</p>
            {u.id !== user.id && (
              <form action={adminSetUser} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={u.id} />
                {u.status === "active"
                  ? <button name="action" value="suspend" className="btn btn-danger !min-h-[36px] !py-1">Suspend</button>
                  : <button name="action" value="activate" className="btn btn-primary !min-h-[36px] !py-1">Reactivate</button>}
                {u.role !== "admin" && <button name="action" value="make_admin" className="btn btn-ghost !min-h-[36px] !py-1">Make admin</button>}
                {u.role === "admin" && <button name="action" value="make_freelancer" className="btn btn-ghost !min-h-[36px] !py-1">Set freelancer</button>}
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
