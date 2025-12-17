import { NextRequest, NextResponse } from "next/server";
import {
  initialSearch,
  type CrawledPage,
} from "@/lib/crawler";
import { loadAllSiteConfigs, getSearchUrl } from "@/lib/traverser";

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
}

/**
 * Calculate relevance score between claim and found content
 */
function calculateRelevance(
  claim: string,
  content: string,
  title: string
): "high" | "medium" | "low" {
  const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const contentLower = (content + " " + title).toLowerCase();

  let matchCount = 0;
  for (const word of claimWords) {
    if (contentLower.includes(word)) {
      matchCount++;
    }
  }

  const matchRatio = claimWords.length > 0 ? matchCount / claimWords.length : 0;

  if (matchRatio > 0.5) return "high";
  if (matchRatio > 0.25) return "medium";
  return "low";
}

/**
 * Extract the most relevant snippet from content
 */
function extractRelevantSnippet(content: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const contentLower = content.toLowerCase();

  // Find the best starting position
  let bestPos = 0;
  let bestScore = 0;

  for (let i = 0; i < content.length - 200; i += 50) {
    const window = contentLower.slice(i, i + 300);
    let score = 0;
    for (const word of words) {
      if (window.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPos = i;
    }
  }

  // Extract snippet around best position
  const start = Math.max(0, bestPos);
  const end = Math.min(content.length, start + 300);
  let snippet = content.slice(start, end).trim();

  // Clean up snippet
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Build optimized search query based on claim type
 */
function buildSearchQuery(query: string, claimType: string): string {
  // Add type-specific keywords to improve search
  switch (claimType) {
    case "hadith":
      // Check if query already mentions hadith terms
      if (!/bukhari|muslim|tirmidhi|hadith|prophet|messenger/i.test(query)) {
        return `${query} hadith`;
      }
      break;
    case "quran":
      if (!/quran|surah|ayah|verse/i.test(query)) {
        return `${query} quran`;
      }
      break;
    case "scholar":
      if (!/fatwa|ruling|scholar|sheikh/i.test(query)) {
        return `${query} islamic ruling`;
      }
      break;
  }
  return query;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { query, claimType, originalClaim } = body;

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query too short" },
        { status: 400 }
      );
    }

    // Build optimized search query
    const searchQuery = buildSearchQuery(query.trim(), claimType);

    console.log(`[Verify] Searching for: "${searchQuery}" (type: ${claimType})`);

    // Search trusted sources
    const pages = await initialSearch(searchQuery, (progress) => {
      console.log(`[Verify] ${progress.type}: ${progress.url || progress.message || ""}`);
    });

    // Process results
    const results: VerificationResult[] = [];

    for (const page of pages) {
      // Skip pages with no meaningful content
      if (!page.content || page.content.length < 100) continue;

      // Calculate relevance
      const relevance = calculateRelevance(originalClaim, page.content, page.title);

      // Extract relevant snippet
      const snippet = extractRelevantSnippet(page.content, query);

      results.push({
        url: page.url,
        title: page.title || "Untitled",
        content: snippet,
        source: page.source,
        relevance,
      });
    }

    // Sort by relevance (high first)
    results.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.relevance] - order[b.relevance];
    });

    // Limit results
    const topResults = results.slice(0, 10);

    console.log(`[Verify] Found ${topResults.length} results`);

    return NextResponse.json({
      results: topResults,
      query: searchQuery,
      totalFound: results.length,
    });
  } catch (error) {
    console.error("[Verify] Error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
