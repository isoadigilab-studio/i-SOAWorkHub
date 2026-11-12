import Link from "next/link";
import { Icon } from "@/components/icons";
import type { T } from "@/lib/i18n";

export function BottomNav({ t, role }: { t: T; role: string }) {
  const items = [
    { href: "/", icon: "home", label: t("nav.home") },
    { href: "/opportunities", icon: "search", label: t("nav.opportunities") },
    role === "client"
      ? { href: "/dashboard/opportunities", icon: "briefcase", label: t("dash.my_opportunities") }
      : { href: "/dashboard/saved", icon: "bookmark", label: t("dash.saved") },
    { href: "/dashboard/notifications", icon: "bell", label: t("dash.notifications") },
    { href: role === "admin" ? "/admin" : "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] text-muted hover:text-accent">
          <Icon name={i.icon} className="h-5 w-5" />
          <span className="max-w-full truncate px-1">{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
