export type DetectedNetwork = "MTN" | "GLO" | "AIRTEL" | "NINE_MOBILE";

const prefixNetworks: Record<string, DetectedNetwork> = {
  "0803": "MTN",
  "0806": "MTN",
  "0703": "MTN",
  "0706": "MTN",
  "0810": "MTN",
  "0813": "MTN",
  "0814": "MTN",
  "0816": "MTN",
  "0903": "MTN",
  "0906": "MTN",
  "0913": "MTN",
  "0916": "MTN",
  "0805": "GLO",
  "0807": "GLO",
  "0705": "GLO",
  "0811": "GLO",
  "0815": "GLO",
  "0905": "GLO",
  "0915": "GLO",
  "0802": "AIRTEL",
  "0808": "AIRTEL",
  "0708": "AIRTEL",
  "0812": "AIRTEL",
  "0901": "AIRTEL",
  "0902": "AIRTEL",
  "0904": "AIRTEL",
  "0907": "AIRTEL",
  "0912": "AIRTEL",
  "0809": "NINE_MOBILE",
  "0817": "NINE_MOBILE",
  "0818": "NINE_MOBILE",
  "0908": "NINE_MOBILE",
  "0909": "NINE_MOBILE"
};

export function normalizeNigerianPhone(phone: string) {
  const compact = phone.replace(/\s+/g, "").replace(/[()-]/g, "");
  if (compact.startsWith("+234")) return `0${compact.slice(4)}`;
  if (compact.startsWith("234")) return `0${compact.slice(3)}`;
  return compact;
}

export function detectNetwork(phone: string): DetectedNetwork | null {
  const normalized = normalizeNigerianPhone(phone);
  if (normalized.length < 4) return null;
  return prefixNetworks[normalized.slice(0, 4)] || null;
}

export function phoneMatchesNetwork(phone: string, network: DetectedNetwork | string) {
  const detected = detectNetwork(phone);
  return !detected || detected === network;
}
