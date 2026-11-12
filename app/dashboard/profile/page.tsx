import { addPortfolio, deletePortfolio, saveClientProfile, saveFreelancerProfile } from "@/app/actions/dashboard";
import { resetPassword } from "@/app/actions/auth";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser("/dashboard/profile");
  const { t } = await getT();

  const passwordForm = (
    <form action={resetPassword} className="card mt-6 space-y-3">
      <h2 className="text-lg">{t("dash.change_password")}</h2>
      <input type="hidden" name="return_to" value="/dashboard/profile" />
      <input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" aria-label={t("auth.new_password")} />
      <p className="text-xs text-muted">{t("auth.password_hint")}</p>
      <button className="btn btn-navy">{t("common.save")}</button>
    </form>
  );

  if (profile.role === "client") {
    const { data: c } = await sb.from("client_profiles").select("*").eq("user_id", user.id).single();
    return (
      <div>
        <h1 className="text-2xl">{t("dash.profile")}</h1>
        <div className="mt-4"><Flash sp={sp} /></div>
        <form action={saveClientProfile} className="card space-y-4">
          <div><label className="label" htmlFor="company_name">{t("client.company")}</label><input className="input" id="company_name" name="company_name" defaultValue={c?.company_name ?? ""} required minLength={2} maxLength={120} /></div>
          <div><label className="label" htmlFor="website">{t("client.website")}</label><input className="input" id="website" name="website" type="url" defaultValue={c?.website ?? ""} placeholder="https://" /></div>
          <div><label className="label" htmlFor="country">{t("client.country")}</label><input className="input" id="country" name="country" defaultValue={c?.country ?? ""} maxLength={80} /></div>
          <div><label className="label" htmlFor="description">{t("client.about")}</label><textarea className="input" id="description" name="description" rows={4} defaultValue={c?.description ?? ""} maxLength={3000} /></div>
          <button className="btn btn-primary">{t("common.save")}</button>
        </form>
        {passwordForm}
      </div>
    );
  }

  if (profile.role !== "freelancer") {
    return <div><h1 className="text-2xl">{t("dash.profile")}</h1><div className="mt-4"><Flash sp={sp} /></div>{passwordForm}</div>;
  }

  const [{ data: f }, { data: portfolio }] = await Promise.all([
    sb.from("freelancer_profiles").select("*").eq("user_id", user.id).single(),
    sb.from("portfolios").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <h1 className="text-2xl">{t("dash.profile")}</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <form action={saveFreelancerProfile} className="card grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="display_name">{t("free.name")}</label><input className="input" id="display_name" name="display_name" defaultValue={f?.display_name ?? ""} required minLength={2} maxLength={120} /></div>
        <div><label className="label" htmlFor="username">{t("free.username")}</label><input className="input" id="username" name="username" defaultValue={f?.username ?? ""} required pattern="[a-z0-9][a-z0-9_\-]{2,29}" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="headline">{t("free.headline")}</label><input className="input" id="headline" name="headline" defaultValue={f?.headline ?? ""} maxLength={160} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="bio">{t("free.bio")}</label><textarea className="input" id="bio" name="bio" rows={5} defaultValue={f?.bio ?? ""} maxLength={3000} /></div>
        <div><label className="label" htmlFor="location">{t("free.location")}</label><input className="input" id="location" name="location" defaultValue={f?.location ?? ""} maxLength={120} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="hourly_rate">{t("free.rate")}</label><input className="input" id="hourly_rate" name="hourly_rate" type="number" min={0} step="0.5" defaultValue={f?.hourly_rate ?? ""} /></div>
          <div><label className="label" htmlFor="currency">{t("opp.currency")}</label><select className="input" id="currency" name="currency" defaultValue={f?.currency ?? "USD"}><option>USD</option><option>EUR</option><option>MGA</option></select></div>
        </div>
        <div><label className="label" htmlFor="experience_level">{t("free.experience")}</label><select className="input" id="experience_level" name="experience_level" defaultValue={f?.experience_level}>{["entry", "intermediate", "expert"].map((x) => <option key={x} value={x}>{t(`exp.${x}`)}</option>)}</select></div>
        <div><label className="label" htmlFor="availability">{t("free.availability")}</label><select className="input" id="availability" name="availability" defaultValue={f?.availability}>{["available", "busy", "unavailable"].map((x) => <option key={x} value={x}>{t(`avail.${x}`)}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="skills">{t("free.skills")} <span className="text-muted">({t("common.comma_separated")})</span></label><input className="input" id="skills" name="skills" defaultValue={(f?.skills ?? []).join(", ")} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="languages">{t("free.languages")} <span className="text-muted">({t("common.comma_separated")})</span></label><input className="input" id="languages" name="languages" defaultValue={(f?.languages ?? []).join(", ")} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="visibility" defaultChecked={f?.visibility} /> {t("free.public")}</label>
        <div className="sm:col-span-2"><button className="btn btn-primary">{t("common.save")}</button></div>
      </form>

      <div className="card mt-6">
        <h2 className="text-lg">{t("free.portfolio")}</h2>
        <ul className="mt-3 space-y-2">
          {(portfolio ?? []).map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
              <a href={p.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="min-w-0 truncate font-semibold text-accent">{p.title}</a>
              <form action={deletePortfolio}><input type="hidden" name="id" value={p.id} /><button className="btn btn-danger !min-h-[36px] !py-1">{t("common.delete")}</button></form>
            </li>
          ))}
        </ul>
        <form action={addPortfolio} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="input" name="title" placeholder={t("free.port_title")} required minLength={2} maxLength={120} aria-label={t("free.port_title")} />
          <input className="input" name="url" type="url" placeholder="https://" required aria-label="URL" />
          <input className="input sm:col-span-2" name="description" placeholder={t("free.port_desc")} maxLength={500} aria-label={t("free.port_desc")} />
          <button className="btn btn-navy sm:col-span-2">{t("free.add_portfolio")}</button>
        </form>
      </div>
      {passwordForm}
    </div>
  );
}
