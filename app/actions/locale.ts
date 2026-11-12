"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALES } from "@/lib/i18n";

export async function setLocale(fd: FormData) {
  const lang = String(fd.get("lang") ?? "");
  if ((LOCALES as readonly string[]).includes(lang)) {
    (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  let target = "/";
  try {
    const ref = (await headers()).get("referer");
    if (ref) {
      const u = new URL(ref);
      target = u.pathname + u.search;
    }
  } catch {
    /* ignore */
  }
  redirect(target);
}
