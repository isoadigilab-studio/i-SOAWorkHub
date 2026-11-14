import { resetPassword } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT, LOCALES } from "@/lib/i18n";

export const metadata = { title: "Settings" };
const NAMES: Record<string, string> = { mg: "Malagasy", fr: "Français", en: "English" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await requireUser("/dashboard/settings");
  const { t, locale } = await getT();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t("dash.settings", "Settings")}</h1>
      <Flash sp={sp} />
      <form action={setLocale} className="card space-y-3">
        <h2 className="text-lg">{t("settings.language", "Language")}</h2>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((l) => <button key={l} name="lang" value={l} className={`btn ${l === locale ? "btn-primary" : "btn-ghost"}`}>{NAMES[l]}</button>)}
        </div>
      </form>
      <form action={resetPassword} className="card space-y-3">
        <h2 className="text-lg">{t("dash.change_password")}</h2>
        <input type="hidden" name="return_to" value="/dashboard/settings" />
        <input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" aria-label={t("auth.new_password")} />
        <p className="text-xs text-muted">{t("auth.password_hint")}</p>
        <button className="btn btn-navy">{t("common.save")}</button>
      </form>
      <form action="/auth/signout" method="post"><button className="btn btn-danger w-full">{t("nav.logout")}</button></form>
    </div>
  );
}
