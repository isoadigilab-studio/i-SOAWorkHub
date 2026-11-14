import { createOffer, sendInvitations, setOfferStatus } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";
import { CATEGORIES } from "@/lib/validations";

export const metadata = { title: "Offers" };

export default async function AdminOffers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/offers");
  const { data } = await sb
    .from("offers")
    .select("id,title,category,status,visibility,created_at,offer_finance(price_usd,freelancer_amount,platform_amount,fees_amount),freelancer_profiles(display_name),invitations(count)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-2xl">Offers</h1>
      <div className="mt-4"><Flash sp={sp} /></div>

      <form action={createOffer} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="text-lg sm:col-span-2">New offer</h2>
        <div className="sm:col-span-2"><label className="label" htmlFor="visibility">Visibility</label><select className="input" id="visibility" name="visibility"><option value="invite">Invitation only (private link by email)</option><option value="open">Open (visible to all freelancers)</option></select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required minLength={5} maxLength={140} /></div>
        <div><label className="label" htmlFor="category">Category</label><select className="input" id="category" name="category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="label" htmlFor="price_usd">Client price (USD) — split 50/40/10, freelancer paid in ISC (1 USD = 0.01 ISC)</label><input className="input" id="price_usd" name="price_usd" type="number" step="0.01" min="0.01" required /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">Description (visible to invited freelancers)</label><textarea className="input" id="description" name="description" rows={4} required minLength={20} maxLength={5000} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="instructions">Instructions (visible after acceptance)</label><textarea className="input" id="instructions" name="instructions" rows={3} maxLength={5000} /></div>
        <div><label className="label" htmlFor="deadline">Deadline</label><input className="input" id="deadline" name="deadline" type="date" /></div>
        <div className="flex flex-wrap items-end gap-2">
          <button name="intent" value="open" className="btn btn-primary">Publish (open)</button>
          <button name="intent" value="draft" className="btn btn-ghost">Save draft</button>
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {(data ?? []).map((o: any) => {
          const f = Array.isArray(o.offer_finance) ? o.offer_finance[0] : o.offer_finance;
          return (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-semibold text-ink">{o.title}</span>
                <span className="flex gap-1.5"><span className="tag">{o.category}</span><span className="tag">{o.visibility}</span><span className="tag">{o.status}</span></span>
              </div>
              {f && <p className="mt-1 text-xs text-muted">Price {Number(f.price_usd).toFixed(2)} · freelancer ${Number(f.freelancer_amount).toFixed(2)} = {(Math.round(Number(f.freelancer_amount) * 100) / 10000).toFixed(4)} ISC · i-SOA {Number(f.platform_amount).toFixed(2)} · fees {Number(f.fees_amount).toFixed(2)}</p>}
              {o.freelancer_profiles?.display_name && <p className="mt-1 text-xs text-muted">Assigned to: {o.freelancer_profiles.display_name}</p>}
              <p className="text-xs text-muted">Invitations: {o.invitations?.[0]?.count ?? 0}</p>
              <form action={setOfferStatus} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                {o.status === "draft" && <button name="action" value="open" className="btn btn-primary !min-h-[36px] !py-1">Publish</button>}
                {["draft", "open", "assigned"].includes(o.status) && <button name="action" value="cancel" className="btn btn-danger !min-h-[36px] !py-1">Cancel</button>}
              </form>
              {o.status === "open" && o.visibility === "invite" && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-gold">Invite freelancers by email</summary>
                  <form action={sendInvitations} className="mt-2 space-y-2">
                    <input type="hidden" name="offer_id" value={o.id} />
                    <textarea className="input" name="emails" rows={3} placeholder="one@mail.com, two@mail.com (max 50)" required />
                    <button className="btn btn-navy">Send invitations</button>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
