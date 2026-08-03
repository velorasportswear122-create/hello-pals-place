CREATE OR REPLACE FUNCTION public.notify_property_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.owner_id,
      CASE NEW.status
        WHEN 'approved' THEN 'تم قبول إعلانك'
        WHEN 'rejected' THEN 'تم رفض إعلانك'
        ELSE 'تحديث حالة إعلانك'
      END,
      NEW.title,
      '/property/' || NEW.id::text
    );

    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      SELECT s.user_id,
             CASE NEW.section WHEN 'sale' THEN 'وحدة جديدة للبيع' ELSE 'وحدة جديدة للإيجار' END,
             NEW.title || ' - ' || NEW.city,
             '/property/' || NEW.id::text
      FROM public.subscriptions s
      WHERE s.status = 'active'
        AND (s.ends_at IS NULL OR s.ends_at > now())
        AND s.user_id <> NEW.owner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_property_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_property_status_changed ON public.properties;
CREATE TRIGGER on_property_status_changed
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.notify_property_status();

CREATE OR REPLACE FUNCTION public.notify_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'active' THEN 'تم تفعيل اشتراكك'
        WHEN 'expired' THEN 'انتهى اشتراكك'
        WHEN 'rejected' THEN 'تم رفض طلب الاشتراك'
        ELSE 'تحديث حالة الاشتراك'
      END,
      CASE NEW.status
        WHEN 'active' THEN 'تقدر دلوقتي تشوف كل التفاصيل وترسل طلبات تواصل.'
        ELSE COALESCE(NEW.payment_note, 'راجع صفحة الاشتراك للتفاصيل.')
      END,
      '/subscribe'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_subscription_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_subscription_status_changed ON public.subscriptions;
CREATE TRIGGER on_subscription_status_changed
AFTER UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_subscription_status();