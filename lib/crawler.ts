// Local web crawler for Islamic sources
import * as cheerio from "cheerio";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  depth: number;
  source: string;
  timestamp: number;
}

// ============================================
// Puppeteer-based crawler for JavaScript-heavy sites
// ============================================

// Singleton browser instance
let browserInstance: Browser | null = null;
let browserInitializing = false;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser | null> {
  if (browserInstance) {
    try {
      // Check if browser is still connected
      if (browserInstance.connected) {
        return browserInstance;
      }
    } catch {
      browserInstance = null;
    }
  }

  if (browserInitializing) {
    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return browserInstance;
  }

  browserInitializing = true;

  try {
    // Try to find Chrome/Chromium
    const possiblePaths = [
      // Windows
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA +
        "\\Google\\Chrome\\Application\\chrome.exe",
      // macOS
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      // Linux
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];

    let executablePath: string | undefined;

    for (const path of possiblePaths) {
      try {
        const fs = await import("fs");

        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!executablePath) {
      console.warn("Chrome not found, falling back to fetch-based crawling");
      browserInitializing = false;
      return null;
    }

    browserInstance = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    browserInitializing = false;
    return browserInstance;
  } catch (error) {
    console.warn("Failed to launch browser:", error);
    browserInitializing = false;
    return null;
  }
}

/**
 * Crawl a page using Puppeteer (for JavaScript-rendered content)
 */
async function crawlWithPuppeteer(url: string): Promise<{
  html: string;
  title: string;
} | null> {
  const browser = await getBrowser();

  if (!browser) return null;

  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Navigate and wait for content to load
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    // Wait a bit more for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the rendered HTML
    const html = await page.content();
    const title = await page.title();

    return { html, title };
  } catch (error) {
    console.warn(`Puppeteer failed for ${url}:`, error);
    return null;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Sites that require JavaScript rendering
 */
const JS_RENDERED_SITES = ["sunnah.com", "quran.com"];

/**
 * Check if a URL requires JavaScript rendering
 */
function needsJavaScript(url: string): boolean {
  return JS_RENDERED_SITES.some((site) => url.includes(site));
}

/**
 * Crawl a page - uses Puppeteer for JS sites, fetch for others
 */
async function smartCrawl(url: string): Promise<{
  html: string;
  title: string;
} | null> {
  if (needsJavaScript(url)) {
    // Try Puppeteer first
    const puppeteerResult = await crawlWithPuppeteer(url);

    if (puppeteerResult && puppeteerResult.html.length > 1000) {
      return puppeteerResult;
    }

    // Fall back to fetch if Puppeteer fails
  }

  // Use regular fetch
  const response = await rateLimitedFetch(url);

  if (!response || !response.ok) return null;

  const html = await response.text();
  const $ = cheerio.load(html);
  const title = $("title").text() || $("h1").first().text() || "";

  return { html, title };
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
      results: ".hadith_result, .search-result, .hadithContainer, .allresults, [class*='hadith'], [class*='result']",
      title: "h1, .hadithTitle, .chapter-title, .collection-title",
      // More comprehensive content selectors for sunnah.com
      content:
        ".hadithText, .text_details, .hadith-text, .arabic_text_details, .actualHadithContainer, .englishcontainer, .arabic_hadith_full, .hadith_narrated, .hadith-body, [class*='hadith'], [class*='text'], .chapter_hadith",
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
      results: ".search-result, .article-item, .fatwa-item, [class*='result'], [class*='article']",
      title: "h1, .fatwa-title, .article-title, [class*='title']",
      // More comprehensive selectors for islamqa.info
      content: ".fatwa-content, .article-content, .answer-text, .content-body, .question-text, [class*='content'], [class*='answer'], [class*='text'], article p, main p, .entry-content",
      links: 'a[href*="/answers/"], a[href*="/fatwa/"], a[href*="/en/"]',
    },
  },
  quran: {
    name: "Quran.com",
    searchUrl: (q: string) =>
      `https://quran.com/search?q=${encodeURIComponent(q)}`,
    baseUrl: "https://quran.com",
    selectors: {
      results: ".search-result, [class*='SearchResult'], [class*='result']",
      title: "h1, [class*='ChapterName'], [class*='surah'], [class*='Title']",
      // More comprehensive selectors for quran.com
      content: "[class*='Translation'], [class*='verse'], .verse-text, [class*='text'], [class*='ayah'], [class*='quran'], [class*='arabic']",
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
  alim: {
    name: "Alim.org",
    searchUrl: (q: string) =>
      `https://www.alim.org/search-results/?s=${encodeURIComponent(q)}&page=1`,
    baseUrl: "https://www.alim.org",
    selectors: {
      results: ".search-result, article, .post, .content-item",
      title: "h1, h2, .entry-title, .post-title",
      content: ".entry-content, .post-content, article p, .content, p",
      links: 'a[href*="alim.org"]',
    },
  },
  islamweb: {
    name: "IslamWeb",
    searchUrl: (q: string) =>
      `https://www.islamweb.net/en/?page=websearch&srchsett=0&myRange=25&exact=0&extended=0&synonym=0&stxt=${encodeURIComponent(q)}&type=7`,
    baseUrl: "https://www.islamweb.net",
    selectors: {
      results: ".fatwa-item, .search-result, .result-item, article, .content",
      title: "h1, h2, .fatwa-title, .title",
      content: ".fatwa-content, .answer, .content-body, article p, p",
      links:
        'a[href*="islamweb.net/en/fatwa/"], a[href*="islamweb.net/en/article/"]',
    },
  },
};

// Generic source config for unknown domains
const GENERIC_SOURCE = {
  name: "Web",
  searchUrl: (q: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(q)}`,
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
  const seen = new Set<string>();

  elements.each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");

    // Lower threshold to 10 chars and avoid duplicates
    if (text && text.length > 10 && !seen.has(text)) {
      seen.add(text);
      texts.push(text);
    }
  });

  return texts.join("\n\n").slice(0, 10000);
}

/**
 * Compress page content to reduce token count while preserving key information
 * Removes boilerplate, navigation text, and compresses whitespace
 */
export function compressPageContent(content: string): string {
  // Remove common boilerplate phrases
  const boilerplate = [
    /cookie(s)? (policy|consent|notice)/gi,
    /privacy policy/gi,
    /terms (of|and) (service|use|conditions)/gi,
    /subscribe to our newsletter/gi,
    /follow us on (twitter|facebook|instagram)/gi,
    /share (this|on)/gi,
    /click here/gi,
    /read more/gi,
    /log ?in/gi,
    /sign ?up/gi,
    /create (an )?account/gi,
    /advertisement/gi,
    /sponsored/gi,
    /related (articles|posts|content)/gi,
    /comments? \(\d+\)/gi,
    /leave a (comment|reply)/gi,
    /\d+ (views|shares|likes)/gi,
    /posted (on|by|in)/gi,
    /copyright \d{4}/gi,
    /all rights reserved/gi,
  ];

  let compressed = content;

  for (const pattern of boilerplate) {
    compressed = compressed.replace(pattern, "");
  }

  // Compress multiple newlines/spaces
  compressed = compressed
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{3,}/g, " ")
    .trim();

  return compressed;
}

/**
 * Format multiple pages into a compressed summary for AI analysis
 */
export function formatPagesForAIAnalysis(pages: CrawledPage[]): string {
  return pages
    .map((page, i) => {
      const compressed = compressPageContent(page.content);
      // Limit each page to 1500 chars for bulk analysis
      const truncated = compressed.slice(0, 1500);
      return `[PAGE ${i + 1}] ${page.source} - ${page.title}
URL: ${page.url}
CONTENT:
${truncated}${compressed.length > 1500 ? "..." : ""}
---`;
    })
    .join("\n\n");
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

  // IslamWeb: fatwa and article links
  if (url.includes("islamweb.net")) {
    return url.includes("/fatwa/") || url.includes("/article/");
  }

  return true;
}

function extractLinks(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl: string,
): string[] {
  const links: string[] = [];

  // For sunnah.com, extract ALL hadith links aggressively
  if (baseUrl.includes("sunnah.com")) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");

      if (!href) return;

      try {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).href;

        // Match hadith links like /bukhari:123 or /muslim/1
        if (/sunnah\.com\/[a-z]+[:/]\d+/.test(fullUrl)) {
          links.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Return early if we found hadith links
    if (links.length > 0) {
      return [...new Set(links)].slice(0, 50);
    }
  }

  // For quran.com, extract verse links aggressively
  if (baseUrl.includes("quran.com")) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");

      if (!href) return;

      try {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, "https://quran.com").href;

        // Match verse links like /2/255 or /4/93 (surah/ayah format)
        if (/quran\.com\/\d+\/\d+/.test(fullUrl)) {
          links.push(fullUrl);
        }
        // Also match /surah-name/ayah format
        else if (/quran\.com\/[a-z-]+\/\d+/.test(fullUrl.toLowerCase())) {
          links.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Return early if we found verse links
    if (links.length > 0) {
      return [...new Set(links)].slice(0, 50);
    }
  }

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
  // Use smartCrawl for JavaScript-heavy sites (sunnah.com, quran.com)
  const crawlResult = await smartCrawl(url);

  if (!crawlResult) {
    return null;
  }

  const html = crawlResult.html;
  const $ = cheerio.load(html);

  // Remove scripts, styles, and navigation
  $("script, style, nav, footer, header, aside, .sidebar, .menu, .navigation, .nav, .footer, .header, .cookie, .popup, .modal, .ad, .advertisement").remove();

  // Extract title
  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled Page";

  // Extract main content - try multiple strategies
  let content = "";

  // Strategy 1: Try specific selectors first
  content = extractTextContent($, sourceConfig.selectors.content);

  // Strategy 2: Fallback to main content areas
  if (!content || content.length < 100) {
    content = extractTextContent($, "main, article, .content, #content, .post-content, .entry-content, .article-content");
  }

  // Strategy 3: Look for any div with substantial content
  if (!content || content.length < 100) {
    content = extractTextContent($, "div[class*='content'], div[class*='text'], div[class*='body'], div[class*='article']");
  }

  // Strategy 4: Get all paragraphs
  if (!content || content.length < 100) {
    content = extractTextContent($, "p");
  }

  // Strategy 5: Last resort - get all text from body
  if (!content || content.length < 100) {
    content = $("body").text().trim().replace(/\s+/g, " ").slice(0, 8000);
  }

  // Extract links for further crawling
  const links = extractLinks($, "a[href]", sourceConfig.baseUrl);

  return {
    url,
    title,
    content: content.slice(0, 8000), // Increased from 6000
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

  // Collect ALL specific hadith/article links for easy reference
  const specificLinks: string[] = [];

  for (const page of pages) {
    for (const link of page.links) {
      // Only include direct content links (not search pages)
      if (isSpecificContentUrl(link)) {
        specificLinks.push(link);
      }
    }
  }
  const uniqueSpecificLinks = [...new Set(specificLinks)];

  // CRITICAL: Show specific citation URLs FIRST
  sections.push("=== SPECIFIC URLS FOR CITATIONS (USE THESE!) ===");
  sections.push(
    "IMPORTANT: Only cite these specific URLs, NEVER cite search URLs!",
  );
  sections.push("");

  if (uniqueSpecificLinks.length > 0) {
    uniqueSpecificLinks.slice(0, 50).forEach((link, i) => {
      sections.push(`[${i + 1}] ${link}`);
    });
  } else {
    sections.push(
      "(No specific hadith/article links found - use article URLs from content below)",
    );
  }
  sections.push("\n");

  // Then, provide the full content
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const isSearchPage =
      page.url.includes("/search") ||
      page.url.includes("?q=") ||
      page.url.includes("?s=");

    sections.push(`
=== SOURCE: ${page.source} ===
PAGE URL: ${page.url}${isSearchPage ? " (SEARCH PAGE - DO NOT CITE THIS URL)" : " (can cite)"}
TITLE: ${page.title}

SPECIFIC LINKS FOUND ON THIS PAGE (cite these instead of search URL):
${page.links.filter(isSpecificContentUrl).slice(0, 20).join("\n") || "(none found)"}

CONTENT:
${page.content}
---
`);
  }

  return sections.join("\n");
}

/**
 * Check if URL is a specific content page (not search/index)
 */
function isSpecificContentUrl(url: string): boolean {
  // Reject search pages
  if (
    url.includes("/search") ||
    url.includes("?q=") ||
    url.includes("?s=") ||
    url.includes("?keyword=")
  ) {
    return false;
  }

  // Sunnah.com: specific hadith like /bukhari:123 or /muslim/1
  if (url.includes("sunnah.com")) {
    return /sunnah\.com\/[a-z]+[:/]\d+/.test(url);
  }

  // IslamQA: specific answers
  if (url.includes("islamqa.info")) {
    return url.includes("/answers/") && /\/\d+/.test(url);
  }

  // Quran.com: specific verses like /2/255 or /25/11
  if (url.includes("quran.com")) {
    return /quran\.com\/\d+\/\d+/.test(url);
  }

  // IslamWeb: specific fatwas and articles
  if (url.includes("islamweb.net")) {
    return (
      (url.includes("/fatwa/") || url.includes("/article/")) &&
      /\/\d+/.test(url)
    );
  }

  // Other sites: must have meaningful path
  try {
    const path = new URL(url).pathname;

    return path.length > 10 && !path.endsWith("/");
  } catch {
    return false;
  }
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
  } else if (url.includes("islamweb.net")) {
    return ISLAMIC_SOURCES.islamweb;
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
 * Now crawls THROUGH search pages to get actual content
 */
export async function initialSearch(
  query: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const crawledUrls = new Set<string>();

  for (const [, source] of Object.entries(ISLAMIC_SOURCES)) {
    const searchUrl = source.searchUrl(query);

    onProgress?.({ type: "visiting", url: searchUrl, depth: 0 });

    const searchPage = await crawlPage(searchUrl, source, 0);

    if (searchPage) {
      // DON'T add search page itself - it has no real content
      // Instead, crawl the actual content links from the search results

      // Filter to only direct content links (not more search pages)
      const contentLinks = searchPage.links.filter(isDirectContentLink);

      onProgress?.({
        type: "found",
        url: searchPage.url,
        title: `Found ${contentLinks.length} results from ${source.name}`,
        depth: 0,
      });

      // Crawl up to 5 content pages from each source
      for (const link of contentLinks.slice(0, 5)) {
        if (crawledUrls.has(link)) continue;
        crawledUrls.add(link);

        onProgress?.({ type: "visiting", url: link, depth: 1 });

        const contentPage = await crawlPage(link, source, 1);

        if (contentPage && contentPage.content.length > 200) {
          pages.push(contentPage);
          onProgress?.({
            type: "found",
            url: contentPage.url,
            title: contentPage.title,
            depth: 1,
          });
        } else {
          onProgress?.({
            type: "error",
            url: link,
            message: "No content extracted",
          });
        }
      }
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
