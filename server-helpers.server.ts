import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const assetInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  asset_type: z.enum(["Photo", "Video", "Audio", "Graphic"]),
  story_name: z.string().min(1).max(255),
  news_beat: z.string().min(1).max(100),
  journalist_name: z.string().min(1).max(150),
  upload_date: z.string().min(1),
  tags: z.array(z.string().max(50)).max(20).default([]),
  status: z.enum(["Active", "Archived", "Draft"]).default("Draft"),
  notes: z.string().max(5000).optional().nullable(),
  storage_path: z.string().max(500).optional().nullable(),
});

export const listAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().max(255).optional(),
        asset_type: z.string().optional(),
        status: z.string().optional(),
        news_beat: z.string().optional(),
        journalist_name: z.string().max(150).optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        tag: z.string().max(50).optional(),
        uploaded_by: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(24),
        sortBy: z.enum(["upload_date", "title", "created_at"]).default("created_at"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { admin, signedUrl } = await import("@/lib/server-helpers.server");
    let q = admin
      .from("multimedia_assets")
      .select("*", { count: "exact" })
      .order(data.sortBy, { ascending: data.sortOrder === "asc" });
    if (data.search) q = q.or(`title.ilike.%${data.search}%,story_name.ilike.%${data.search}%,journalist_name.ilike.%${data.search}%`);
    if (data.asset_type && data.asset_type !== "All") q = q.eq("asset_type", data.asset_type as never);
    if (data.status && data.status !== "All") q = q.eq("status", data.status as never);
    if (data.news_beat && data.news_beat !== "All") q = q.eq("news_beat", data.news_beat);
    if (data.journalist_name) q = q.ilike("journalist_name", `%${data.journalist_name}%`);
    if (data.date_from) q = q.gte("upload_date", data.date_from);
    if (data.date_to) q = q.lte("upload_date", data.date_to);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.uploaded_by) q = q.eq("uploaded_by", data.uploaded_by);
    q = q.range((data.page - 1) * data.pageSize, data.page * data.pageSize - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const assets = await Promise.all(
      (rows ?? []).map(async (a) => ({
        ...a,
        thumbUrl: a.storage_path ? await signedUrl(a.storage_path) : null,
      })),
    );
    return { assets, total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const searchSimilarAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ title: z.string().max(255) }).parse(input))
  .handler(async ({ data }) => {
    const title = data.title.trim();
    if (!title) return { count: 0 };
    const { admin } = await import("@/lib/server-helpers.server");
    const { count, error } = await admin
      .from("multimedia_assets")
      .select("id", { count: "exact", head: true })
      .ilike("title", `%${title}%`);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const getAsset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { admin, signedUrl } = await import("@/lib/server-helpers.server");
    const { data: asset, error } = await admin
      .from("multimedia_assets")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) throw new Error("Asset not found");
    const url = await signedUrl(asset.storage_path);
    return { asset, signedUrl: url };
  });

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assetInput.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, getActor, logAudit } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    if (!can.upload(actor.role)) throw new Error("You do not have permission to upload assets");
    const { data: inserted, error } = await admin
      .from("multimedia_assets")
      .insert({ ...data, uploaded_by: actor.id } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAudit({ asset_id: inserted.id, action: "CREATE", performed_by: actor.id, details: { title: inserted.title } });
    return { asset: inserted };
  });

export const updateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    assetInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, getActor, logAudit } = await import("@/lib/server-helpers.server");
    const { canEditAsset } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    const { id, ...patch } = data;
    const { data: existing } = await admin.from("multimedia_assets").select("uploaded_by").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Asset not found");
    if (!canEditAsset(actor.role, actor.id, existing.uploaded_by)) throw new Error("You do not have permission to edit this asset");
    const { data: updated, error } = await admin
      .from("multimedia_assets")
      .update(patch as never)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAudit({ asset_id: id, action: "UPDATE", performed_by: actor.id, details: { fields: Object.keys(patch) } });
    return { asset: updated };
  });

export const archiveAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, getActor, logAudit } = await import("@/lib/server-helpers.server");
    const { can } = await import("@/lib/permissions");
    const actor = await getActor(context.userId);
    if (!can.archive(actor.role)) throw new Error("You do not have permission to archive assets");
    const { data: updated, error } = await admin
      .from("multimedia_assets")
      .update({ status: "Archived" } as never)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAudit({ asset_id: data.id, action: "ARCHIVE", performed_by: actor.id });
    return { asset: updated };
  });