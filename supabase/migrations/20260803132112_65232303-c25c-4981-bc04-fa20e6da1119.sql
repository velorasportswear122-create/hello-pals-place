REVOKE EXECUTE ON FUNCTION public.notify_price_drop() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contact_request() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contact_request_status() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_property_status() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_subscription_status() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_property_views(uuid) FROM public, anon;