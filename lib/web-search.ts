// Deep web search for Islamic sources
import DDG from "duck-duck-scrape";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  domain: string;
  type?: "quran" | "hadith" | "fatwa" | "article";
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  fromCache?: boolean;
  searchedSites: string[];
}

// Trusted Islamic source domains
const TRUSTED_DOMAINS = [
  "quran.com",
  "sunnah.com",
  "islamqa.info",
  "islamweb.net",
  "seekersguidance.org",
  "aboutislam.net",
];

// Rate limiting
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 1500;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search within a specific site using DuckDuckGo site: operator
 */
async function searchSite(
  query: string,
  site: string,
): Promise<SearchResult[]> {
  try {
    const siteQuery = `site:${site} ${query}`;
    const searchResults = await DDG.search(siteQuery, {
      safeSearch: DDG.SafeSearchType.STRICT,
    });

    return (searchResults.results || []).slice(0, 5).map((item) => {
      let domain = site;

      try {
        domain = new URL(item.url).hostname.replace("www.", "");
      } catch {
        // keep default
      }

      let type: SearchResult["type"];

      if (domain.includes("quran")) type = "quran";
      else if (domain.includes("sunnah")) type = "hadith";
      else if (domain.includes("islamqa")) type = "fatwa";
      else type = "article";

      return {
        title: item.title,
        link: item.url,
        snippet: item.description,
        domain,
        type,
      };
    });
  } catch (error) {
    console.error(`Search on ${site} failed:`, error);

    return [];
  }
}

/**
 * Main search function - searches multiple Islamic sites in parallel
 */
export async function searchWeb(query: string): Promise<SearchResponse> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;

  if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
    await delay(MIN_SEARCH_INTERVAL - timeSinceLastSearch);
  }
  lastSearchTime = Date.now();

  const searchedSites: string[] = [];
  const allResults: SearchResult[] = [];

  // Search primary Islamic sites in parallel
  const primarySites = ["sunnah.com", "islamqa.info", "quran.com"];

  try {
    const searchPromises = primarySites.map(async (site) => {
      searchedSites.push(site);

      return searchSite(query, site);
    });

    const results = await Promise.all(searchPromises);

    results.forEach((siteResults) => allResults.push(...siteResults));
  } catch (error) {
    console.error("Parallel search failed:", error);
  }

  // If we got few results, also do a general Islamic search
  if (allResults.length < 5) {
    try {
      const generalQuery = `${query} islamic ruling hadith quran`;
      const generalResults = await DDG.search(generalQuery, {
        safeSearch: DDG.SafeSearchType.STRICT,
      });

      const additional = (generalResults.results || [])
        .slice(0, 10)
        .filter((item) => {
          try {
            const domain = new URL(item.url).hostname.replace("www.", "");

            return TRUSTED_DOMAINS.some(
              (trusted) => domain === trusted || domain.includes(trusted),
            );
          } catch {
            return false;
          }
        })
        .map((item) => {
          let domain = "";

          try {
            domain = new URL(item.url).hostname.replace("www.", "");
          } catch {
            domain = item.url;
          }

          return {
            title: item.title,
            link: item.url,
            snippet: item.description,
            domain,
            type: "article" as const,
          };
        });

      allResults.push(...additional);
    } catch (error) {
      console.error("General search failed:", error);
    }
  }

  // Remove duplicates by URL
  const uniqueResults = allResults.filter(
    (result, index, self) =>
      index === self.findIndex((r) => r.link === result.link),
  );

  // Sort: prioritize sunnah.com and islamqa.info results
  uniqueResults.sort((a, b) => {
    const priority: Record<string, number> = {
      "sunnah.com": 1,
      "islamqa.info": 2,
      "quran.com": 3,
    };
    const aPriority = priority[a.domain] || 10;
    const bPriority = priority[b.domain] || 10;

    return aPriority - bPriority;
  });

  return {
    results: uniqueResults,
    query,
    searchedSites,
  };
}

/**
 * Fetch and extract text content from a URL
 */
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    // Extract main content more intelligently
    let text = html;

    // Remove scripts, styles, and non-content elements
    text = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    // Try to extract main content area
    let mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    if (!mainMatch) {
      mainMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    }
    if (!mainMatch) {
      mainMatch = text.match(
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      );
    }

    if (mainMatch) {
      text = mainMatch[1];
    }

    // Convert to plain text
    text = text
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
      .replace(/\s+/g, " ")
      .trim();

    // Return more content for better context
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}

/**
 * Check if a domain is trusted
 */
export function isTrustedDomain(domain: string): boolean {
  return TRUSTED_DOMAINS.some(
    (trusted) => domain === trusted || domain.endsWith(`.${trusted}`),
  );
}

/**
 * Generate direct search URLs for user reference
 */
export function getSearchUrls(query: string): {
  sunnah: string;
  islamqa: string;
  quran: string;
} {
  const encoded = encodeURIComponent(query);

  return {
    sunnah: `https://sunnah.com/search?q=${encoded}`,
    islamqa: `https://islamqa.info/en/search?q=${encoded}`,
    quran: `https://quran.com/search?q=${encoded}`,
  };
}
