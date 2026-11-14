"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { NavItem } from "@/components/BottomNav";

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname() ?? "";
  const active = (href: string) => (href === "/dashboard" ? path === "/dashboard" : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="card space-y-1 p-3" aria-label="Dashboard">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(i.href) ? "bg-gold/15 text-gold" : "text-ink hover:bg-panel2"}`}>
          <Icon name={i.icon} className="h-4 w-4" /> {i.label}
        </Link>
      ))}
    </nav>
  );
}
