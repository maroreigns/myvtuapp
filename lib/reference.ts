export function createReference(prefix: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${prefix}-${date}-${random}`;
}
