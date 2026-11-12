export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "item";
}

export function uniqueSlug(input: string): string {
  return `${slugify(input)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function formatMoney(min?: number | null, max?: number | null, currency = "USD"): string | null {
  if (min == null && max == null) return null;
  const f = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${f(min)}–${f(max)} ${currency}`;
  return `${f((min ?? max) as number)} ${currency}`;
}

export function formatDate(d?: string | null, locale = "en"): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(locale === "mg" ? "fr" : locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Strip characters that have meaning inside PostgREST .or()/ilike filters. */
export function cleanSearch(q: string): string {
  return q.replace(/[%,()\\*:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
