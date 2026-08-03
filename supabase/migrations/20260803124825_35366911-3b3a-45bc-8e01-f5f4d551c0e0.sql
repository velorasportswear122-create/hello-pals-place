REVOKE ALL ON FUNCTION public.notify_contact_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_contact_request_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;