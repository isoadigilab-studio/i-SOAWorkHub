import { cookies } from "next/headers";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import mg from "@/messages/mg.json";

export const LOCALES = ["mg", "fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const dict: Record<Locale, any> = { en, fr, mg };

function lookup(obj: any, key: string): string | undefined {
  const v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return typeof v === "string" ? v : undefined;
}

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("lang")?.value;
  return (LOCALES as readonly string[]).includes(c ?? "") ? (c as Locale) : "en";
}

export type T = (key: string, fallback?: string) => string;

export async function getT(): Promise<{ t: T; locale: Locale }> {
  const locale = await getLocale();
  const t: T = (key, fallback) => lookup(dict[locale], key) ?? lookup(en, key) ?? fallback ?? key;
  return { t, locale };
}

export function catName(c: { name: string; name_fr: string; name_mg: string }, locale: Locale): string {
  return locale === "fr" ? c.name_fr : locale === "mg" ? c.name_mg : c.name;
}
