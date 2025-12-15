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

// Hadith collection patterns for sunnah.com
const HADITH_COLLECTIONS = [
  "bukhari",
  "muslim",
  "tirmidhi",
  "abudawud",
  "nasai",
  "ibnmajah",
  "malik",
  "ahmad",
  "darimi",
  "nawawi40",
  "qudsi40",
  "riyadussalihin",
  "adab",
  "bulugh",
  "mishkat",
  "hisn",
];

// Islamic source configurations
const ISLAMIC_SOURCES = {
  sunnah: {
    name: "Sunnah.com",
    searchUrl: (q: string) =>
      `https://sunnah.com/search?q=${encodeURIComponent(q)}`,
    baseUrl: "https://sunnah.com",
    selectors: {
      results: ".hadith_result, .search-result, .hadithContainer, .allresults",
      title: "h1, .hadithTitle, .chapter-title",
      content:
        ".hadithText, .text_details, .hadith-text, .arabic_text_details, .actualHadithContainer",
      // Match all hadith collection links
      links: HADITH_COLLECTIONS.map((c) => `a[href*="/${c}"]`).join(", "),
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
      // Match verse links like /2/255 or /4:103
      links: 'a[href^="/"][href*="/"]',
    },
  },
  daruliftaa: {
    name: "Darul Iftaa",
    searchUrl: (q: string) =>
      `https://daruliftaa.com/?s=${encodeURIComponent(q)}`,
    baseUrl: "https://daruliftaa.com",
    selectors: {
      results: ".post, .entry, article, .search-result",
      title: "h1, h2.entry-title, .post-title",
      content: ".entry-content, .post-content, article p, .answer",
      links: 'a[href*="daruliftaa.com"]',
    },
  },
  askimam: {
    name: "AskImam",
    searchUrl: (q: string) =>
      `https://askimam.org/public/search?keyword=${encodeURIComponent(q)}&page=1`,
    baseUrl: "https://askimam.org",
    selectors: {
      results: ".fatwa, .question-answer, .search-result, article",
      title: "h1, h2, .fatwa-title",
      content: ".answer, .fatwa-content, .response, p",
      links: 'a[href*="askimam.org"]',
    },
  },
  seekersguidance: {
    name: "SeekersGuidance",
    searchUrl: (q: string) =>
      `https://seekersguidance.org/answers/?search=${encodeURIComponent(q)}`,
    baseUrl: "https://seekersguidance.org",
    selectors: {
      results: ".post, article, .search-result, .answer-item",
      title: "h1, h2.entry-title, .post-title",
      content: ".entry-content, .post-content, article p, .answer-content",
      links: 'a[href*="seekersguidance.org/answers/"]',
    },
  },
};

