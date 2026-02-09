import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Capture a DOM element and download it as a paginated PDF.
 */
export async function exportResponseAsPdf(
  element: HTMLElement,
  query: string,
): Promise<void> {
  // Temporarily force light background for print readability
  const prev = element.style.cssText;
  element.style.backgroundColor = "#ffffff";
  element.style.color = "#1a1a1a";
  element.classList.add("pdf-capture");

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // A4 dimensions in mm
    const pageW = 210;
    const pageH = 297;
    const margin = 12;
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;

    // Scale canvas to fit page width
    const imgW = contentW;
    const imgH = (canvas.height * contentW) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let yOffset = 0;

    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();

      // Slice the canvas for this page
      const sliceH = Math.min(contentH, imgH - yOffset);
      const srcH = (sliceH / imgH) * canvas.height;
      const srcY = (yOffset / imgH) * canvas.height;

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.ceil(srcH);
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        Math.floor(srcY),
        canvas.width,
        Math.ceil(srcH),
        0,
        0,
        canvas.width,
        Math.ceil(srcH),
      );

      const pageData = pageCanvas.toDataURL("image/png");
      pdf.addImage(pageData, "PNG", margin, margin, imgW, sliceH);

      yOffset += contentH;
    }

    // Generate filename from query
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join("-");

    pdf.save(`ithbat-${slug || "response"}.pdf`);
  } finally {
    element.style.cssText = prev;
    element.classList.remove("pdf-capture");
  }
}
