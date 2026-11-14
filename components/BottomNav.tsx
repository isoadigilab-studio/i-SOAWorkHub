"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

export type NavItem = { href: string; icon: string; label: string };

/** Exactly five destinations: Dashboard, Tâche, Recherche, History, Wallet. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname() ?? "";
  const active = (href: string) => (href === "/dashboard" ? path === "/dashboard" : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Primary">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((i) => {
          const on = active(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${on ? "text-gold" : "text-muted hover:text-ink"}`}>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${on ? "bg-gold/15" : ""}`}>
                  <Icon name={i.icon} className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate px-1">{i.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
