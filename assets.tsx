import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, getActor } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    if (!can.manageUsers(actor.role)) throw new Error("You do not have permission to manage users");
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, name, email, is_active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    return {
      users: (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "Journalist" })),
    };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), is_active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, getActor, logAudit } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    if (!can.manageUsers(actor.role)) throw new Error("You do not have permission to manage users");
    const { error } = await admin.from("profiles").update({ is_active: data.is_active } as never).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit({ asset_id: null, action: data.is_active ? "USER_ACTIVATE" : "USER_DEACTIVATE", performed_by: actor.id, details: { userId: data.userId } });
    return { success: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["Admin", "Journalist", "Editor"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, getActor, logAudit } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    if (!can.manageUsers(actor.role)) throw new Error("You do not have permission to manage users");
    await admin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await admin.from("user_roles").insert({ user_id: data.userId, role: data.role } as never);
    if (error) throw new Error(error.message);
    await logAudit({ asset_id: null, action: "USER_ROLE_CHANGE", performed_by: actor.id, details: { userId: data.userId, role: data.role } });
    return { success: true };
  });