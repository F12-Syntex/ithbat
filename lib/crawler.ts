// Local web crawler for Islamic sources
// IMPORTANT: Only searches sites defined in lib/traverser/sites/*.json
import type { SiteTraversal, RenderingConfig } from "./traverser/types";

import * as cheerio from "cheerio";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

import {
  loadSiteConfig,
  getDomain,
  extractContent as traverserExtract,
  findContentLinks as traverserFindLinks,
  extractSearchResults as traverserExtractSearchResults,
  isSearchPage as traverserIsSearchPage,
  loadAllSiteConfigs,
  getSiteSummary,
  getMetadataDescriptions,
  isTrustedSource,
  getSearchUrl,
} from "./traverser";

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
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
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
 * Uses rendering config from sites.json for wait times
 */
async function crawlWithPuppeteer(
  url: string,
  renderingConfig?: RenderingConfig,
  isSearchPage: boolean = false,
): Promise<{
  html: string;
  title: string;
} | null> {
  const browser = await getBrowser();

  if (!browser) return null;

  let page: Page | null = null;

  // Get wait times from config or use defaults
  const waitTime = isSearchPage
    ? (renderingConfig?.searchWaitTime ?? renderingConfig?.waitTime ?? 3000)
    : (renderingConfig?.waitTime ?? 2000);
  const waitForSelector = renderingConfig?.waitForSelector;

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
      timeout: 30000,
    });

    // Wait for specific selector if configured
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: waitTime });
      } catch {
        // Selector not found, continue with time-based wait
        console.log(
          `[Puppeteer] Selector ${waitForSelector} not found, using time-based wait`,
        );
      }
    }

    // Wait configured time for lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, waitTime));

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
 * Check if a site requires JavaScript rendering based on config
 */
function needsJavaScript(config: SiteTraversal | null): boolean {
  return config?.rendering?.requiresJavaScript ?? false;
}

/**
 * Crawl a page - try fast fetch first, use Puppeteer for JS-heavy sites
 * Uses rendering config from sites.json for wait times and JS detection
 */
