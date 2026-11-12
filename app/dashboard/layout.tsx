import Link from "next/link";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const { t } = await getT();
  const common = [
    { href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    { href: "/dashboard/profile", icon: "user", label: t("dash.profile") },
  ];
  const byRole: Record<string, { href: string; icon: string; label: string }[]> = {
    freelancer: [
      { href: "/dashboard/saved", icon: "bookmark", label: t("dash.saved") },
      { href: "/dashboard/applications", icon: "briefcase", label: t("dash.applications") },
      { href: "/dashboard/inquiries", icon: "mail", label: t("dash.inquiries") },
    ],
    client: [
      { href: "/dashboard/opportunities", icon: "briefcase", label: t("dash.my_opportunities") },
      { href: "/dashboard/inquiries", icon: "mail", label: t("dash.inquiries") },
      { href: "/dashboard/saved", icon: "bookmark", label: t("dash.saved") },
    ],
    admin: [{ href: "/admin", icon: "shield", label: "Admin" }],
  };
  const links = [...common, ...(byRole[profile.role] ?? []), { href: "/dashboard/notifications", icon: "bell", label: t("dash.notifications") }];
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <aside className="hidden md:block">
        <nav className="card space-y-1 p-3" aria-label="Dashboard">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-50 hover:text-accent">
              <Icon name={l.icon} className="h-4 w-4" /> {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden" aria-label="Dashboard sections">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="tag whitespace-nowrap !px-3 !py-2 text-sm">{l.label}</Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
