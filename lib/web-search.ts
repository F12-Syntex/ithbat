// Free DuckDuckGo search using duck-duck-scrape
import DDG from "duck-duck-scrape";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

// Trusted Islamic source domains to prioritize
const TRUSTED_DOMAINS = [
  "quran.com",
  "sunnah.com",
  "islamqa.info",
  "islamweb.net",
  "seekersguidance.org",
  "aboutislam.net",
  "islamicstudies.info",
  "muslim.org",
];

export async function searchWeb(query: string): Promise<SearchResponse> {
  // Enhance query to focus on Islamic sources
  const islamicQuery = `${query} islamic quran hadith`;

  const searchResults = await DDG.search(islamicQuery, {
    safeSearch: DDG.SafeSearchType.STRICT,
  });

  const results: SearchResult[] = (searchResults.results || [])
    .slice(0, 10)
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
      };
    });

  return {
    results,
    query: islamicQuery,
  };
}

// Fetch and extract text content from a URL
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    // Basic HTML to text conversion
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    // Return first 4000 chars
    return text.slice(0, 4000);
  } catch {
    return "";
  }
}

// Check if a domain is trusted
export function isTrustedDomain(domain: string): boolean {
  return TRUSTED_DOMAINS.some(
    (trusted) => domain === trusted || domain.endsWith(`.${trusted}`)
  );
}
