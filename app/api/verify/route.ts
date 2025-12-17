import { NextRequest, NextResponse } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";

interface VerifyRequest {
  query: string;
  claimType: "hadith" | "quran" | "scholar" | "general";
  originalClaim: string;
}

interface VerificationResult {
  url: string;
  title: string;
  content: string;
  source: string;
  relevance: "high" | "medium" | "low";
  verified: boolean;
}

/**
 * Extract a meaningful title from URL path
 */
function extractTitleFromUrl(url: string, source: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    // Sunnah.com: /bukhari:1 or /bukhari/1
    if (source === "sunnah.com") {
      const hadithMatch = path.match(/\/(bukhari|muslim|tirmidhi|abudawud|nasai|ibnmajah|malik|ahmad|nawawi40|riyadussalihin)[:/](\d+)/i);
      if (hadithMatch) {
        const collection = hadithMatch[1].charAt(0).toUpperCase() + hadithMatch[1].slice(1);
        return `${collection} Hadith ${hadithMatch[2]}`;
      }
      // Try alternate format /collection/book/hadith
      const altMatch = path.match(/\/([a-z]+)\/(\d+)\/(\d+)/i);
      if (altMatch) {
        return `${altMatch[1].charAt(0).toUpperCase() + altMatch[1].slice(1)} ${altMatch[2]}:${altMatch[3]}`;
      }
    }

    // Quran.com: /2/255 or /2:255
    if (source === "quran.com") {
      const quranMatch = path.match(/\/(\d+)[:/](\d+)/);
      if (quranMatch) {
        return `Quran ${quranMatch[1]}:${quranMatch[2]}`;
      }
      const surahMatch = path.match(/\/(\d+)/);
      if (surahMatch) {
        return `Surah ${surahMatch[1]}`;
      }
    }

    // IslamQA: /en/answers/12345
    if (source === "islamqa.info") {
      const answerMatch = path.match(/\/answers\/(\d+)/);
      if (answerMatch) {
        return `IslamQA Answer #${answerMatch[1]}`;
      }
    }

    // Fallback: clean up the path
    const cleanPath = path.replace(/^\//, "").replace(/\//g, " > ").replace(/-/g, " ");
    if (cleanPath && cleanPath.length > 2) {
      return cleanPath.slice(0, 60);
    }

    return source;
  } catch {
    return source;
  }
}

/**
 * Build optimized search query based on claim type
 */
function buildSearchQuery(query: string, claimType: string): string {
  switch (claimType) {
    case "hadith":
      if (!/bukhari|muslim|tirmidhi|hadith|prophet|messenger/i.test(query)) {
        return `${query} hadith sunnah.com authentic`;
      }
      return `${query} sunnah.com authentic hadith`;
    case "quran":
      if (!/quran|surah|ayah|verse/i.test(query)) {
        return `${query} quran verse quran.com`;
      }
      return `${query} quran.com`;
    case "scholar":
      if (!/fatwa|ruling|scholar|sheikh/i.test(query)) {
        return `${query} islamic ruling islamqa`;
      }
      return `${query} islamqa fatwa`;
    default:
      return `${query} islamic source`;
  }
}

/**
 * Parse Perplexity response to extract sources and verification
 */
function parsePerplexityResponse(
  response: string,
  originalClaim: string,
): { results: VerificationResult[]; summary: string } {
  const results: VerificationResult[] = [];

  // Extract URLs from markdown links [text](url)
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  const seenUrls = new Set<string>();

  while ((match = linkPattern.exec(response)) !== null) {
    const title = match[1];
    // Clean up URL: remove trailing citation markers like [1], [2]
    const url = match[2].replace(/\[\d+\]$/, "");

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    // Extract domain for source
    let source = "web";
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      if (domain.includes("sunnah")) source = "sunnah.com";
      else if (domain.includes("quran")) source = "quran.com";
      else if (domain.includes("islamqa")) source = "islamqa.info";
      else source = domain;
    } catch {
      // Keep default
    }

    // Find surrounding context for this link (snippet)
    const linkIndex = response.indexOf(match[0]);
    const start = Math.max(0, linkIndex - 100);
    const end = Math.min(response.length, linkIndex + match[0].length + 200);
    let snippet = response.slice(start, end).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (start > 0) snippet = "..." + snippet;
    if (end < response.length) snippet = snippet + "...";

    // Calculate relevance based on trusted domains
    const isTrusted = ["sunnah.com", "quran.com", "islamqa.info", "islamweb.net"].some(d => url.includes(d));
    const relevance: "high" | "medium" | "low" = isTrusted ? "high" : "medium";

    results.push({
      url,
      title: title.slice(0, 100),
      content: snippet.slice(0, 300),
      source,
      relevance,
      verified: isTrusted,
    });
  }

  // Also look for plain URLs
  const plainUrlPattern = /(?<!\()https?:\/\/[^\s\)]+/g;
  while ((match = plainUrlPattern.exec(response)) !== null) {
    // Clean up URL: remove trailing punctuation and citation markers like [1], [2]
    const url = match[0].replace(/[.,;!?]+$/, "").replace(/\[\d+\]$/, "");
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    let source = "web";
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      if (domain.includes("sunnah")) source = "sunnah.com";
      else if (domain.includes("quran")) source = "quran.com";
      else if (domain.includes("islamqa")) source = "islamqa.info";
      else source = domain;
    } catch {
      continue;
    }

    const isTrusted = ["sunnah.com", "quran.com", "islamqa.info", "islamweb.net"].some(d => url.includes(d));

    results.push({
      url,
      title: extractTitleFromUrl(url, source),
      content: "Source found by search",
      source,
      relevance: isTrusted ? "high" : "low",
      verified: isTrusted,
    });
  }

  // Extract summary (first paragraph or response without links)
  const summary = response
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/g, "")
    .split("\n")[0]
    .slice(0, 500);

  return { results, summary };
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { query, claimType, originalClaim } = body;

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    const searchQuery = buildSearchQuery(query.trim(), claimType);

    console.log(`[Verify] Using Perplexity SEARCH for: "${searchQuery}"`);

    const client = getOpenRouterClient();

    // Use Perplexity SEARCH model for fast web search
    const prompt = `Verify this Islamic reference by searching authentic sources:

"${originalClaim}"

Search query: ${searchQuery}

Instructions:
1. Search for this reference on sunnah.com, quran.com, islamqa.info, and other authentic Islamic sources
2. Find the EXACT hadith/verse/fatwa if possible
3. Provide direct URLs to the sources
4. Confirm if the reference is authentic (sahih/hasan) or weak (daif)
5. Include the actual text from the source if found

Format your response with:
- Source URLs as markdown links
- Brief summary of what was found
- Authenticity grade if applicable`;

    let response = "";
    for await (const chunk of client.streamChat(
      [{ role: "user", content: prompt }],
      "SEARCH",
    )) {
      response += chunk;
    }

    const { results, summary } = parsePerplexityResponse(response, originalClaim);

    // Sort: trusted sources first
    results.sort((a, b) => {
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.relevance] - order[b.relevance];
    });

    console.log(`[Verify] Found ${results.length} sources via Perplexity`);

    return NextResponse.json({
      results: results.slice(0, 10),
      query: searchQuery,
      summary,
      totalFound: results.length,
    });
  } catch (error) {
    console.error("[Verify] Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
