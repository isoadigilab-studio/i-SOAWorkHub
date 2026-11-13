import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
import { LOCALES, type Locale, type T } from "@/lib/i18n";
import { setLocale } from "@/app/actions/locale";

export function Header({ t, locale, profile }: { t: T; locale: Locale; profile: any | null }) {
  const nav = [
    { href: "/", label: t("nav.home") },
    { href: "/safety", label: t("nav.safety") },
  ];
  const lang = (
    <form action={setLocale} className="flex gap-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          name="lang"
          value={l}
          className={`rounded-lg px-2 py-1 text-xs font-semibold uppercase ${
            l === locale ? "bg-navy text-white" : "text-muted hover:bg-slate-100"
          }`}
          aria-label={`Language ${l}`}
        >
          {l}
        </button>
      ))}
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="i-SOA WorkHub">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink hover:text-accent">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {lang}
          {profile ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost">
                {t("nav.dashboard")}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="btn btn-navy">{t("nav.logout")}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="btn btn-primary">
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
        <details className="relative md:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-line">
            <Icon name="menu" />
            <span className="sr-only">Menu</span>
          </summary>
          <div className="absolute right-0 mt-2 w-64 space-y-1 rounded-2xl border border-line bg-white p-3 shadow-lg">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-50">
                {n.label}
              </Link>
            ))}
            <div className="px-3 py-2">{lang}</div>
            {profile ? (
              <>
                <Link href="/dashboard" className="btn btn-ghost w-full">
                  {t("nav.dashboard")}
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="btn btn-navy w-full">{t("nav.logout")}</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost w-full">
                  {t("nav.login")}
                </Link>
                <Link href="/register" className="btn btn-primary w-full">
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
