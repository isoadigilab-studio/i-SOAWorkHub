import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "/admin");
  const links = [
    ["/admin", "Overview"], ["/admin/offers", "Offers"], ["/admin/submissions", "Review"], ["/admin/withdrawals", "Withdrawals"],
    ["/admin/kyc", "KYC"], ["/admin/catalog", "Catalog"], ["/admin/ledger", "Ledger"], ["/admin/users", "Users"], ["/admin/audit", "Audit"],
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4" aria-label="Admin">
        {links.map(([href, label]) => <Link key={href} href={href} className="btn btn-ghost !min-h-[40px] whitespace-nowrap">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
