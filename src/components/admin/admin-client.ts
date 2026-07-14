export function normalizeAdminSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[,%()":\\]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 100);
}
