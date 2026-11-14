import { cookies } from "next/headers";
import { addProduct, addService, rotateMerchantKey, toggleProduct } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { formatIscNumeric } from "@/lib/isc";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Catalog" };

export default async function AdminCatalog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/catalog");
  const [{ data: services }, { data: products }, { data: merchants }] = await Promise.all([
    sb.from("services").select("*").order("name"),
    sb.from("service_products").select("*").order("service_code"),
    sb.from("ticket_merchants").select("service_code,rotated_at"),
  ]);
  const mk = (await cookies()).get("mk_once")?.value;
  const [mkService, mkKey] = mk ? [mk.split(":")[0], mk.split(":").slice(1).join(":")] : [null, null];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl">Services, products and merchant keys</h1>
      <Flash sp={sp} />
      {mkKey && (
        <div className="gold-card">
          <p className="text-sm font-semibold">Merchant key for “{mkService}” — shown once, copy it now</p>
          <p className="mt-2 break-all rounded-xl bg-bg p-3 font-mono text-xs text-gold select-all">{mkKey}</p>
          <p className="mt-2 text-xs text-muted">The service sends it in header <code>x-merchant-key</code> to <code>POST /api/tickets/redeem</code> with {`{ "token", "service": "${mkService}", "ref" }`}. Only a hash is stored.</p>
        </div>
      )}
      <form action={addService} className="card grid gap-3 sm:grid-cols-4">
        <input className="input" name="code" placeholder="code (shop-game)" required />
        <input className="input" name="name" placeholder="Name" required />
        <input className="input" name="description" placeholder="Description" />
        <button className="btn btn-primary">Add service</button>
      </form>
      <form action={addProduct} className="card grid gap-3 sm:grid-cols-4">
        <select className="input" name="service_code">{(services ?? []).map((s: any) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <input className="input" name="name" placeholder="Product (e.g. Monthly plan)" required />
        <input className="input" name="price_isc" placeholder="Price in ISC (e.g. 0.0200)" inputMode="decimal" required />
        <button className="btn btn-primary">Add product</button>
      </form>
      <ul className="space-y-3">
        {(services ?? []).map((s: any) => {
          const m = (merchants ?? []).find((x: any) => x.service_code === s.code);
          return (
            <li key={s.code} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{s.name} <span className="text-xs text-muted">({s.code})</span></span>
                <form action={rotateMerchantKey}><input type="hidden" name="service_code" value={s.code} /><button className="btn btn-navy !min-h-[36px] !py-1">{m ? "Rotate merchant key" : "Create merchant key"}</button></form>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {(products ?? []).filter((p: any) => p.service_code === s.code).map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
                    <span>{p.name} · <b className="text-gold">{formatIscNumeric(p.price_isc)} ISC</b> {!p.active && <span className="tag">disabled</span>}</span>
                    <form action={toggleProduct}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(p.active)} /><button className="btn btn-ghost !min-h-[36px] !py-1">{p.active ? "Disable" : "Enable"}</button></form>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
