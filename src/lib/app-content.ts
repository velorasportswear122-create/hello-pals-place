export type Section = "sale" | "rent";

export const SECTION_LABEL: Record<Section, string> = {
  sale: "قسم التمليك",
  rent: "قسم الإيجار",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "أدمن",
  seller: "بائع",
  buyer: "مشتري",
  landlord: "مؤجر",
  tenant: "مستأجر",
};

export const SUBSCRIPTION_PRICE = 200;

export function formatEGP(value: number) {
  return new Intl.NumberFormat("ar-EG").format(value) + " جنيه";
}

/** عمولة المنصة */
export const COMMISSION = {
  saleRate: 0.01,
  saleLabel: "١٪ من قيمة البيع/الشراء",
  rentLabel: "نصف شهر إيجار",
};

export const PROPERTY_TYPES = [
  { value: "apartment", label: "شقة" },
  { value: "villa", label: "فيلا" },
  { value: "house", label: "بيت" },
  { value: "shop", label: "محل" },
  { value: "office", label: "مكتب/إداري" },
  { value: "land", label: "أرض" },
] as const;

export const FINISHING_TYPES = [
  { value: "super_lux", label: "سوبر لوكس" },
  { value: "lux", label: "لوكس" },
  { value: "semi_finished", label: "نصف تشطيب" },
  { value: "core_shell", label: "على الطوب" },
] as const;

export const LAND_TYPES = [
  { value: "building", label: "مباني" },
  { value: "agricultural", label: "زراعية" },
] as const;

export function labelOf(
  list: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return list.find((i) => i.value === value)?.label ?? "-";
}

export function commissionFor(section: Section, price: number) {
  if (section === "sale") return formatEGP(Math.round(price * COMMISSION.saleRate));
  return formatEGP(Math.round(price / 2));
}
