import { requireRole } from "@/lib/auth";

export const metadata = { title: "Audit log" };

export default async function AdminAudit() {
  const { sb } = await requireRole("admin", "/admin/audit");
  const { data } = await sb
    .from("admin_audit_logs")
    .select("id,action,entity_type,entity_id,metadata,created_at,profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <div>
      <h1 className="text-2xl">Admin audit log</h1>
      <div className="card mt-4 overflow-x-auto !p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Entity</th></tr></thead>
          <tbody>
            {(data ?? []).map((l: any) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{l.profiles?.full_name ?? "—"}</td>
                <td className="p-3 font-medium">{l.action}</td>
                <td className="p-3 text-muted">{l.entity_type} {l.entity_id ? String(l.entity_id).slice(0, 8) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
