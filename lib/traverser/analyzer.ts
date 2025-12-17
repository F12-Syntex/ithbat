/**
 * AI Site Analyzer
 *
 * Uses AI to analyze a website's structure and generate a SiteTraversal config.
 * This allows automatic configuration of new Islamic knowledge sites.
 */

import type { SiteTraversal } from "./types";

import * as fs from "fs";
import * as path from "path";

import * as cheerio from "cheerio";

import { OpenRouterClient } from "../openrouter";

const SITES_DIR = path.join(__dirname, "sites");

/**
 * Prompt for AI to analyze site structure
 */
const SITE_ANALYSIS_PROMPT = `You are analyzing an Islamic knowledge website to understand how to navigate and extract content from it.

## WEBSITE DOMAIN:
{domain}

## SAMPLE PAGES CRAWLED:

### Page 1 - Homepage or Search Page:
URL: {url1}
HTML Structure (key elements):
{html1}

### Page 2 - Content Page (if found):
URL: {url2}
HTML Structure (key elements):
{html2}

### Page 3 - Another Page:
URL: {url3}
HTML Structure (key elements):
{html3}

## YOUR TASK:

Analyze these pages and create a navigation configuration. You need to identify:

1. **Search**: How to search this site
   - What's the search URL pattern? (look for search forms, /search?q=, etc.)
   - What CSS selector identifies search results?
   - What CSS selector gets the link from each result?

2. **Content Pages**: How to identify actual content pages vs index/search pages
   - What URL patterns indicate a content page? (e.g., /answers/\\d+, /bukhari:\\d+)
   - Look for patterns like /article/ID, /fatwa/ID, /collection/number, etc.

3. **Content Extraction**: How to extract the main content
   - What CSS selectors contain the title?
   - What CSS selectors contain the main content (hadith text, fatwa answer, article body)?
   - What metadata is available (author, date, category, hadith number, grade)?

4. **Navigation**: How to find related content links
   - What CSS selectors lead to other content pages?
   - What URL patterns should be excluded (pagination, login, about, etc.)?

## RESPOND WITH ONLY THIS JSON (no explanation):

{
  "domain": "{domain}",
  "name": "Site Name - Brief Description",
  "search": {
    "urlTemplate": "https://{domain}/search?q={query}",
    "resultSelector": "CSS selector for result items",
    "resultLinkSelector": "CSS selector for link within result"
  },
  "contentPage": {
    "urlPatterns": [
      "regex pattern 1 for content URLs",
      "regex pattern 2 if needed"
    ]
  },
  "extraction": {
    "title": ["selector1", "selector2"],
    "mainContent": ["selector1", "selector2", "selector3"],
    "metadata": {
      "key1": "selector",
      "key2": "selector"
    }
  },
  "navigation": {
    "relatedLinks": ["selector1", "selector2"],
    "excludePatterns": ["/search", "?q=", "/about", "/login"]
  }
}`;

/**
 * Simplify HTML for AI analysis - remove scripts, styles, keep structure
 */
function simplifyHtml(html: string, maxLength: number = 3000): string {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, svg, path, noscript, iframe, img").remove();

  // Get body content
  const body = $("body");

  // Extract key structural elements
  const elements: string[] = [];

  // Get forms (for search detection)
  $("form").each((_, el) => {
    const action = $(el).attr("action") || "";
    const method = $(el).attr("method") || "get";
    const inputs = $(el)
      .find("input")
      .map((_, inp) => {
        const name = $(inp).attr("name") || "";
        const type = $(inp).attr("type") || "text";

        return `<input name="${name}" type="${type}">`;
      })
      .get()
      .join("");

    elements.push(
      `<form action="${action}" method="${method}">${inputs}</form>`,
    );
  });

  // Get main content areas with class/id info
  $(
    "main, article, .content, .post, .article, .fatwa, .hadith, .answer, [class*='content'], [class*='result']",
  ).each((_, el) => {
    const tag = el.tagName;
    const classes = $(el).attr("class") || "";
    const id = $(el).attr("id") || "";
    const text = $(el).text().trim().slice(0, 200);

    elements.push(`<${tag} class="${classes}" id="${id}">${text}...</${tag}>`);
  });

  // Get links with patterns
  const linkPatterns = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";

    if (href.startsWith("/") && href.length > 1) {
      // Extract pattern (replace numbers with \\d+)
      const pattern = href
        .replace(/\/\d+/g, "/[NUM]")
        .replace(/:\d+/g, ":[NUM]");

      linkPatterns.add(pattern);
    }
  });
  elements.push(
    `\nLink Patterns Found:\n${[...linkPatterns].slice(0, 20).join("\n")}`,
  );

  // Get headings
  $("h1, h2, h3").each((_, el) => {
    const tag = el.tagName;
    const classes = $(el).attr("class") || "";
    const text = $(el).text().trim().slice(0, 100);

    elements.push(`<${tag} class="${classes}">${text}</${tag}>`);
  });

  const result = elements.join("\n").slice(0, maxLength);

  return result;
}

