import { supabase } from "@/integrations/supabase/client";
import demoSaleApartment from "@/assets/demo-sale-apartment.jpg";
import demoRentApartment from "@/assets/demo-rent-apartment.jpg";
import demoSaleLand from "@/assets/demo-sale-land.jpg";
import demoRentFurnished from "@/assets/demo-rent-furnished.jpg";

const DEMO_MEDIA: Record<string, string> = {
  "demo/sale-apartment.jpg": demoSaleApartment,
  "demo/rent-apartment.jpg": demoRentApartment,
  "demo/sale-land.jpg": demoSaleLand,
  "demo/rent-furnished.jpg": demoRentFurnished,
};

export async function signedUrl(path: string) {
  if (DEMO_MEDIA[path]) return DEMO_MEDIA[path];
  const { data } = await supabase.storage.from("property-media").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}