async function smartCrawl(
  url: string,
  config: SiteTraversal | null,
  isSearchPage: boolean = false,
): Promise<{
  html: string;
  title: string;
} | null> {
  const requiresJS = needsJavaScript(config);

  // For JS-heavy sites, go straight to Puppeteer
  if (requiresJS) {
    console.log(`[Puppeteer] ${config?.domain} requires JavaScript rendering`);

    return await crawlWithPuppeteer(url, config?.rendering, isSearchPage);
  }

  // For non-JS sites, use fast fetch
  const response = await rateLimitedFetch(url);

  if (response && response.ok) {
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").text() || $("h1").first().text() || "";

    // Check if we got meaningful content
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    // If fetch got decent content (>2000 chars), use it
    if (bodyText.length > 2000) {
      return { html, title };
    }

    // For sites with minimal content, try Puppeteer as fallback
    if (bodyText.length < 2000) {
      console.log(
        `[Puppeteer fallback] ${url} - fetch got only ${bodyText.length} chars`,
      );
      const puppeteerResult = await crawlWithPuppeteer(
        url,
        config?.rendering,
        isSearchPage,
      );

      if (puppeteerResult && puppeteerResult.html.length > html.length) {
        return puppeteerResult;
      }
    }

    // Return fetch result even if small (better than nothing)
    return { html, title };
  }

  // Fetch failed completely - try Puppeteer as last resort
  return await crawlWithPuppeteer(url, config?.rendering, isSearchPage);
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

// ============================================
// TRUSTED SITES ONLY - from lib/traverser/sites/*.json
// ============================================
// NO hardcoded sources - everything comes from the traverser configs
// To add a new site, use: yarn traverse analyze <url>

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

/**
 * Crawl a page using traverser config exclusively
 * Only crawls sites that have a config in lib/traverser/sites.json
 */
async function crawlPage(
  url: string,
  depth: number,
): Promise<CrawledPage | null> {
  const domain = getDomain(url);
  const config = loadSiteConfig(domain);

  // Only crawl trusted sites with traverser configs
  if (!config) {
    console.warn(`[Crawler] Skipping untrusted domain: ${domain}`);

    return null;
  }

  // Check if this is a search page - affects rendering wait times
  const isSearch = traverserIsSearchPage(url, config);

  // Use smartCrawl with config for proper rendering handling
  const crawlResult = await smartCrawl(url, config, isSearch);

  if (!crawlResult) {
    return null;
  }

  const html = crawlResult.html;

  // Use traverser for extraction
  const extracted = traverserExtract(html, url, config);

  // For search pages, use extractSearchResults to get result links
  // For content pages, use findContentLinks to get related links
  const contentLinks = isSearch
    ? traverserExtractSearchResults(html, config)
    : traverserFindLinks(html, url, config);

  return {
    url,
    title: extracted.title || "Untitled Page",
    content: extracted.content.slice(0, 8000),
    links: contentLinks,
    depth,
    source: config.name,
    timestamp: Date.now(),
  };
}

/**
 * Crawl all trusted Islamic sources from traverser configs
 * Uses lib/traverser/sites/*.json exclusively
 */
export async function* crawlIslamicSources(
  query: string,
  maxDepth: number = 2,
  maxPages: number = 10,
): AsyncGenerator<CrawlProgress, CrawlResult> {
  const startTime = Date.now();
  const visitedUrls = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: string[] = [];
  const queue: { url: string; depth: number; domain: string }[] = [];

  // Load all trusted site configs from traverser
  const siteConfigs = loadAllSiteConfigs();

  if (siteConfigs.length === 0) {
    console.warn("[Crawler] No site configs found in lib/traverser/sites/");
    yield { type: "complete" };

    return {
      pages: [],
      visitedUrls: [],
      errors: ["No trusted site configurations found"],
      totalTime: Date.now() - startTime,
    };
  }

  // Add search pages from all trusted sources to queue
  for (const config of siteConfigs) {
    const searchUrl = getSearchUrl(query, config);

    queue.push({ url: searchUrl, depth: 0, domain: config.domain });
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

    const page = await crawlPage(current.url, current.depth);

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
              domain: current.domain,
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
 * Get trusted sites context for AI - describes available sources and how to use them
 */
export function getTrustedSitesContext(): string {
  const configs = loadAllSiteConfigs();

  if (configs.length === 0) {
    return "No trusted site configurations available.";
  }

  const sections = [
    "=== TRUSTED ISLAMIC SOURCES ===",
    "The following sites are configured as trusted sources. Use their specific URLs for citations.",
    "",
  ];

  for (const config of configs) {
    sections.push(getSiteSummary(config));
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Get metadata context for a specific site - helps AI understand extracted fields
 */
export function getSiteMetadataContext(url: string): string {
  const domain = getDomain(url);
  const config = loadSiteConfig(domain);

  if (!config) {
    return "";
  }

  const descriptions = getMetadataDescriptions(config);
  const lines = [
    `\n[${config.name} - Field Descriptions]`,
    `Evidence Type: ${config.evidenceTypes.join(", ")}`,
  ];

  for (const [field, description] of Object.entries(descriptions)) {
    lines.push(`  - ${field}: ${description}`);
  }

  if (config.extraction.contentNotes) {
    lines.push(`Content Notes: ${config.extraction.contentNotes}`);
  }

  if (config.aiNotes) {
    lines.push(`AI Notes: ${config.aiNotes}`);
  }

  return lines.join("\n");
}

/**
 * Enhance crawled page with site context
 */
export function enhancePageWithContext(page: CrawledPage): CrawledPage & {
  siteContext?: string;
  evidenceType?: string;
  isTrusted: boolean;
} {
  const domain = getDomain(page.url);
  const config = loadSiteConfig(domain);

  return {
    ...page,
    siteContext: config ? getSiteMetadataContext(page.url) : undefined,
    evidenceType: config?.evidenceTypes[0],
    isTrusted: isTrustedSource(domain),
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

  // Add trusted sites context at the beginning
  const trustedContext = getTrustedSitesContext();

  sections.push(trustedContext);
  sections.push("\n");

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

  // Then, provide the full content with site-specific context
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const isSearchPage =
      page.url.includes("/search") ||
      page.url.includes("?q=") ||
      page.url.includes("?s=");

    // Get site-specific context for trusted sources
    const siteContext = getSiteMetadataContext(page.url);
    const domain = getDomain(page.url);
    const trusted = isTrustedSource(domain);

    sections.push(`
=== SOURCE: ${page.source}${trusted ? " [TRUSTED]" : ""} ===
PAGE URL: ${page.url}${isSearchPage ? " (SEARCH PAGE - DO NOT CITE THIS URL)" : " (can cite)"}
TITLE: ${page.title}
${siteContext}

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
 * Uses traverser configs exclusively
 */
export async function quickSearch(
  query: string,
): Promise<{ pages: CrawledPage[]; visitedUrls: string[] }> {
  const pages: CrawledPage[] = [];
  const visitedUrls: string[] = [];

  // Load all trusted site configs from traverser
  const siteConfigs = loadAllSiteConfigs();

  for (const config of siteConfigs) {
    const searchUrl = getSearchUrl(query, config);

    visitedUrls.push(searchUrl);

    const page = await crawlPage(searchUrl, 0);

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
 * Crawl a single URL - used for AI-directed exploration
 * Only crawls trusted sites with traverser configs
 */
export async function crawlUrl(
  url: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage | null> {
  const domain = getDomain(url);

  // Check if this is a trusted site
  if (!isTrustedSource(domain)) {
    onProgress?.({
      type: "error",
      url,
      message: `Skipping untrusted domain: ${domain}`,
    });

    return null;
  }

  onProgress?.({ type: "visiting", url, depth: 0 });

  const page = await crawlPage(url, 0);

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
 * Initial search - get search results from all trusted Islamic sources
 * Uses traverser configs exclusively - crawls THROUGH search pages to get actual content
 */
export async function initialSearch(
  query: string,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const crawledUrls = new Set<string>();

  // Load all trusted site configs from traverser
  const siteConfigs = loadAllSiteConfigs();

  if (siteConfigs.length === 0) {
    console.warn("[Crawler] No site configs found in lib/traverser/sites/");

    return pages;
  }

  for (const config of siteConfigs) {
    const searchUrl = getSearchUrl(query, config);

    onProgress?.({ type: "visiting", url: searchUrl, depth: 0 });

    const searchPage = await crawlPage(searchUrl, 0);

    if (searchPage) {
      // DON'T add search page itself - it has no real content
      // Instead, crawl the actual content links from the search results

      // Filter to only direct content links (not more search pages)
      const contentLinks = searchPage.links.filter(isDirectContentLink);

      onProgress?.({
        type: "found",
        url: searchPage.url,
        title: `Found ${contentLinks.length} results from ${config.name}`,
        depth: 0,
      });

      // Crawl up to 5 content pages from each source
      for (const link of contentLinks.slice(0, 5)) {
        if (crawledUrls.has(link)) continue;
        crawledUrls.add(link);

        onProgress?.({ type: "visiting", url: link, depth: 1 });

        const contentPage = await crawlPage(link, 1);

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
