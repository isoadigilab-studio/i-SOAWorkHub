import { getT } from "@/lib/i18n";

export async function Flash({ sp }: { sp: { msg?: string; error?: string } }) {
  const { t } = await getT();
  if (!sp?.msg && !sp?.error) return null;
  const isErr = Boolean(sp.error);
  const key = (sp.error ?? sp.msg) as string;
  return (
    <div
      role={isErr ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        isErr ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {t(`flash.${key}`, key.slice(0, 160))}
    </div>
  );
}
