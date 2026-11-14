import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sha256Hex } from "@/lib/crypto";

/**
 * Server-to-server ticket redemption for other i-SOA services.
 * POST /api/tickets/redeem   headers: x-merchant-key: <secret>   body: { token, service, ref? }
 * The merchant secret is hashed here; only hashes are compared in the database.
 */
export async function POST(request: NextRequest) {
  const key = request.headers.get("x-merchant-key") ?? "";
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const token = String(body?.token ?? "");
  const service = String(body?.service ?? "");
  const ref = body?.ref == null ? "" : String(body.ref).slice(0, 120);
  if (!/^tk_[a-f0-9]{64}$/.test(token) || !/^[a-z0-9_-]{2,40}$/.test(service) || key.length < 20 || key.length > 200) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { data: allowed } = await sb.rpc("check_rate_limit", { p_key: `redeem:${ip}`, p_max: 120, p_window: 60 });
  if (allowed === false) return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });

  const { data, error } = await sb.rpc("ticket_redeem", {
    p_token_hash: await sha256Hex(token),
    p_service: service,
    p_key_hash: await sha256Hex(key),
    p_ref: ref,
  });
  if (error || !data) return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  const res: any = data;
  return NextResponse.json(res, { status: res.ok ? 200 : res.error === "forbidden" ? 403 : 409, headers: { "Cache-Control": "no-store" } });
}
