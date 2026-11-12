import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Database-backed rate limiter (see check_rate_limit() in the migration).
 * Keyed by action + client IP (+ optional extra). Fails open if the RPC errors,
 * so an outage never locks everyone out; Cloudflare WAF rate-limiting rules are the outer layer.
 */
export async function limit(
  sb: SupabaseClient,
  action: string,
  max: number,
  windowSeconds: number,
  extra = "",
): Promise<boolean> {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { data, error } = await sb.rpc("check_rate_limit", {
    p_key: `${action}:${ip}${extra}`,
    p_max: max,
    p_window: windowSeconds,
  });
  if (error) return true;
  return data === true;
}
