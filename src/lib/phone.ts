export const PHONE_DOMAIN = "dark-realestate.app";

/** يحوّل رقم الموبايل إلى معرّف داخلي ثابت لتسجيل الدخول بالرقم فقط */
export function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@${PHONE_DOMAIN}`;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidEgPhone(phone: string) {
  return /^01[0-25]\d{8}$/.test(normalizePhone(phone));
}
