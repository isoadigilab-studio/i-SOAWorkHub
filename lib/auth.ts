import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "freelancer" | "client" | "admin";

export async function getSession() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, profile: null as any };
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return { sb, user, profile: profile as any };
}

export async function requireUser(next = "/dashboard") {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (s.profile.status === "suspended") redirect("/login?error=suspended");
  return s as { sb: typeof s.sb; user: NonNullable<typeof s.user>; profile: any };
}

export async function requireRole(role: Role, next = "/dashboard") {
  const s = await requireUser(next);
  if (s.profile.role !== role) redirect("/dashboard");
  return s;
}

export async function audit(
  sb: any,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await sb.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}
