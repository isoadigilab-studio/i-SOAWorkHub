import { redirect } from "next/navigation";

/** Redirect back to a page with a one-shot message key shown by <Flash />. */
export function back(path: string, kind: "msg" | "error", key: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(key)}`);
}
