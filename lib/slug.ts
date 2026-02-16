/**
 * Generate a URL-friendly slug from a query string.
 * Keeps Arabic and all Unicode letters — only strips punctuation/special chars.
 */
export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      // Replace whitespace with hyphens
      .replace(/\s+/g, "-")
      // Keep Unicode letters (\p{L}), digits (\p{N}), and hyphens
      .replace(/[^\p{L}\p{N}-]/gu, "")
      // Collapse multiple hyphens
      .replace(/-{2,}/g, "-")
      // Trim leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Truncate to ~80 chars at word boundary
      .slice(0, 80)
      .replace(/-+$/, "")
  );
}

/**
 * Append an HHMMSS timestamp suffix to make a slug unique.
 */
export function appendTimestamp(slug: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${slug}-${hh}${mm}${ss}`;
}
