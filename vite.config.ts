-- Enums
CREATE TYPE public.asset_type AS ENUM ('Photo', 'Video', 'Audio', 'Graphic');
CREATE TYPE public.asset_status AS ENUM ('Active', 'Archived', 'Draft');
CREATE TYPE public.app_role AS ENUM ('Admin', 'Journalist', 'Editor');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles (users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Multimedia assets
CREATE TABLE public.multimedia_assets (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  asset_type asset_type NOT NULL,
  story_name VARCHAR(255) NOT NULL,
  news_beat VARCHAR(100) NOT NULL,
  journalist_name VARCHAR(150) NOT NULL,
  upload_date DATE NOT NULL,
  file_url TEXT,
  storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status asset_status NOT NULL DEFAULT 'Draft',
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multimedia_assets TO authenticated;
GRANT ALL ON public.multimedia_assets TO service_role;
ALTER TABLE public.multimedia_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view assets" ON public.multimedia_assets FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.multimedia_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.multimedia_assets(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assets_status ON public.multimedia_assets(status);
CREATE INDEX idx_assets_type ON public.multimedia_assets(asset_type);
CREATE INDEX idx_assets_upload_date ON public.multimedia_assets(upload_date);
CREATE INDEX idx_audit_asset ON public.audit_logs(asset_id);
CREATE INDEX idx_audit_time ON public.audit_logs(timestamp);