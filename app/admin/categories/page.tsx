import { adminAddCategory, adminToggleCategory } from "@/app/actions/admin";
import { Flash } from "@/components/Flash";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Categories" };

export default async function AdminCategories({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireRole("admin", "/admin/categories");
  const { data } = await sb.from("categories").select("*").order("sort_order");
  return (
    <div>
      <h1 className="text-2xl">Categories</h1>
      <div className="mt-4"><Flash sp={sp} /></div>
      <form action={adminAddCategory} className="card grid gap-3 sm:grid-cols-4">
        <input className="input" name="name" placeholder="Name (EN)" required aria-label="Name EN" />
        <input className="input" name="name_fr" placeholder="Nom (FR)" required aria-label="Name FR" />
        <input className="input" name="name_mg" placeholder="Anarana (MG)" required aria-label="Name MG" />
        <button className="btn btn-primary">Add category</button>
      </form>
      <ul className="mt-4 space-y-2">
        {(data ?? []).map((c: any) => (
          <li key={c.id} className="card flex items-center justify-between gap-3 !p-4">
            <span className="text-sm"><span className="font-semibold text-navy">{c.name}</span> · {c.name_fr} · {c.name_mg}</span>
            <form action={adminToggleCategory}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(c.is_active)} />
              <button className="btn btn-ghost !min-h-[36px] !py-1">{c.is_active ? "Disable" : "Enable"}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
