import { SideNav } from "@/components/SideNav";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const { t } = await getT();
  const items = [
    { href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    { href: "/dashboard/tasks", icon: "tasks", label: t("nav.tasks", "Tasks") },
    { href: "/dashboard/search", icon: "search", label: t("nav.search", "Search") },
    { href: "/dashboard/history", icon: "history", label: t("nav.history", "History") },
    { href: "/dashboard/wallet", icon: "wallet", label: t("nav.wallet", "Wallet") },
    { href: "/dashboard/kyc", icon: "shieldcheck", label: "KYC" },
  ];
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[230px_1fr]">
      <aside className="hidden md:block"><SideNav items={items} /></aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
