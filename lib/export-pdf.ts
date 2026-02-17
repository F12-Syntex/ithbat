/**
 * Client-side: calls the server API to generate a PDF via Typst,
 * then triggers a browser download.
 */
export async function exportResponseAsPdf(
  content: string,
  query: string,
): Promise<void> {
  const res = await fetch("/api/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, query }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate PDF");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("-");

  const a = document.createElement("a");

  a.href = url;
  a.download = `ithbat-${slug || "response"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
