import Link from "next/link";

export function Pagination({
  page,
  total,
  perPage,
  basePath,
  params,
}: {
  page: number;
  total: number;
  perPage: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== "page" && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      {page > 1 && <Link className="btn btn-ghost" href={href(page - 1)}>←</Link>}
      <span className="text-muted">{page} / {pages}</span>
      {page < pages && <Link className="btn btn-ghost" href={href(page + 1)}>→</Link>}
    </nav>
  );
}
