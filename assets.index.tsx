import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Role } from "@/lib/permissions";

export const admin = supabaseAdmin;

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export async function getActor(userId: string): Promise<Actor> {
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, name, email, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile) throw new Error("Profile not found");

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    is_active: profile.is_active,
    role: (roleRow?.role as Role) ?? "Journalist",
  };
}

export async function logAudit(params: {
  asset_id: string | null;
  action: string;
  performed_by: string;
  details?: Record<string, unknown>;
}) {
  await admin.from("audit_logs").insert({
    asset_id: params.asset_id,
    action: params.action,
    performed_by: params.performed_by,
    details: (params.details ?? {}) as never,
  });
}

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await admin.storage.from("assets").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
