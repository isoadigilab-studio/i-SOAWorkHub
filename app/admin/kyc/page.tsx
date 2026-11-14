import { reviewKyc } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "KYC review" };

export default async function AdminKyc({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/kyc");
  const { data } = await sb.from("kyc_submissions").select("*, profiles(full_name)").eq("status", "pending").order("created_at", { ascending: true }).limit(30);
  const rows = await Promise.all(
    (data ?? []).map(async (k: any) => {
      const sign = async (path: string | null) => (path ? (await sb.storage.from("kyc").createSignedUrl(path, 300)).data?.signedUrl ?? null : null);
      return { ...k, front: await sign(k.id_front_path), back: await sign(k.id_back_path), selfie: await sign(k.selfie_path) };
    }),
  );
  return (
    <div>
      <h1 className="text-2xl">KYC review (manual)</h1>
      <p className="mt-1 text-sm text-muted">Links expire after 5 minutes. Compare the name and the selfie with the document before approving.</p>
      <div className="mt-4"><Flash sp={sp} /></div>
      {rows.length === 0 ? <p className="card text-sm text-muted">Nothing pending.</p> : (
        <ul className="space-y-4">
          {rows.map((k: any) => (
            <li key={k.id} className="card">
              <p className="font-semibold">{k.legal_name} <span className="text-sm font-normal text-muted">({k.profiles?.full_name})</span></p>
              <p className="text-xs text-muted">{k.country} · {k.doc_type} · {formatDate(k.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {k.front && <a className="btn btn-ghost !min-h-[36px]" href={k.front} target="_blank" rel="noopener noreferrer">Front</a>}
                {k.back && <a className="btn btn-ghost !min-h-[36px]" href={k.back} target="_blank" rel="noopener noreferrer">Back</a>}
                {k.selfie && <a className="btn btn-ghost !min-h-[36px]" href={k.selfie} target="_blank" rel="noopener noreferrer">Selfie</a>}
              </div>
              <form action={reviewKyc} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={k.id} />
                <input className="input" name="note" placeholder="Note to the user (required if rejecting)" maxLength={500} />
                <div className="flex gap-2">
                  <button name="decision" value="approved" className="btn btn-primary">Approve</button>
                  <button name="decision" value="rejected" className="btn btn-danger">Reject</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
