-- Security Hardening for Minya Real Estate App

-- 1. SUPA_anon_security_definer_function_executable & SUPA_authenticated_security_definer_function_executable
-- Revoke all execute on security definer functions from public, anon, and authenticated
-- This forces them to only be executable through the system (triggers, internal calls)
-- or specific GRANTS we explicitly define.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_subscribed(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_property_views(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contact_request() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contact_request_status() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_price_drop() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_property_status() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_subscription_status() FROM public, anon, authenticated;

-- Grant back necessary execute permissions for authenticated users where required by the UI/RPC
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscribed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_property_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;

-- 2. contact_requests_missing_delete_policy
-- Allow Admins to delete contact requests if needed.
CREATE POLICY contact_requests_delete_admin ON public.contact_requests
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. notifications_missing_insert_policy
-- Allow Admins to manually insert notifications if needed.
CREATE POLICY notifications_insert_admin ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. property_media_missing_update_policy
-- Allow owners and admins to update media metadata (like sort_order).
CREATE POLICY property_media_update_owner_admin ON public.property_media
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_media.property_id AND p.owner_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_media.property_id AND p.owner_id = auth.uid()));

-- 5. reports_missing_delete_policy
-- Allow Admins to delete resolved/invalid reports.
CREATE POLICY reports_delete_admin ON public.reports
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. subscriptions_missing_delete_policy
-- Allow Admins to delete subscription records (e.g., if created in error).
CREATE POLICY subscriptions_delete_admin ON public.subscriptions
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));