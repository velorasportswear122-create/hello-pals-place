import { supabase } from "@/integrations/supabase/client";

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("property-media").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}
