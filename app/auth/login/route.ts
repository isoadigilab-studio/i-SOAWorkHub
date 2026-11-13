import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations";
import { safeNext } from "@/lib/utils";

// Login as a Route Handler: session cookies are written directly on the redirect response,
// which is the most reliable pattern on Cloudflare Workers.
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const fd = await request.formData();
  const fail = (key: string) => NextResponse.redirect(`${origin}/login?error=${key}`, 303);

  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fail("invalid_input");

  const response = NextResponse.redirect(`${origin}${safeNext(fd.get("next"))}`, 303);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { data: allowed } = await supabase.rpc("check_rate_limit", { p_key: `login:${ip}`, p_max: 8, p_window: 300 });
  if (allowed === false) return fail("too_many");

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(error.code === "email_not_confirmed" ? "email_not_confirmed" : "bad_credentials");
  return response;
}
