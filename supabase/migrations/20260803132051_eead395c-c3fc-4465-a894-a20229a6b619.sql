-- 1) Reveal private data to requesters whose contact request was accepted
CREATE POLICY private_select_accepted_requester ON public.property_private
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contact_requests cr
  WHERE cr.property_id = property_private.property_id
    AND cr.requester_id = auth.uid()
    AND cr.status = 'accepted'
));

-- 2) Price drop notifications
CREATE OR REPLACE FUNCTION public.notify_price_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.price < OLD.price THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT s.user_id, 'انخفاض في السعر',
           NEW.title || ' - أصبح ' || to_char(NEW.price, 'FM999999999') || ' جنيه بدلاً من ' || to_char(OLD.price, 'FM999999999'),
           '/property/' || NEW.id::text
    FROM public.subscriptions s
    WHERE s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at > now())
      AND s.user_id <> NEW.owner_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_property_price_drop
AFTER UPDATE OF price ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.notify_price_drop();

-- 3) Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_insert_own ON public.reports
FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid() AND NOT public.is_banned(auth.uid()));

CREATE POLICY reports_select_own_or_admin ON public.reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY reports_update_admin ON public.reports
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();