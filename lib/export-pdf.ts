import { jsPDF } from "jspdf";

// ─── Layout (A4) ─────────────────────────────────
const PG = { w: 210, h: 297, m: 20 };
const CW = PG.w - PG.m * 2;

// ─── Colors (RGB) ────────────────────────────────
const C = {
  text: [38, 38, 38] as const,
  heading: [18, 18, 18] as const,
  muted: [128, 128, 128] as const,
  link: [30, 90, 170] as const,
  qBg: [245, 245, 247] as const,
  qBorder: [180, 180, 185] as const,
  qText: [48, 48, 48] as const,
  rule: [222, 222, 222] as const,
  srcPill: [235, 235, 238] as const,
  srcText: [90, 90, 95] as const,
};

// ─── Inline segment ──────────────────────────────
type Seg = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: string;
};

// ─── Parse inline markdown/HTML → segments ───────
function parseInline(raw: string): Seg[] {
  // Strip Arabic spans (Helvetica can't render Arabic)
  let src = raw.replace(
    /<span[^>]*class="quran-arabic"[^>]*>[^<]*<\/span>/gi,
    "",
  );

  const segs: Seg[] = [];
  const re =
    /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)]+)\))|(<u>(.+?)<\/u>)|(<term[^>]*>(.+?)<\/term>)|(<[^>]+>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) segs.push({ text: src.slice(last, m.index) });
    if (m[1]) segs.push({ text: m[2], bold: true });
    else if (m[3]) segs.push({ text: m[4], link: m[5] });
    else if (m[6]) segs.push({ text: m[7], bold: true, underline: true });
    else if (m[8]) segs.push({ text: m[9], italic: true });
    // Other HTML tags: skip silently
    last = m.index + m[0].length;
  }
  if (last < src.length) segs.push({ text: src.slice(last) });
  return segs.filter((s) => s.text.length > 0);
}

