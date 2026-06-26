import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  LayoutDashboard,
  Images,
  Upload,
  BarChart3,
  ScrollText,
  Users,
  LogOut,
  Film,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavDef {
  to: string;
  icon: typeof Images;
  label: string;
  shortcut?: string;
}

function NavItem({ to, icon: Icon, label, shortcut, onNavigate }: NavDef & { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      className={`nav-underline relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-l-2 border-primary bg-primary/15 text-primary shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
  if (!shortcut) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Press {shortcut}</TooltipContent>
    </Tooltip>
  );
}

function initials(name: string | null) {
  if (!name) return "U";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { role, profileName, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="rounded-2xl bg-primary/20 p-0.5 shadow-[0_0_20px_-4px_var(--color-primary)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-accent shadow-md">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <div className="leading-tight">
          <p className="font-serif text-lg font-bold text-sidebar-foreground">Namaste Telangana</p>
          <p className="text-xs text-sidebar-foreground/60">Asset Library</p>
        </div>
      </div>
      <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Navigation</p>
      <nav className="flex flex-1 flex-col gap-1">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onNavigate={onNavigate} />
        <NavItem to="/assets" icon={Images} label="Assets" shortcut="/" onNavigate={onNavigate} />
        {can.upload(role) && <NavItem to="/upload" icon={Upload} label="Upload" shortcut="U" onNavigate={onNavigate} />}
        <NavItem to="/reports" icon={BarChart3} label="Reports" onNavigate={onNavigate} />
        {can.viewAudit(role) && <NavItem to="/audit" icon={ScrollText} label="Audit Logs" onNavigate={onNavigate} />}
        {can.manageUsers(role) && <NavItem to="/users" icon={Users} label="Users" onNavigate={onNavigate} />}
      </nav>
      <div className="mt-4 border-t border-sidebar-border pt-4">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/30 text-sm font-bold text-primary">
            {initials(profileName)}
          </div>
          <div className="text-sm">
            <p className="font-medium text-sidebar-foreground">{profileName ?? "User"}</p>
            <p className="text-xs text-sidebar-primary">{role}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen bg-background">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 md:flex">
          <SidebarInner />
        </aside>

        {/* Mobile header */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Film className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-base font-bold text-sidebar-foreground">Namaste Telangana</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent/60">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-4">
              <SidebarInner onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}