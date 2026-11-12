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
        isErr ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"
      }`}
    >
      {t(`flash.${key}`, key.slice(0, 160))}
    </div>
  );
}
