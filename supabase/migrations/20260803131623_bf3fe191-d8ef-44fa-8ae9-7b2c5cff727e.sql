ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'apartment',
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS finishing text,
  ADD COLUMN IF NOT EXISTS features text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS land_type text,
  ADD COLUMN IF NOT EXISTS in_cordon boolean,
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND banned = true)
$$;

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS properties_insert_owner ON public.properties;
CREATE POLICY properties_insert_owner ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND NOT public.is_banned(auth.uid())
    AND (public.has_role(auth.uid(),'seller') OR public.has_role(auth.uid(),'landlord') OR public.has_role(auth.uid(),'admin'))
  );

DROP POLICY IF EXISTS contact_insert_subscribed ON public.contact_requests;
CREATE POLICY contact_insert_subscribed ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.is_subscribed(auth.uid()) AND NOT public.is_banned(auth.uid()));

CREATE OR REPLACE FUNCTION public.increment_property_views(_property_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.properties SET views = views + 1 WHERE id = _property_id AND status = 'approved'
$$;

GRANT EXECUTE ON FUNCTION public.increment_property_views(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;