// Strip ALL formatting to plain text (for measurement)
function plain(t: string): string {
  return t
    .replace(/<span[^>]*class="quran-arabic"[^>]*>[^<]*<\/span>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

// Extract domain from URL
function domain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

// ─── Export ──────────────────────────────────────
export async function exportResponseAsPdf(
  content: string,
  query: string,
): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  let y = PG.m;

  function ensure(needed: number) {
    if (y + needed > PG.h - PG.m) {
      pdf.addPage();
      y = PG.m;
    }
  }

  // ── Rich-text renderer (word-wrap with mixed bold/italic/link) ──
  function rich(
    segs: Seg[],
    opts: {
      x0?: number;
      maxW?: number;
      size?: number;
      lh?: number;
      color?: readonly [number, number, number];
      italic?: boolean;
    } = {},
  ) {
    const x0 = opts.x0 ?? PG.m;
    const maxW = opts.maxW ?? CW;
    const size = opts.size ?? 10.5;
    const lh = opts.lh ?? size * 0.5;
    const baseColor = opts.color ?? C.text;
    const endX = x0 + maxW;
    let x = x0;

    pdf.setFontSize(size);

    for (const seg of segs) {
      const bold = seg.bold ?? false;
      const italic = seg.italic ?? opts.italic ?? false;
      const style =
        bold && italic
          ? "bolditalic"
          : bold
            ? "bold"
            : italic
              ? "italic"
              : "normal";
      const color = seg.link ? C.link : baseColor;
      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      pdf.setTextColor(...color);

      // Split by spaces, keeping space tokens separate for proper measurement
      const parts = seg.text.split(/( +)/);
      for (const part of parts) {
        if (!part) continue;
        const pw = pdf.getTextWidth(part);

        // Wrap if this word exceeds line (but not whitespace-only or first word)
        if (x + pw > endX && x > x0 && part.trim()) {
          y += lh;
          ensure(lh);
          x = x0;
          if (!part.trim()) continue;
        }

        if (part.trim()) {
          if (seg.link) {
            pdf.textWithLink(part, x, y, { url: seg.link });
          } else {
            pdf.text(part, x, y);
          }

          if (seg.underline) {
            pdf.setDrawColor(...color);
            pdf.setLineWidth(0.25);
            pdf.line(x, y + 0.7, x + pw, y + 0.7);
          }
        }

        x += pw;
      }
    }

    y += lh;
  }

  // ── Draw a source pill (rounded capsule with favicon-style dot + domain) ──
  function drawSourcePill(
    url: string,
    label: string,
    cx: number,
    cy: number,
  ): number {
    const dom = domain(url);
    const displayText = label || dom || "Source";

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const textW = pdf.getTextWidth(displayText);
    const dotR = 1.2;
    const padX = 4;
    const padY = 2.2;
    const gap = 2;
    const pillW = padX + dotR * 2 + gap + textW + padX;
    const pillH = padY * 2 + 3;
    const pillX = cx - pillW / 2;
    const pillY = cy - pillH / 2;

    // Pill background
    pdf.setFillColor(...C.srcPill);
    pdf.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, "F");

    // Favicon dot (colored circle)
    const dotCx = pillX + padX + dotR;
    const dotCy = cy + 0.3;
    pdf.setFillColor(...C.qBorder);
    pdf.circle(dotCx, dotCy, dotR, "F");

    // Domain text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.srcText);
    const textX = dotCx + dotR + gap;
    pdf.text(displayText, textX, cy + 1);

    // Make the entire pill clickable
    if (url) {
      pdf.link(pillX, pillY, pillW, pillH, { url });
    }

    return pillW;
  }

  // ── Blockquote renderer (box with background, padding, source pill) ──
  function renderBlockquote(quoteRaw: string, attrRaw: string) {
    const padX = 8;
    const padY = 6;
    const borderW = 1.5;
    const innerX = PG.m + borderW + padX;
    const innerW = CW - borderW - padX * 2;

    // Measure quote text
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    const qLines = pdf.splitTextToSize(plain(quoteRaw), innerW);
    const qLh = 4.8;
    let boxH = padY * 2 + qLines.length * qLh;

    // Extract source link from attribution
    const linkMatch = attrRaw.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const sourceLabel = linkMatch ? linkMatch[1] : "";
    const sourceUrl = linkMatch ? linkMatch[2] : "";
    const attrPlain = plain(attrRaw);

    // Measure attribution text (above the pill)
    let aLines: string[] = [];
    const aLh = 4;
    // Strip the link part from attribution for text display
    const attrDisplay = attrPlain
      .replace(sourceLabel, "")
      .replace(/\|\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (attrDisplay) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      aLines = pdf.splitTextToSize(attrDisplay, innerW);
      boxH += 4 + aLines.length * aLh;
    }

    // Space for source pill (overlaps bottom edge)
    const hasPill = !!sourceUrl;
    const pillOverlap = hasPill ? 5 : 0;

    ensure(boxH + pillOverlap + 12);
    y += 5;

    const boxTop = y;

    // Background fill
    pdf.setFillColor(...C.qBg);
    pdf.roundedRect(PG.m, boxTop, CW, boxH, 3, 3, "F");

    // Left accent border
    pdf.setFillColor(...C.qBorder);
    pdf.roundedRect(PG.m, boxTop, borderW, boxH, 0.75, 0.75, "F");

    // Render quote text (italic, inside box with padding)
    y = boxTop + padY + qLh * 0.65;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(...C.qText);
    for (const line of qLines) {
      pdf.text(line, innerX, y);
      y += qLh;
    }

    // Attribution text (smaller, muted, inside box)
    if (aLines.length > 0) {
      y += 1;
      // Thin separator
      pdf.setDrawColor(215, 215, 218);
      pdf.setLineWidth(0.15);
      pdf.line(innerX, y, innerX + innerW, y);
      y += 3;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.muted);
      for (const line of aLines) {
        pdf.text(line, innerX, y);
        y += aLh;
      }
    }

    y = boxTop + boxH;

    // Source pill — centered, overlapping the bottom edge of the box
    if (hasPill) {
      const pillCx = PG.m + CW / 2;
      const pillCy = y - 0.5;
      drawSourcePill(sourceUrl, sourceLabel, pillCx, pillCy);
      y += pillOverlap + 2;
    } else {
      y += 5;
    }
  }

  // ─── Main loop ─────────────────────────────────
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // ── Blockquote ──
    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const quoteParts: string[] = [];
      const attrParts: string[] = [];
      for (const line of buf) {
        const t = line.trim();
        if (t.startsWith("\u2014") || t.startsWith("—")) attrParts.push(t);
        else if (t) quoteParts.push(t);
      }
      renderBlockquote(quoteParts.join(" "), attrParts.join(" "));
      continue;
    }

    // ── Heading (any level: #–######, with or without space) ──
    const hMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
    if (hMatch) {
      const lvl = hMatch[1].length;
      const txt = hMatch[2];
      const sz = [18, 14, 12, 11, 10.5, 10][lvl - 1] ?? 10;

      y += lvl <= 2 ? 6 : 4;
      ensure(sz + 6);

      // Headings render bold, with inline formatting preserved
      const headSegs = parseInline(txt).map((s) => ({ ...s, bold: true }));
      rich(headSegs, { size: sz, lh: sz * 0.5, color: C.heading });

      if (lvl === 2) {
        pdf.setDrawColor(...C.rule);
        pdf.setLineWidth(0.2);
        pdf.line(PG.m, y, PG.w - PG.m, y);
        y += 3;
      } else {
        y += 1;
      }

      i++;
      continue;
    }

    // ── Empty line ──
    if (!trimmed) {
      y += 2;
      i++;
      continue;
    }

    // ── List item ──
    const liMatch = trimmed.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (liMatch) {
      const marker = /^\d/.test(liMatch[1]) ? liMatch[1] : "\u2022";
      const text = liMatch[2];
      ensure(6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10.5);
      pdf.setTextColor(...C.text);
      pdf.text(marker, PG.m + 2, y);
      rich(parseInline(text), { x0: PG.m + 7, maxW: CW - 7 });
      y += 1;
      i++;
      continue;
    }

    // ── Attribution (outside blockquote) ──
    if (trimmed.startsWith("\u2014") || trimmed.startsWith("—")) {
      rich(parseInline(trimmed), {
        size: 9,
        lh: 4,
        color: C.muted,
        x0: PG.m + 7,
        maxW: CW - 7,
        italic: true,
      });
      y += 2;
      i++;
      continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}$/.test(trimmed)) {
      y += 3;
      ensure(4);
      pdf.setDrawColor(...C.rule);
      pdf.setLineWidth(0.3);
      pdf.line(PG.m, y, PG.w - PG.m, y);
      y += 4;
      i++;
      continue;
    }

    // ── Regular paragraph (with rich inline formatting) ──
    rich(parseInline(trimmed), {});
    y += 2;
    i++;
  }

  // ─── Footer ────────────────────────────────────
  y += 6;
  ensure(8);
  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.15);
  pdf.line(PG.m, y, PG.w - PG.m, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text(
    "Consult a qualified scholar for personal rulings",
    PG.m,
    y,
  );

  // ─── Save ──────────────────────────────────────
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("-");

  pdf.save(`ithbat-${slug || "response"}.pdf`);
}
