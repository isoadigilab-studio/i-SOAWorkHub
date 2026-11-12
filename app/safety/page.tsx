import { getT } from "@/lib/i18n";
import { Icon } from "@/components/icons";

export const metadata = { title: "Trust & Safety" };

export default async function SafetyPage() {
  const { t } = await getT();
  const tips = ["s1", "s2", "s3", "s4", "s5"];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">{t("safety.title")}</h1>
      <p className="mt-2 text-muted">{t("safety.intro")}</p>
      <ul className="mt-6 space-y-3">
        {tips.map((k) => (
          <li key={k} className="card flex gap-3 text-sm">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>{t(`safety.${k}`)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-muted">{t("footer.notice")}</p>
    </div>
  );
}