// Generic source config for unknown domains
const GENERIC_SOURCE = {
  name: "Web",
  baseUrl: "",
  selectors: {
    results: "article, .post, .content, main, .entry",
    title: "h1, h2, .title, .post-title",
    content: "article p, .content p, main p, .post-content, .entry-content, p",
    links: "a[href]",
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

/**
 * Check if a URL is a direct content link (not a search/index page)
 */
function isDirectContentLink(url: string): boolean {
  // Skip search pages, pagination, and generic pages
  if (
    url.includes("/search") ||
    url.includes("?q=") ||
    url.includes("?s=") ||
    url.includes("?keyword=")
  ) {
    return false;
  }

  // Skip pagination
  if (/[?&]page=\d+/.test(url)) {
    return false;
  }

  // Sunnah.com: direct hadith links like /bukhari:123 or /muslim/1
  if (url.includes("sunnah.com")) {
    // Match collection:number or collection/number format
    const hadithPattern =
      /sunnah\.com\/(bukhari|muslim|tirmidhi|abudawud|nasai|ibnmajah|malik|ahmad|darimi|nawawi40|qudsi40|riyadussalihin|adab|bulugh|mishkat|hisn)[:/]\d+/;

    return hadithPattern.test(url);
  }

  // IslamQA: direct answer links
  if (url.includes("islamqa.info")) {
    return url.includes("/answers/") || url.includes("/fatwa/");
  }

  // Quran.com: direct verse links like /2/255
  if (url.includes("quran.com")) {
    const versePattern = /quran\.com\/\d+\/\d+/;

    return versePattern.test(url) || /quran\.com\/\d+:\d+/.test(url);
  }

  // Darul Iftaa: article links (not search or home)
  if (url.includes("daruliftaa.com")) {
    // Skip home, search, and category pages
    if (url === "https://daruliftaa.com" || url === "https://daruliftaa.com/") {
      return false;
    }

    // Articles typically have longer paths
    return url.split("/").length > 4;
  }

  // AskImam: fatwa/question links
  if (url.includes("askimam.org")) {
    return url.includes("/fatwa/") || url.includes("/question/");
  }

  // SeekersGuidance: answer links
  if (url.includes("seekersguidance.org")) {
    return url.includes("/answers/") && url.split("/").length > 5;
  }

  return true;
}

function extractLinks(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl: string,
): string[] {
  const links: string[] = [];

  // First, try specific selector
  $(selector).each((_, el) => {
    const href = $(el).attr("href");

    if (href) {
      try {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;

        // Only include links from the same domain that are direct content links
        if (
          fullUrl.includes(new URL(baseUrl).hostname) &&
          isDirectContentLink(fullUrl)
        ) {
          links.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  });

  // If we didn't find many direct content links, also check all links on page
  if (links.length < 5) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");

      if (href) {
        try {
          const fullUrl = href.startsWith("http")
            ? href
            : new URL(href, baseUrl).href;

          if (
            fullUrl.includes(new URL(baseUrl).hostname) &&
            isDirectContentLink(fullUrl)
          ) {
            links.push(fullUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });
  }

  // Return more links for thorough crawling
  return [...new Set(links)].slice(0, 30);
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
 * Format crawled pages into a research context string with numbered sources
 */
export function formatCrawlResultsForAI(pages: CrawledPage[]): string {
  if (pages.length === 0) {
    return "No relevant content was found during web crawling.";
  }

  const sections: string[] = [];

  // First, list all sources with numbers for easy citation
  sections.push("=== SOURCE INDEX (use these numbers for citations) ===");
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Skip search result pages, only show direct content URLs
    const isSearchPage =
      page.url.includes("/search") || page.url.includes("?q=");
    const urlNote = isSearchPage
      ? " (search page - cite specific hadith links from content instead)"
      : "";

    sections.push(`[${i + 1}] ${page.title} - ${page.url}${urlNote}`);
  }
  sections.push("\n");

  // Then, provide the full content
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    sections.push(`
=== SOURCE [${i + 1}]: ${page.source} ===
URL: ${page.url}
TITLE: ${page.title}
EXTRACTED LINKS FROM THIS PAGE (use these for citations when relevant):
${page.links.slice(0, 15).join("\n")}

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

/**
 * Get source config for a URL - returns generic config for unknown domains
 */
function getSourceConfig(url: string): typeof ISLAMIC_SOURCES.sunnah {
  if (url.includes("islamqa.info")) {
    return ISLAMIC_SOURCES.islamqa;
  } else if (url.includes("quran.com")) {
    return ISLAMIC_SOURCES.quran;
  } else if (url.includes("sunnah.com")) {
    return ISLAMIC_SOURCES.sunnah;
  } else if (url.includes("daruliftaa.com")) {
    return ISLAMIC_SOURCES.daruliftaa;
  } else if (url.includes("askimam.org")) {
    return ISLAMIC_SOURCES.askimam;
  } else if (url.includes("seekersguidance.org")) {
    return ISLAMIC_SOURCES.seekersguidance;
  }

  // Return generic config with the URL's base
  try {
    const urlObj = new URL(url);

    return {
      ...GENERIC_SOURCE,
      name: urlObj.hostname.replace("www.", ""),
      baseUrl: urlObj.origin,
    };
  } catch {
    return {
      ...GENERIC_SOURCE,
      name: "Web",
      baseUrl: "",
    };
  }
}

/**
 * Crawl a single URL - used for AI-directed exploration
 * Works with any domain, not just predefined Islamic sources
 */
export async function crawlUrl(
  url: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage | null> {
  const sourceConfig = getSourceConfig(url);

  onProgress?.({ type: "visiting", url, depth: 0 });

  const page = await crawlPage(url, sourceConfig, 0);

  if (page) {
    onProgress?.({ type: "found", url: page.url, title: page.title, depth: 0 });
  } else {
    onProgress?.({ type: "error", url, message: "Failed to fetch" });
  }

  return page;
}

/**
 * Search Google for Islamic content and extract result URLs
 */
export async function googleSearch(
  query: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];

  // Search Google with Islamic context
  const searchQuery = `${query} islamic ruling fatwa hadith`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;

  onProgress?.({ type: "visiting", url: googleUrl, depth: 0 });

  const response = await rateLimitedFetch(googleUrl);

  if (!response || !response.ok) {
    onProgress?.({
      type: "error",
      url: googleUrl,
      message: "Google search failed",
    });

    return pages;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract search result URLs - try multiple patterns
  const resultUrls: string[] = [];

  // Pattern 1: /url?q= format (older Google)
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");

    if (href && href.startsWith("/url?q=")) {
      const match = href.match(/\/url\?q=([^&]+)/);

      if (match) {
        try {
          const decodedUrl = decodeURIComponent(match[1]);

          if (isValidExternalUrl(decodedUrl)) {
            resultUrls.push(decodedUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  });

  // Pattern 2: Direct href links that look like search results
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr("href");

    if (href && isValidExternalUrl(href)) {
      resultUrls.push(href);
    }
  });

  // Pattern 3: data-href attributes
  $("[data-href]").each((_, el) => {
    const href = $(el).attr("data-href");

    if (href && isValidExternalUrl(href)) {
      resultUrls.push(href);
    }
  });

  // Pattern 4: Look in cite elements (Google shows URLs there)
  $("cite").each((_, el) => {
    const text = $(el).text().trim();

    if (text.startsWith("http")) {
      if (isValidExternalUrl(text)) {
        resultUrls.push(text);
      }
    } else if (text.includes(".")) {
      // Try to construct URL from domain
      const url = `https://${text.split(" ")[0]}`;

      try {
        new URL(url);
        if (isValidExternalUrl(url)) {
          resultUrls.push(url);
        }
      } catch {
        // Not a valid URL
      }
    }
  });

  const uniqueUrls = [...new Set(resultUrls)];

  onProgress?.({
    type: "found",
    url: googleUrl,
    title: `Google Search: Found ${uniqueUrls.length} results`,
    depth: 0,
  });

  // Crawl the first few result pages
  const urlsToCrawl = uniqueUrls.slice(0, 8);

  for (const url of urlsToCrawl) {
    const page = await crawlUrl(url, onProgress);

    if (page) {
      pages.push(page);
    }
  }

  return pages;
}

/**
 * Check if URL is valid external URL (not Google, social media, etc.)
 */
function isValidExternalUrl(url: string): boolean {
  if (!url.startsWith("http")) return false;

  const blockedDomains = [
    "google.com",
    "google.",
    "youtube.com",
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "tiktok.com",
    "linkedin.com",
    "reddit.com",
    "pinterest.com",
    "gstatic.com",
    "googleapis.com",
    "accounts.google",
  ];

  return !blockedDomains.some((domain) => url.includes(domain));
}

/**
 * Crawl multiple URLs in parallel - used for AI-directed exploration
 */
export async function crawlUrls(
  urls: string[],
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];

  // Crawl sequentially to respect rate limits
  for (const url of urls) {
    const page = await crawlUrl(url, onProgress);

    if (page) {
      pages.push(page);
    }
  }

  return pages;
}

/**
 * Get all unique links from crawled pages
 */
export function getAllLinks(pages: CrawledPage[]): string[] {
  const allLinks = new Set<string>();
  const visitedUrls = new Set(pages.map((p) => p.url));

  for (const page of pages) {
    for (const link of page.links) {
      if (!visitedUrls.has(link)) {
        allLinks.add(link);
      }
    }
  }

  return Array.from(allLinks);
}

/**
 * Create a summary of crawled pages for AI analysis
 */
export function summarizeCrawledPages(pages: CrawledPage[]): string {
  if (pages.length === 0) {
    return "No pages crawled yet.";
  }

  return pages
    .map(
      (p, i) =>
        `[${i + 1}] ${p.source} - ${p.title}\n    URL: ${p.url}\n    Content preview: ${p.content.slice(0, 300)}...`,
    )
    .join("\n\n");
}

/**
 * Format available links for AI to choose from
 */
export function formatAvailableLinks(
  links: string[],
  maxLinks: number = 20,
): string {
  if (links.length === 0) {
    return "No additional links available to explore.";
  }

  return links
    .slice(0, maxLinks)
    .map((link, i) => `[${i + 1}] ${link}`)
    .join("\n");
}

/**
 * Initial search - get search results from all Islamic sources
 */
export async function initialSearch(
  query: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];

  for (const [, source] of Object.entries(ISLAMIC_SOURCES)) {
    const searchUrl = source.searchUrl(query);

    onProgress?.({ type: "visiting", url: searchUrl, depth: 0 });

    const page = await crawlPage(searchUrl, source, 0);

    if (page) {
      pages.push(page);
      onProgress?.({
        type: "found",
        url: page.url,
        title: page.title,
        depth: 0,
      });
    } else {
      onProgress?.({
        type: "error",
        url: searchUrl,
        message: "Failed to fetch",
      });
    }
  }

  return pages;
}

/**
 * Search with a specific query on all sources
 */
export async function searchQuery(
  query: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  return initialSearch(query, onProgress);
}
