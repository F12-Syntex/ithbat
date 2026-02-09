import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Typst } = require("typst-raster") as { Typst: new () => TypstRenderer };

interface TypstRenderer {
  render(opts: { code: string; format: string }): Promise<Buffer>;
}

// ─── Convert markdown content → Typst markup ─────
function markdownToTypst(content: string, sources: Source[]): string {
  const lines = content.split("\n");
  const out: string[] = [];

  // Skip original Sources section
  let contentEnd = lines.length;
  for (let j = lines.length - 1; j >= 0; j--) {
    if (/^#{1,3}\s*Sources/i.test(lines[j].trim())) {
      contentEnd = j;
      break;
    }
  }

  let i = 0;
  while (i < contentEnd) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blockquote → "quoted text" [N] with attribution
    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < contentEnd && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }

      const quoteParts: string[] = [];
      let attrLine = "";
      for (const line of buf) {
        const t = line.trim();
        if (t.startsWith("\u2014") || t.startsWith("—")) attrLine = t;
        else if (t) quoteParts.push(t);
      }

      const quoteText = plainText(quoteParts.join(" ")).trim();
      if (!quoteText) continue;

      // Get ref number from attribution link
      const linkMatch = attrLine.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      let refTag = "";
      if (linkMatch) {
        const url = linkMatch[2].replace(/[)\].,;]+$/, "");
        const n = getRefNum(sources, url);
        if (n > 0) refTag = ` [${n}]`;
      }

      // Attribution text
      let attrText = plainText(attrLine)
        .replace(/^[—\u2014–-]\s*/, "")
        .replace(/\s*\|\s*$/, "")
        .trim();
      if (linkMatch) attrText = attrText.split("|")[0].trim();

      out.push("");
      out.push(`_"${escTypst(quoteText)}"${refTag}_`);
      if (attrText) {
        out.push(`#text(size: 9pt, fill: rgb("#888"))[--- ${escTypst(attrText)}]`);
      }
      out.push("");
      continue;
    }

    // Heading (any level)
    const hMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
    if (hMatch) {
      const lvl = hMatch[1].length;
      const txt = processInline(hMatch[2], sources);
      const eq = "=".repeat(lvl);
      out.push("");
      out.push(`${eq} ${txt}`);
      out.push("");
      i++;
      continue;
    }

    // Empty line
    if (!trimmed) {
      out.push("");
      i++;
      continue;
    }

    // List item
    const liMatch = trimmed.match(/^([-*])\s+(.+)$/);
    if (liMatch) {
      out.push(`- ${processInline(liMatch[2], sources)}`);
      i++;
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      out.push(`+ ${processInline(olMatch[1], sources)}`);
      i++;
      continue;
    }

    // Attribution (outside blockquote)
    if (trimmed.startsWith("\u2014") || trimmed.startsWith("—")) {
      out.push(
        `#text(size: 9pt, fill: rgb("#888"))[${escTypst(processLineToPlain(trimmed, sources))}]`,
      );
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}$/.test(trimmed)) {
      out.push("#line(length: 100%, stroke: 0.5pt + rgb(\"#ddd\"))");
      i++;
      continue;
    }

    // Regular paragraph
    out.push(processInline(trimmed, sources));
    i++;
  }

  return out.join("\n");
}

// ─── Process inline markdown → Typst inline ──────
function processInline(raw: string, sources: Source[]): string {
  // Strip Arabic spans and other HTML
  let out = raw
    .replace(/<span[^>]*class="quran-arabic"[^>]*>[^<]*<\/span>/gi, "")
    .replace(/<u>(.+?)<\/u>/g, "_$1_")
    .replace(/<term[^>]*>(.+?)<\/term>/g, "_$1_")
    .replace(/<[^>]+>/g, "");

  // Convert [text](url) → text [N] or #link("url")[text]
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_, label, url) => {
      const cleanUrl = url.replace(/[)\].,;]+$/, "");
      const n = getRefNum(sources, cleanUrl);
      return n > 0 ? `${label} [${n}]` : label;
    },
  );

  // **bold** → *bold* in Typst
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Escape remaining problematic Typst chars (but not * which we use for bold)
  // We need to be careful: # @ are special in Typst
  out = out.replace(/#(?![a-zA-Z])/g, "\\#");

  return out;
}

