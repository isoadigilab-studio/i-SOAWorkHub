import Link from "next/link";
import { Flash } from "@/components/Flash";
import { getT } from "@/lib/i18n";
import { safeNext } from "@/lib/utils";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl">{t("auth.login_title")}</h1>
      <div className="mt-4">
        <Flash sp={sp} />
      </div>
      <form action="/auth/login" method="post" className="card space-y-4">
        <input type="hidden" name="next" value={safeNext(sp.next)} />
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("auth.password")}</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn btn-primary w-full">{t("nav.login")}</button>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-accent hover:underline">{t("auth.forgot")}</Link>
          <Link href="/register" className="text-accent hover:underline">{t("nav.register")}</Link>
        </div>
      </form>
    </div>
  );
}
