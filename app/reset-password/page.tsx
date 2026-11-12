import { resetPassword } from "@/app/actions/auth";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Reset password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await requireUser("/reset-password");
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl">{t("auth.new_password")}</h1>
      <div className="mt-4">
        <Flash sp={sp} />
      </div>
      <form action={resetPassword} className="card space-y-4">
        <input type="hidden" name="return_to" value="/reset-password" />
        <div>
          <label className="label" htmlFor="password">{t("auth.password")}</label>
          <input className="input" id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
          <p className="mt-1 text-xs text-muted">{t("auth.password_hint")}</p>
        </div>
        <button className="btn btn-primary w-full">{t("common.save")}</button>
      </form>
    </div>
  );
}
