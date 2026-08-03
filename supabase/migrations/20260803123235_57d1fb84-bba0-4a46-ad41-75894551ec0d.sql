
CREATE TYPE public.app_role AS ENUM ('admin','seller','buyer','landlord','tenant');
CREATE TYPE public.listing_section AS ENUM ('sale','rent');
CREATE TYPE public.listing_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.sub_status AS ENUM ('pending','active','expired','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.sub_status NOT NULL DEFAULT 'pending',
  amount_egp integer NOT NULL DEFAULT 200,
  payment_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_subscribed(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
  ) OR public.has_role(_user_id, 'admin')
$$;

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section public.listing_section NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  area_m2 integer,
  rooms integer,
  bathrooms integer,
  city text NOT NULL DEFAULT '',
  district text,
  status public.listing_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.property_private (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  address text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_private TO authenticated;
GRANT ALL ON public.property_private TO service_role;
ALTER TABLE public.property_private ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.property_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;
GRANT ALL ON public.property_media TO service_role;
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_insert_own_non_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

CREATE POLICY "subs_select_own_or_admin" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subs_insert_own" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "subs_update_admin" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "properties_select" ON public.properties FOR SELECT TO authenticated
  USING (status = 'approved' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "properties_insert_owner" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(),'seller') OR public.has_role(auth.uid(),'landlord') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "properties_update_owner_or_admin" ON public.properties FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "properties_delete_owner_or_admin" ON public.properties FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "private_select_owner_admin" ON public.property_private FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "private_insert_owner" ON public.property_private FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "private_update_owner_admin" ON public.property_private FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "private_delete_owner_admin" ON public.property_private FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));

CREATE POLICY "media_select_subscribed" ON public.property_media FOR SELECT TO authenticated
  USING (public.is_subscribed(auth.uid()) OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "media_insert_owner" ON public.property_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));
CREATE POLICY "media_delete_owner_admin" ON public.property_media FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));

CREATE POLICY "contact_select_own_or_admin" ON public.contact_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "contact_insert_subscribed" ON public.contact_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.is_subscribed(auth.uid()));
CREATE POLICY "contact_update_admin" ON public.contact_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
