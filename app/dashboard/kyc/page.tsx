import { submitKyc } from "@/app/actions/kyc";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const metadata = { title: "KYC" };

export default async function KycPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb, user, profile } = await requireUser("/dashboard/kyc");
  const { t } = await getT();
  const { data: last } = await sb.from("kyc_submissions").select("status,review_note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const canSubmit = ["none", "rejected"].includes(profile.kyc_status);
  const fileCls = "input !py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-bg";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">KYC</h1>
      <Flash sp={sp} />
      <div className="card flex items-center gap-3">
        <Icon name="shieldcheck" className={`h-8 w-8 ${profile.kyc_status === "approved" ? "text-emerald-300" : "text-gold"}`} />
        <div>
          <p className="text-sm text-muted">{t("w.kyc_status", "Status")}</p>
          <p className="text-lg font-bold">{t(`kyc_status.${profile.kyc_status}`, profile.kyc_status)}</p>
          {last?.status === "rejected" && last.review_note && <p className="text-xs text-red-300">{last.review_note}</p>}
        </div>
      </div>
      {canSubmit ? (
        <form action={submitKyc} encType="multipart/form-data" className="card space-y-3">
          <p className="text-sm text-muted">{t("kyc.help", "Our team reviews your documents manually. Files are stored privately and only used for verification. JPG, PNG, WebP or PDF, max 4 MB each.")}</p>
          <div><label className="label" htmlFor="legal_name">{t("kyc.legal_name", "Full legal name")}</label><input className="input" id="legal_name" name="legal_name" required minLength={2} maxLength={120} defaultValue={profile.full_name ?? ""} /></div>
          <div><label className="label" htmlFor="country">{t("kyc.country", "Country")}</label><input className="input" id="country" name="country" required minLength={2} maxLength={80} /></div>
          <div><label className="label" htmlFor="doc_type">{t("kyc.doc_type", "Document type")}</label><select className="input" id="doc_type" name="doc_type"><option value="national_id">{t("kyc.national_id", "National ID card")}</option><option value="passport">{t("kyc.passport", "Passport")}</option><option value="driver_license">{t("kyc.driver_license", "Driver license")}</option></select></div>
          <div><label className="label" htmlFor="id_front">{t("kyc.front", "Document — front")}</label><input className={fileCls} id="id_front" name="id_front" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /></div>
          <div><label className="label" htmlFor="id_back">{t("kyc.back", "Document — back (if any)")}</label><input className={fileCls} id="id_back" name="id_back" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></div>
          <div><label className="label" htmlFor="selfie">{t("kyc.selfie", "Selfie holding the document")}</label><input className={fileCls} id="selfie" name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required /></div>
          <button className="btn btn-primary w-full"><Icon name="upload" className="h-4 w-4" />{t("kyc.submit", "Submit for review")}</button>
        </form>
      ) : profile.kyc_status === "pending" ? (
        <p className="card text-sm text-muted">{t("kyc.pending", "Your documents are being reviewed. You will be notified.")}</p>
      ) : (
        <p className="card text-sm text-emerald-300">{t("kyc.approved", "Your identity is verified. You can withdraw your ISC.")}</p>
      )}
    </div>
  );
}
