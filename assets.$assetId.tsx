import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getReportStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ date_from: z.string().optional(), date_to: z.string().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { admin } = await import("@/lib/server-helpers.server");
    let q = admin
      .from("multimedia_assets")
      .select("asset_type, status, news_beat, upload_date");
    if (data.date_from) q = q.gte("upload_date", data.date_from);
    if (data.date_to) q = q.lte("upload_date", data.date_to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const assets = rows ?? [];

    const tally = (key: "asset_type" | "status" | "news_beat") => {
      const m = new Map<string, number>();
      for (const a of assets) m.set(a[key] as string, (m.get(a[key] as string) ?? 0) + 1);
      return Array.from(m, ([name, value]) => ({ name, value }));
    };

    const byMonth = new Map<string, number>();
    for (const a of assets) {
      const month = (a.upload_date as string)?.slice(0, 7);
      if (month) byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    const uploadsOverTime = Array.from(byMonth, ([name, value]) => ({ name, value })).sort((x, y) =>
      x.name.localeCompare(y.name),
    );

    return {
      total: assets.length,
      byType: tally("asset_type"),
      byStatus: tally("status"),
      byBeat: tally("news_beat"),
      uploadsOverTime,
    };
  });

export const exportAssetsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { admin } = await import("@/lib/server-helpers.server");
    const { data: rows, error } = await admin
      .from("multimedia_assets")
      .select("title, asset_type, story_name, news_beat, journalist_name, upload_date, status, tags")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const header = ["Title", "Type", "Story", "News Beat", "Journalist", "Upload Date", "Status", "Tags"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(",")];
    for (const r of rows ?? []) {
      lines.push(
        [r.title, r.asset_type, r.story_name, r.news_beat, r.journalist_name, r.upload_date, r.status, (r.tags ?? []).join("; ")]
          .map(esc)
          .join(","),
      );
    }
    return { csv: lines.join("\n") };
  });