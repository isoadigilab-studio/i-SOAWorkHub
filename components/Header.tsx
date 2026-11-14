import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
import { LOCALES, type Locale, type T } from "@/lib/i18n";
import { setLocale } from "@/app/actions/locale";

export function Header({ t, locale, profile, unread }: { t: T; locale: Locale; profile: any | null; unread: number }) {
  const lang = (
    <form action={setLocale} className="flex gap-0.5 rounded-full bg-panel2 p-0.5 ring-1 ring-line">
      {LOCALES.map((l) => (
        <button key={l} name="lang" value={l} aria-label={`Language ${l}`} className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase transition ${l === locale ? "bg-gold text-bg" : "text-muted hover:text-ink"}`}>
          {l}
        </button>
      ))}
    </form>
  );
  const iconBtn = "relative flex h-10 w-10 items-center justify-center rounded-full bg-panel2 text-ink ring-1 ring-line transition hover:text-gold hover:ring-gold/50";
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={profile ? "/dashboard" : "/"} aria-label="i-SOA WorkHub"><Logo /></Link>
        <div className="flex items-center gap-2">
          {lang}
          {profile ? (
            <>
              <Link href="/dashboard/notifications" className={iconBtn} aria-label={t("dash.notifications")}>
                <Icon name="bell" className="h-[18px] w-[18px]" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-bg">{unread > 9 ? "9+" : unread}</span>}
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className={iconBtn} aria-label="Admin"><Icon name="shieldcheck" className="h-[18px] w-[18px]" /></Link>
              )}
              <Link href="/dashboard/profile" className={iconBtn} aria-label={t("dash.profile")}><Icon name="user" className="h-[18px] w-[18px]" /></Link>
              <Link href="/dashboard/settings" className={iconBtn} aria-label={t("dash.settings", "Settings")}><Icon name="settings" className="h-[18px] w-[18px]" /></Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !min-h-[40px] !px-3">{t("nav.login")}</Link>
              <Link href="/register" className="btn btn-primary !min-h-[40px] !px-3">{t("nav.register")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