/**
 * Fetch a page with basic error handling
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;

    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Find a content page URL from a list of links
 */
function findContentPageUrl(html: string, domain: string): string | null {
  const $ = cheerio.load(html);
  const candidates: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";

    // Look for URLs that look like content pages (have numbers, specific paths)
    if (
      href.match(/\/\d+/) || // Has a number in path
      href.match(/:\d+/) || // Has :number format
      href.includes("/answers/") ||
      href.includes("/fatwa/") ||
      href.includes("/article/") ||
      href.includes("/hadith/")
    ) {
      if (href.startsWith("http")) {
        if (href.includes(domain)) candidates.push(href);
      } else if (href.startsWith("/")) {
        candidates.push(`https://${domain}${href}`);
      }
    }
  });

  return candidates[0] || null;
}

/**
 * Analyze a site and generate configuration
 */
export async function analyzeSite(
  baseUrl: string,
  onProgress?: (message: string) => void,
): Promise<SiteTraversal | null> {
  const log = onProgress || console.log;

  // Extract domain
  let domain: string;

  try {
    const urlObj = new URL(baseUrl);

    domain = urlObj.hostname.replace("www.", "");
  } catch {
    log(`Invalid URL: ${baseUrl}`);

    return null;
  }

  log(`Analyzing ${domain}...`);

  // Fetch homepage/base URL
  log(`Fetching: ${baseUrl}`);
  const html1 = await fetchPage(baseUrl);

  if (!html1) {
    log(`Failed to fetch ${baseUrl}`);

    return null;
  }

  // Try to find a search page
  const searchUrl = `https://${domain}/search?q=test`;

  log(`Fetching search page: ${searchUrl}`);
  const searchHtml = await fetchPage(searchUrl);

  // Try to find a content page
  log(`Looking for content page...`);
  const contentPageUrl = findContentPageUrl(html1, domain);
  let contentHtml: string | null = null;

  if (contentPageUrl) {
    log(`Fetching content page: ${contentPageUrl}`);
    contentHtml = await fetchPage(contentPageUrl);
  }

  // Prepare HTML samples for AI
  const simplified1 = simplifyHtml(html1);
  const simplified2 = searchHtml
    ? simplifyHtml(searchHtml)
    : "No search page found";
  const simplified3 = contentHtml
    ? simplifyHtml(contentHtml)
    : "No content page found";

  // Build prompt
  const prompt = SITE_ANALYSIS_PROMPT.replace(/{domain}/g, domain)
    .replace("{url1}", baseUrl)
    .replace("{html1}", simplified1)
    .replace("{url2}", searchUrl)
    .replace("{html2}", simplified2)
    .replace("{url3}", contentPageUrl || "N/A")
    .replace("{html3}", simplified3);

  // Call AI
  log(`Sending to AI for analysis...`);
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    log("Error: OPENROUTER_API_KEY environment variable not set");

    return null;
  }
  const client = new OpenRouterClient(apiKey);

  let response = "";

  for await (const chunk of client.streamChat(
    [
      {
        role: "system",
        content:
          "You are a web scraping expert. Analyze website structure and output ONLY valid JSON configuration. No explanations.",
      },
      { role: "user", content: prompt },
    ],
    "HIGH",
  )) {
    response += chunk;
  }

  // Parse JSON from response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      log(`Failed to extract JSON from AI response`);

      return null;
    }

    const config = JSON.parse(jsonMatch[0]) as SiteTraversal;

    // Validate required fields
    if (
      !config.domain ||
      !config.search ||
      !config.contentPage ||
      !config.extraction
    ) {
      log(`Invalid config structure from AI`);

      return null;
    }

    log(`Successfully generated config for ${config.name}`);

    return config;
  } catch (error) {
    log(`Failed to parse AI response: ${error}`);

    return null;
  }
}

/**
 * Save a site config to disk
 */
export function saveSiteConfig(config: SiteTraversal): string {
  // Ensure sites directory exists
  if (!fs.existsSync(SITES_DIR)) {
    fs.mkdirSync(SITES_DIR, { recursive: true });
  }

  const filePath = path.join(SITES_DIR, `${config.domain}.json`);

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));

  return filePath;
}

/**
 * Load existing site config
 */
export function loadSiteConfig(domain: string): SiteTraversal | null {
  const filePath = path.join(SITES_DIR, `${domain}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");

      return JSON.parse(data) as SiteTraversal;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * List all configured sites
 */
export function listConfiguredSites(): string[] {
  try {
    if (!fs.existsSync(SITES_DIR)) return [];

    return fs
      .readdirSync(SITES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}
