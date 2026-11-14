import { saveProfile } from "@/app/actions/freelancer";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import Link from "next/link";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user, profile } = await requireUser("/dashboard/profile");
  const { t } = await getT();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t("dash.profile")}</h1>
      <Flash sp={sp} />
      <div className="card flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold2 to-gold text-xl font-extrabold text-bg">{(profile.full_name || "?").slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate font-bold">{profile.full_name}</p><p className="truncate text-sm text-muted">{user.email}</p></div>
      </div>
      <form action={saveProfile} className="card space-y-3">
        <div><label className="label" htmlFor="display_name">{t("auth.full_name")}</label><input className="input" id="display_name" name="display_name" defaultValue={profile.full_name ?? ""} required minLength={2} maxLength={120} /></div>
        <button className="btn btn-primary">{t("common.save")}</button>
      </form>
      <Link href="/dashboard/kyc" className="card flex items-center gap-3 transition hover:border-gold/50"><Icon name="shieldcheck" className="h-6 w-6 text-gold" /><div><p className="font-semibold">KYC</p><p className="text-xs text-muted">{t(`kyc_status.${profile.kyc_status}`, profile.kyc_status)}</p></div></Link>
    </div>
  );
}
