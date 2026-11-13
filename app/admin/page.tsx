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
  const [freelancers, open, assigned, submitted, pendingPayouts] = await Promise.all([
    n(sb, "profiles", (q) => q.eq("role", "freelancer")),
    n(sb, "offers", (q) => q.eq("status", "open")),
    n(sb, "offers", (q) => q.eq("status", "assigned")),
    n(sb, "submissions", (q) => q.eq("status", "submitted")),
    n(sb, "payouts", (q) => q.in("status", ["pending", "created", "processing"])),
  ]);
  const { data: fin } = await sb
    .from("offer_finance")
    .select("price_usd,platform_amount,fees_amount,freelancer_amount,offers!inner(status)")
    .in("offers.status", ["approved", "paid"])
    .limit(1000);
  const sum = (k: string) => (fin ?? []).reduce((a: number, r: any) => a + Number(r[k]), 0).toFixed(2);
  const cards: [string, string | number][] = [
    ["Freelancers", freelancers],
    ["Open offers", open],
    ["In progress", assigned],
    ["To review", submitted],
    ["Payouts to handle", pendingPayouts],
    ["Total value (approved)", `${sum("price_usd")} USD`],
    ["i-SOA share (50%)", `${sum("platform_amount")} USD`],
    ["Fees (10%)", `${sum("fees_amount")} USD`],
  ];
  return (
    <div>
      <h1 className="text-2xl">Overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-xl font-bold text-navy">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
