import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "i-SOA WorkHub — Connect. Work. Grow.", template: "%s · i-SOA WorkHub" },
  description: "Find missions, deliver work and get paid in ISC across the i-SOA network.",
};
export const viewport: Viewport = { themeColor: "#0b0e14", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const { sb, user, profile } = await getSession();
  let unread = 0;
  if (user) {
    const { count } = await sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
    unread = count ?? 0;
  }
  const items = [
    { href: "/dashboard", icon: "dashboard", label: t("nav.dashboard") },
    { href: "/dashboard/tasks", icon: "tasks", label: t("nav.tasks", "Tasks") },
    { href: "/dashboard/search", icon: "search", label: t("nav.search", "Search") },
    { href: "/dashboard/history", icon: "history", label: t("nav.history", "History") },
    { href: "/dashboard/wallet", icon: "wallet", label: t("nav.wallet", "Wallet") },
  ];
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Header t={t} locale={locale} profile={profile} unread={unread} />
        <main className="min-h-[70vh] pb-24 md:pb-0">{children}</main>
        <Footer t={t} />
        {profile && <BottomNav items={items} />}
      </body>
    </html>
  );
}
