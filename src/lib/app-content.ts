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
