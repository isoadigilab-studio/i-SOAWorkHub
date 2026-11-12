import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Flash } from "@/components/Flash";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl">{t("auth.register_title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("auth.register_sub")}</p>
      <div className="mt-4">
        <Flash sp={sp} />
      </div>
      <form action={signUp} className="card space-y-4">
        <div>
          <label className="label" htmlFor="full_name">{t("auth.full_name")}</label>
          <input className="input" id="full_name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("auth.password")}</label>
          <input className="input" id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
          <p className="mt-1 text-xs text-muted">{t("auth.password_hint")}</p>
        </div>
        <fieldset>
          <legend className="label">{t("auth.i_am")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-orange-50">
              <input type="radio" name="role" value="freelancer" defaultChecked /> {t("auth.role_freelancer")}
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-orange-50">
              <input type="radio" name="role" value="client" /> {t("auth.role_client")}
            </label>
          </div>
        </fieldset>
        <button className="btn btn-primary w-full">{t("nav.register")}</button>
        <p className="text-center text-sm text-muted">
          {t("auth.have_account")} <Link href="/login" className="text-accent hover:underline">{t("nav.login")}</Link>
        </p>
      </form>
    </div>
  );
}
