"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { back } from "@/lib/flash";
import { limit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/utils";
import { forgotSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/validations";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function signIn(fd: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back("/login", "error", "invalid_input");
  const sb = await createClient();
  if (!(await limit(sb, "login", 8, 300))) back("/login", "error", "too_many");
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) back("/login", "error", error.code === "email_not_confirmed" ? "email_not_confirmed" : "bad_credentials");
  redirect(safeNext(fd.get("next")));
}

export async function signUp(fd: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const short = parsed.error.issues.some((i) => i.message === "password_short");
    back("/register", "error", short ? "password_short" : "invalid_input");
  }
  const sb = await createClient();
  if (!(await limit(sb, "register", 5, 3600))) back("/register", "error", "too_many");
  const { full_name, email, password, role } = parsed.data;
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name, role }, emailRedirectTo: `${site()}/auth/callback?next=/dashboard` },
  });
  if (error) back("/register", "error", "register_failed");
  back("/login", "msg", "check_email");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/");
}

export async function forgotPassword(fd: FormData) {
  const parsed = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) back("/forgot-password", "error", "invalid_input");
  const sb = await createClient();
  if (!(await limit(sb, "forgot", 4, 3600))) back("/forgot-password", "error", "too_many");
  await sb.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists (prevents account enumeration).
  back("/forgot-password", "msg", "reset_sent");
}

export async function resetPassword(fd: FormData) {
  const returnTo = safeNext(fd.get("return_to"), "/reset-password");
  const parsed = passwordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const short = parsed.error.issues.some((i) => i.message === "password_short");
    back(returnTo, "error", short ? "password_short" : "invalid_input");
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) back("/login", "error", "session_expired");
  const { error } = await sb.auth.updateUser({ password: parsed.data.password });
  if (error) back(returnTo, "error", "update_failed");
  back("/dashboard", "msg", "password_updated");
}
