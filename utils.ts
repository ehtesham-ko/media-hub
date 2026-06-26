import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Role } from "@/lib/permissions";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: Role | null;
  profileName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<Role | null>(null);
  const [profileName, setProfileName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchMeta = React.useCallback(async (uid: string) => {
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("profiles").select("name").eq("id", uid).maybeSingle(),
    ]);
    setRole((roleRow?.role as Role) ?? null);
    setProfileName(profile?.name ?? null);
  }, []);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { void fetchMeta(s.user.id); }, 0);
      } else {
        setRole(null);
        setProfileName(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void fetchMeta(data.session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchMeta]);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    role,
    profileName,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (session?.user) await fetchMeta(session.user.id); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}