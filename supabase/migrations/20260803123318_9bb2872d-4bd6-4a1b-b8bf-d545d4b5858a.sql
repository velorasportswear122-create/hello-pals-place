
CREATE POLICY "property_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-media' AND (public.is_subscribed(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "property_media_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "property_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
