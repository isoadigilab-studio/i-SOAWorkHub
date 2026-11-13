import { reviewSubmission } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Review submissions" };

export default async function AdminSubmissions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/submissions");
  const { data } = await sb
    .from("submissions")
    .select("id,url,note,created_at,offers(title),freelancer_profiles(display_name,wallet_address)")
    .eq("status", "submitted")
    .order("created_at", { ascending: true })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Submissions to review</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      {(data ?? []).length === 0 ? <p className="card text-sm text-muted">Nothing to review.</p> : (
        <ul className="space-y-3">
          {(data ?? []).map((s: any) => (
            <li key={s.id} className="card">
              <p className="font-semibold text-navy">{s.offers?.title}</p>
              <p className="text-xs text-muted">{s.freelancer_profiles?.display_name} · {formatDate(s.created_at)} · wallet {s.freelancer_profiles?.wallet_address ? "set" : "MISSING"}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-2 block break-all text-sm text-accent underline">{s.url}</a>
              {s.note && <p className="mt-2 whitespace-pre-line text-sm">{s.note}</p>}
              <form action={reviewSubmission} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={s.id} />
                <input className="input" name="review_note" placeholder="Feedback if rejecting (optional)" maxLength={1000} />
                <div className="flex gap-2">
                  <button name="decision" value="approve" className="btn btn-primary">Approve → create payout</button>
                  <button name="decision" value="reject" className="btn btn-danger">Reject</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
