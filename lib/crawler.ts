// Local web crawler for Islamic sources
import * as cheerio from "cheerio";

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  depth: number;
  source: string;
  timestamp: number;
}

export interface CrawlResult {
  pages: CrawledPage[];
  visitedUrls: string[];
  errors: string[];
  totalTime: number;
}

export interface CrawlProgress {
  type: "visiting" | "found" | "error" | "complete";
  url?: string;
  title?: string;
  depth?: number;
  message?: string;
}

// Islamic source configurations
const ISLAMIC_SOURCES = {
  sunnah: {
    name: "Sunnah.com",
    searchUrl: (q: string) =>
      `https://sunnah.com/search?q=${encodeURIComponent(q)}`,
    baseUrl: "https://sunnah.com",
    selectors: {
      results: ".hadith_result, .search-result, .hadithContainer",
      title: "h1, .hadithTitle, .chapter-title",
      content: ".hadithText, .text_details, .hadith-text, .arabic_text_details",
      links: 'a[href*="/hadith"], a[href*="/bukhari"], a[href*="/muslim"]',
    },
  },
  islamqa: {
    name: "IslamQA",
    searchUrl: (q: string) =>
      `https://islamqa.info/en/search?q=${encodeURIComponent(q)}`,
    baseUrl: "https://islamqa.info",
    selectors: {
      results: ".search-result, .article-item, .fatwa-item",
      title: "h1, .fatwa-title, .article-title",
      content: ".fatwa-content, .article-content, .answer-text, p",
      links: 'a[href*="/answers/"], a[href*="/fatwa/"]',
    },
  },
  quran: {
    name: "Quran.com",
    searchUrl: (q: string) =>
      `https://quran.com/search?q=${encodeURIComponent(q)}`,
    baseUrl: "https://quran.com",
    selectors: {
      results: ".search-result, [class*='SearchResult']",
      title: "h1, [class*='ChapterName']",
      content: "[class*='Translation'], [class*='verse'], .verse-text",
      links: 'a[href^="/"]',
    },
  },
};

// Rate limiting
const RATE_LIMIT_MS = 500;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest),
    );
  }
  lastRequestTime = Date.now();

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

    return response;
  } catch {
    return null;
  }
}

function extractTextContent($: cheerio.CheerioAPI, selector: string): string {
  const elements = $(selector);
  const texts: string[] = [];

  elements.each((_, el) => {
    const text = $(el).text().trim();

    if (text && text.length > 20) {
      texts.push(text);
    }
  });

  return texts.join("\n\n").slice(0, 8000);
}

function extractLinks(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl: string,
): string[] {
  const links: string[] = [];

  $(selector).each((_, el) => {
    const href = $(el).attr("href");

    if (href) {
      try {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;

        // Only include links from the same domain
        if (fullUrl.includes(new URL(baseUrl).hostname)) {
          links.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  });

  return [...new Set(links)].slice(0, 10);
}

async function crawlPage(
  url: string,
  sourceConfig: (typeof ISLAMIC_SOURCES)[keyof typeof ISLAMIC_SOURCES],
  depth: number,
): Promise<CrawledPage | null> {
  const response = await rateLimitedFetch(url);

  if (!response || !response.ok) {
    return null;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts, styles, and navigation
  $("script, style, nav, footer, header, aside, .sidebar, .menu").remove();

  // Extract title
  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled Page";

  // Extract main content
  let content = "";

  // Try specific selectors first
  content = extractTextContent($, sourceConfig.selectors.content);

  // Fallback to main/article/body
  if (!content || content.length < 100) {
    content = extractTextContent($, "main, article, .content, #content");
  }

  if (!content || content.length < 100) {
    content = extractTextContent($, "p");
  }

  // Extract links for further crawling
  const links = extractLinks($, "a[href]", sourceConfig.baseUrl);

  return {
    url,
    title,
    content: content.slice(0, 6000),
    links,
    depth,
    source: sourceConfig.name,
    timestamp: Date.now(),
  };
}

export async function* crawlIslamicSources(
  query: string,
  maxDepth: number = 2,
  maxPages: number = 10,
): AsyncGenerator<CrawlProgress, CrawlResult> {
  const startTime = Date.now();
  const visitedUrls = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: string[] = [];
  const queue: { url: string; depth: number; source: string }[] = [];

  // Add search pages from all sources to queue
  for (const [key, source] of Object.entries(ISLAMIC_SOURCES)) {
    const searchUrl = source.searchUrl(query);

    queue.push({ url: searchUrl, depth: 0, source: key });
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;

    if (visitedUrls.has(current.url)) continue;
    if (current.depth > maxDepth) continue;

    visitedUrls.add(current.url);

    yield {
      type: "visiting",
      url: current.url,
      depth: current.depth,
    };

    const sourceConfig =
      ISLAMIC_SOURCES[current.source as keyof typeof ISLAMIC_SOURCES];

    if (!sourceConfig) continue;

    const page = await crawlPage(current.url, sourceConfig, current.depth);

    if (page) {
      pages.push(page);

      yield {
        type: "found",
        url: page.url,
        title: page.title,
        depth: page.depth,
      };

      // Add child links to queue (only if we haven't reached max depth)
      if (current.depth < maxDepth) {
        for (const link of page.links) {
          if (!visitedUrls.has(link)) {
            queue.push({
              url: link,
              depth: current.depth + 1,
              source: current.source,
            });
          }
        }
      }
    } else {
      errors.push(`Failed to crawl: ${current.url}`);
      yield {
        type: "error",
        url: current.url,
        message: "Failed to fetch page",
      };
    }
  }

  yield { type: "complete" };

  return {
    pages,
    visitedUrls: Array.from(visitedUrls),
    errors,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Format crawled pages into a research context string
 */
export function formatCrawlResultsForAI(pages: CrawledPage[]): string {
  if (pages.length === 0) {
    return "No relevant content was found during web crawling.";
  }

  const sections: string[] = [];

  for (const page of pages) {
    sections.push(`
=== SOURCE: ${page.source} ===
URL: ${page.url}
TITLE: ${page.title}
CONTENT:
${page.content}
---
`);
  }

  return sections.join("\n");
}

/**
 * Quick search - just search pages, no deep crawling
 */
export async function quickSearch(
  query: string,
): Promise<{ pages: CrawledPage[]; visitedUrls: string[] }> {
  const pages: CrawledPage[] = [];
  const visitedUrls: string[] = [];

  for (const [, source] of Object.entries(ISLAMIC_SOURCES)) {
    const searchUrl = source.searchUrl(query);

    visitedUrls.push(searchUrl);

    const page = await crawlPage(searchUrl, source, 0);

    if (page) {
      pages.push(page);
    }
  }

  return { pages, visitedUrls };
}

/**
 * Deep search - recursive crawling with progress
 */
export async function deepSearch(
  query: string,
  depth: number = 2,
  maxPages: number = 10,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawlResult> {
  const generator = crawlIslamicSources(query, depth, maxPages);
  let result: IteratorResult<CrawlProgress, CrawlResult>;

  do {
    result = await generator.next();

    if (!result.done && onProgress) {
      onProgress(result.value);
    }
  } while (!result.done);

  return result.value;
}
