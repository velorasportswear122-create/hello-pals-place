CREATE TYPE public.request_status AS ENUM ('sent','reviewing','accepted','rejected');

ALTER TABLE public.contact_requests
  ADD COLUMN status public.request_status NOT NULL DEFAULT 'sent',
  ADD COLUMN admin_note text NOT NULL DEFAULT '',
  ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.contact_requests SET status = 'accepted' WHERE handled = true;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_contact_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_title text;
BEGIN
  SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.requester_id, 'تم إرسال طلب التواصل',
          'طلبك بخصوص «' || COALESCE(prop_title,'وحدة') || '» وصل للإدارة وحالته: مُرسل.',
          '/requests');

  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT ur.user_id, 'طلب تواصل جديد',
         'طلب جديد بخصوص «' || COALESCE(prop_title,'وحدة') || '».',
         '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END; $$;

CREATE TRIGGER on_contact_request_created
AFTER INSERT ON public.contact_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_request();

CREATE OR REPLACE FUNCTION public.notify_contact_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_title text;
  label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;

  label := CASE NEW.status
    WHEN 'sent' THEN 'مُرسل'
    WHEN 'reviewing' THEN 'قيد المراجعة'
    WHEN 'accepted' THEN 'مقبول'
    ELSE 'مرفوض'
  END;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.requester_id, 'تحديث حالة طلبك',
          'طلبك بخصوص «' || COALESCE(prop_title,'وحدة') || '» أصبح: ' || label ||
          CASE WHEN COALESCE(NEW.admin_note,'') <> '' THEN ' — ' || NEW.admin_note ELSE '' END,
          '/requests');

  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT ur.user_id, 'تحديث طلب تواصل',
         'تم تحديث طلب بخصوص «' || COALESCE(prop_title,'وحدة') || '» إلى: ' || label,
         '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END; $$;

CREATE TRIGGER on_contact_request_status_changed
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_request_status();