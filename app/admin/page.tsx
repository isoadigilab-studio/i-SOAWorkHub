import { formatIscNumeric, toUnits } from "@/lib/isc";
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
  const [freelancers, open, assigned, toReview, kyc, wd] = await Promise.all([
    n(sb, "profiles", (q) => q.eq("role", "freelancer")),
    n(sb, "offers", (q) => q.eq("status", "open")),
    n(sb, "offers", (q) => q.eq("status", "assigned")),
    n(sb, "submissions", (q) => q.eq("status", "submitted")),
    n(sb, "kyc_submissions", (q) => q.eq("status", "pending")),
    n(sb, "withdrawals", (q) => q.in("status", ["requested", "processing"])),
  ]);
  const { data: wallets } = await sb.from("wallet_accounts").select("available,held").limit(5000);
  const circulating = (wallets ?? []).reduce((a: number, w: any) => a + toUnits(w.available) + toUnits(w.held), 0);
  const { data: fin } = await sb.from("offer_finance").select("price_usd,platform_amount,fees_amount,offers!inner(status)").eq("offers.status", "paid").limit(1000);
  const sum = (k: string) => (fin ?? []).reduce((a: number, r: any) => a + Number(r[k]), 0).toFixed(2);
  const cards: [string, string | number][] = [
    ["Freelancers", freelancers], ["Open offers", open], ["In progress", assigned], ["To review", toReview],
    ["KYC pending", kyc], ["Withdrawals to handle", wd], ["ISC in circulation", formatIscNumeric(circulating / 10000)],
    ["Credited missions (USD value)", `${sum("price_usd")} USD`], ["i-SOA share 50%", `${sum("platform_amount")} USD`], ["Fees 10%", `${sum("fees_amount")} USD`],
  ];
  return (
    <div>
      <h1 className="text-2xl">Overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card !p-4"><p className="text-xl font-bold text-gold">{value}</p><p className="text-xs text-muted">{label}</p></div>
        ))}
      </div>
    </div>
  );
}
