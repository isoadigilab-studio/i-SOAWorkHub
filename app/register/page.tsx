import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Flash } from "@/components/Flash";
import { getT } from "@/lib/i18n";
import { safeNext } from "@/lib/utils";

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
        <input type="hidden" name="next" value={safeNext(sp.next)} />
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
        <button className="btn btn-primary w-full">{t("nav.register")}</button>
        <p className="text-center text-sm text-muted">
          {t("auth.have_account")} <Link href={`/login?next=${encodeURIComponent(safeNext(sp.next))}`} className="text-accent hover:underline">{t("nav.login")}</Link>
        </p>
      </form>
    </div>
  );
}
