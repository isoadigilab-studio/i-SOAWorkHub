import { requireRole } from "@/lib/auth";

export const metadata = { title: "Admin" };

async function n(sb: any, table: string, build?: (q: any) => any) {
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminHome() {
  const { sb } = await requireRole("admin", "/admin");
  const [users, freelancers, clients, published, pending, openReports, apps, inquiries] = await Promise.all([
    n(sb, "profiles"),
    n(sb, "profiles", (q) => q.eq("role", "freelancer")),
    n(sb, "profiles", (q) => q.eq("role", "client")),
    n(sb, "opportunities", (q) => q.eq("status", "published")),
    n(sb, "opportunities", (q) => q.eq("status", "pending")),
    n(sb, "reports", (q) => q.eq("status", "open")),
    n(sb, "applications"),
    n(sb, "project_inquiries"),
  ]);
  const cards = [
    ["Users", users], ["Freelancers", freelancers], ["Clients", clients], ["Published opportunities", published],
    ["Awaiting moderation", pending], ["Open reports", openReports], ["Applications", apps], ["Inquiries", inquiries],
  ];
  return (
    <div>
      <h1 className="text-2xl">Platform statistics</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label as string} className="card">
            <p className="text-2xl font-bold text-navy">{value as number}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
