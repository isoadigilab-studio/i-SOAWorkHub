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
  description:
    "Discover freelance projects, remote jobs and digital opportunities. Connect with clients and grow your career.",
};
export const viewport: Viewport = { themeColor: "#14243B", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const { profile } = await getSession();
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Header t={t} locale={locale} profile={profile} />
        <main className="min-h-[70vh] pb-20 md:pb-0">{children}</main>
        <Footer t={t} />
        {profile && <BottomNav t={t} role={profile.role} />}
      </body>
    </html>
  );
}
