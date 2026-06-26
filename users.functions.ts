import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ asset_id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { admin, getActor } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    // Full audit log requires Admin; per-asset history is visible to any authenticated user.
    if (!data.asset_id && !can.viewAudit(actor.role)) {
      throw new Error("You do not have permission to view audit logs");
    }
    let q = admin
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);
    if (data.asset_id) q = q.eq("asset_id", data.asset_id);
    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((logs ?? []).map((l) => l.performed_by).filter(Boolean))) as string[];
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, name").in("id", ids)
      : { data: [] as { id: string; name: string }[] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
    const assetIds = Array.from(new Set((logs ?? []).map((l) => l.asset_id).filter(Boolean))) as string[];
    const { data: assets } = assetIds.length
      ? await admin.from("multimedia_assets").select("id, title").in("id", assetIds)
      : { data: [] as { id: string; title: string }[] };
    const assetMap = new Map((assets ?? []).map((a) => [a.id, a.title]));
    return {
      logs: (logs ?? []).map((l) => ({
        ...l,
        performer_name: l.performed_by ? nameMap.get(l.performed_by) ?? "Unknown" : "System",
        asset_title: l.asset_id ? assetMap.get(l.asset_id) ?? "Deleted asset" : null,
      })),
    };
  });