import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "/admin");
  const links = [
    ["/admin", "Overview"],
    ["/admin/opportunities", "Opportunities"],
    ["/admin/users", "Users"],
    ["/admin/categories", "Categories"],
    ["/admin/reports", "Reports"],
    ["/admin/audit", "Audit log"],
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Admin">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="btn btn-ghost whitespace-nowrap">{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
