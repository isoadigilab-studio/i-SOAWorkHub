import { resetPassword } from "@/app/actions/auth";
import { saveProfile } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { profile } = await requireUser("/dashboard/profile");
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-2xl">{t("dash.profile")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <form action={saveProfile} className="card space-y-3">
        <div><label className="label" htmlFor="display_name">{t("auth.full_name")}</label><input className="input" id="display_name" name="display_name" defaultValue={profile.full_name ?? ""} required minLength={2} maxLength={120} /></div>
        <button className="btn btn-primary">{t("common.save")}</button>
      </form>
      <form action={resetPassword} className="card mt-6 space-y-3">
        <h2 className="text-lg">{t("dash.change_password")}</h2>
        <input type="hidden" name="return_to" value="/dashboard/profile" />
        <input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" aria-label={t("auth.new_password")} />
        <p className="text-xs text-muted">{t("auth.password_hint")}</p>
        <button className="btn btn-navy">{t("common.save")}</button>
      </form>
    </div>
  );
}
