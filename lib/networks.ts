export const NETWORKS = [
  { value: "MTN", label: "MTN" },
  { value: "AIRTEL", label: "Airtel" },
  { value: "GLO", label: "Glo" },
  { value: "NINE_MOBILE", label: "9mobile" }
] as const;

export type NetworkValue = (typeof NETWORKS)[number]["value"];

export function networkLabel(value: string) {
  return NETWORKS.find((network) => network.value === value)?.label || value;
}