// Same as processInline but returns fully plain text
function processLineToPlain(raw: string, sources: Source[]): string {
  let out = plainText(raw);
  // Add ref numbers for any URLs that were in the original
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(raw)) !== null) {
    const url = m[2].replace(/[)\].,;]+$/, "");
    const n = getRefNum(sources, url);
    if (n > 0) {
      out = out.replace(m[1], `${m[1]} [${n}]`);
    }
  }
  return out;
}

function escTypst(t: string): string {
  return t.replace(/#(?![a-zA-Z])/g, "\\#").replace(/@/g, "\\@");
}

function plainText(t: string): string {
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

// ─── Source extraction ───────────────────────────
type Source = { url: string; label: string };

function extractSources(content: string): Source[] {
  const seen = new Map<string, Source>();
  let m: RegExpExecArray | null;

  const attrRe = /^>\s*[—\u2014].+?\[([^\]]+)\]\(([^)]+)\)/gm;
  while ((m = attrRe.exec(content)) !== null) {
    const url = m[2].replace(/[)\].,;]+$/, "");
    if (!seen.has(url)) seen.set(url, { url, label: m[1] });
  }

  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  while ((m = linkRe.exec(content)) !== null) {
    const url = m[2].replace(/[)\].,;]+$/, "");
    if (!seen.has(url)) seen.set(url, { url, label: m[1] });
  }

  return Array.from(seen.values());
}

function getRefNum(sources: Source[], url: string): number {
  const idx = sources.findIndex((s) => s.url === url);
  return idx >= 0 ? idx + 1 : 0;
}

// ─── Build full Typst document ───────────────────
function buildTypstDocument(
  content: string,
  sources: Source[],
): string {
  const body = markdownToTypst(content, sources);

  // Sources section
  let sourcesSection = "";
  if (sources.length > 0) {
    const items = sources
      .map((s, i) => {
        const dom = (() => {
          try {
            return new URL(s.url).hostname.replace("www.", "");
          } catch {
            return s.url;
          }
        })();
        return `[${i + 1}] #link("${s.url}")[${escTypst(s.label)}] --- ${escTypst(dom)}`;
      })
      .join("\\\n");

    sourcesSection = `
#v(12pt)
#line(length: 100%, stroke: 0.4pt + rgb("#ddd"))
#v(6pt)

== Sources

#text(size: 9pt, fill: rgb("#335"))[
${items}
]`;
  }

  return `
#set page(margin: 2.5cm)
#set text(font: "New Computer Modern", size: 11pt, fill: rgb("#1e1e1e"))
#set par(leading: 0.7em, justify: true)
#set heading(numbering: none)
#show heading.where(level: 1): set text(size: 16pt, weight: "bold")
#show heading.where(level: 2): it => {
  v(8pt)
  text(size: 13pt, weight: "bold")[#it.body]
  v(2pt)
  line(length: 100%, stroke: 0.3pt + rgb("#ddd"))
  v(4pt)
}
#show heading.where(level: 3): set text(size: 11.5pt, weight: "bold")
#show heading.where(level: 4): set text(size: 11pt, weight: "bold")

${body}

${sourcesSection}

#v(12pt)
#text(size: 8pt, style: "italic", fill: rgb("#999"))[Consult a qualified scholar for personal rulings]
`;
}

// ─── API Route ───────────────────────────────────
const renderer = new Typst();

export async function POST(request: NextRequest) {
  try {
    const { content, query } = await request.json();

    if (!content || !query) {
      return NextResponse.json(
        { error: "content and query are required" },
        { status: 400 },
      );
    }

    const sources = extractSources(content);
    const typstCode = buildTypstDocument(content, sources);

    const pdfBuffer = await renderer.render({
      code: typstCode,
      format: "pdf",
    });

    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join("-");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ithbat-${slug || "response"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
