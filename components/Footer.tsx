import Link from "next/link";
import { Logo } from "@/components/icons";
import type { T } from "@/lib/i18n";

export function Footer({ t }: { t: T }) {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">{t("footer.about")}</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-navy">{t("footer.platform")}</p>
          <ul className="space-y-1.5 text-muted">
            <li><Link href="/" className="hover:text-accent">{t("nav.home")}</Link></li>
            <li><Link href="/register" className="hover:text-accent">{t("nav.register")}</Link></li>
            <li><Link href="/safety" className="hover:text-accent">{t("nav.safety")}</Link></li>
          </ul>
        </div>
        <div className="text-sm text-muted">
          <p className="mb-2 font-semibold text-navy">{t("footer.notice_title")}</p>
          <p>{t("footer.notice")}</p>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} i-SOA WorkHub · i-SOA
      </div>
    </footer>
  );
}
