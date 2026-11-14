import { formatIscNumeric } from "@/lib/isc";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Ledger" };

export default async function AdminLedger() {
  const { sb } = await requireRole("admin", "/admin/ledger");
  const { data } = await sb.from("ledger_entries").select("id,created_at,amount,bucket,kind,description,tx_id,profiles(full_name)").order("created_at", { ascending: false }).limit(200);
  return (
    <div>
      <h1 className="text-2xl">Ledger (append-only)</h1>
      <div className="card mt-4 overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">When</th><th className="p-3">User</th><th className="p-3">Kind</th><th className="p-3">Bucket</th><th className="p-3 text-right">ISC</th></tr></thead>
          <tbody>
            {(data ?? []).map((l: any) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap p-3">{new Date(l.created_at).toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{l.profiles?.full_name ?? "—"}</td>
                <td className="p-3">{l.kind}</td>
                <td className="p-3 text-muted">{l.bucket}</td>
                <td className={`p-3 text-right font-semibold ${Number(l.amount) >= 0 ? "text-emerald-300" : ""}`}>{Number(l.amount) >= 0 ? "+" : ""}{formatIscNumeric(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
