import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReportStats } from "@/lib/reports.functions";
import { listAssets } from "@/lib/assets.functions";
import { useAuth } from "@/lib/auth";
import { AlertsBanner } from "@/components/AlertsBanner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Image, Video, Music, PenTool, Archive, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard | Asset Library" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profileName, role, user } = useAuth();
  const statsFn = useServerFn(getReportStats);
  const assetsFn = useServerFn(listAssets);
  const { data: stats } = useQuery({ queryKey: ["reportStats", "", ""], queryFn: () => statsFn({ data: {} }) });
  const { data: recent } = useQuery({ queryKey: ["recentAssets"], queryFn: () => assetsFn({ data: {} }) });
  const isJournalist = role === "Journalist";
  const { data: mine } = useQuery({
    queryKey: ["myUploads", user?.id],
    queryFn: () => assetsFn({ data: { uploaded_by: user!.id } }),
    enabled: isJournalist && !!user?.id,
  });

  const { data: drafts } = useQuery({
    queryKey: ["staleDrafts"],
    queryFn: () => assetsFn({ data: { status: "Draft", pageSize: 100 } }),
  });
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const staleCount = (drafts?.assets ?? []).filter(
    (d) => new Date(d.upload_date).getTime() < sevenDaysAgo,
  ).length;

  const cards = [
    { label: "Total Assets", value: stats?.total ?? 0, icon: FileText, accent: "border-l-primary", iconCls: "text-primary", active: false },
    { label: "Active", value: stats?.byStatus.find((s) => s.name === "Active")?.value ?? 0, icon: Image, accent: "border-l-emerald-500", iconCls: "text-emerald-500", active: true },
    { label: "Draft", value: stats?.byStatus.find((s) => s.name === "Draft")?.value ?? 0, icon: PenTool, accent: "border-l-amber-500", iconCls: "text-amber-500", active: false },
    { label: "Archived", value: stats?.byStatus.find((s) => s.name === "Archived")?.value ?? 0, icon: Archive, accent: "border-l-slate-400", iconCls: "text-slate-400", active: false },
  ];

  return (
    <div className="space-y-6">
      <AlertsBanner count={staleCount} />
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <p className="relative font-serif text-sm font-semibold uppercase tracking-wide text-primary">Namaste Telangana</p>
        <h1 className="relative mt-1 font-serif text-3xl font-bold text-foreground">
          Welcome back, {profileName ?? "there"} 👋
        </h1>
        <p className="relative mt-1 text-sm text-muted-foreground">Your multimedia content library at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            style={{ animationDelay: `${i * 100}ms` }}
            className={`card-hover animate-fade-in-up rounded-xl border border-l-4 border-border bg-gradient-to-b from-card to-card/60 p-4 ${c.accent}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.iconCls}`} />
            </div>
            <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-foreground">
              {c.value}
              {c.active && <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />}
            </p>
          </div>
        ))}
      </div>

      {isJournalist && (mine?.assets.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">My Recent Uploads</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(mine?.assets ?? []).slice(0, 4).map((a) => {
              const Icon = a.asset_type === "Video" ? Video : a.asset_type === "Audio" ? Music : a.asset_type === "Graphic" ? PenTool : Image;
              return (
                <Link key={a.id} to="/assets/$assetId" params={{ assetId: a.id }} className="rounded-lg border border-border p-3 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                  <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.news_beat}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">Assets by Type</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats?.byType ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">Uploads Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats?.uploadsOverTime ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-foreground">Recent Assets</h2>
          <Link to="/assets" className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {(recent?.assets ?? []).slice(0, 6).map((a) => {
            const Icon = a.asset_type === "Video" ? Video : a.asset_type === "Audio" ? Music : a.asset_type === "Graphic" ? PenTool : Image;
            return (
              <Link
                key={a.id}
                to="/assets/$assetId"
                params={{ assetId: a.id }}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>
                <span className="flex-1 truncate text-sm font-medium text-foreground">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.news_beat}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}