import { forgotPassword } from "@/app/actions/auth";
import { Flash } from "@/components/Flash";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Forgot password" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl">{t("auth.forgot")}</h1>
      <div className="mt-4">
        <Flash sp={sp} />
      </div>
      <form action={forgotPassword} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <button className="btn btn-primary w-full">{t("auth.send_reset")}</button>
      </form>
    </div>
  );
}
