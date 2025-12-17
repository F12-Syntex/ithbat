/**
 * Site Traverser
 *
 * A standardized system for navigating and extracting content from Islamic websites.
 * Loads JSON configs per site to determine how to search, identify content pages,
 * and extract relevant information.
 *
 * All sites in /sites/ are considered trusted Islamic knowledge sources.
 */

import type {
  SiteTraversal,
  ExtractedContent,
  TraverseResult,
  GenericConfig,
  EvidenceType,
  MetadataSchema,
} from "./types";

import * as fs from "fs";
import * as path from "path";

import * as cheerio from "cheerio";

// Cache for loaded site configs
const configCache: Map<string, SiteTraversal> = new Map();

// Path to site config files
const SITES_DIR = path.join(__dirname, "sites");

/**
 * Generic fallback config for unknown sites
 */
const GENERIC_CONFIG: GenericConfig = {
  extraction: {
    title: ["h1", "title", ".title", ".post-title", ".article-title"],
    mainContent: [
      "article",
      "main",
      ".content",
      ".post-content",
      ".article-content",
      ".entry-content",
      "p",
    ],
    metadata: {},
  },
  navigation: {
    relatedLinks: ["a[href]"],
    excludePatterns: [
      "/search",
      "?q=",
      "?s=",
      "/login",
      "/register",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
      "javascript:",
      "mailto:",
      "#",
    ],
  },
};

/**
 * Get domain from URL
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);

    return urlObj.hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/**
 * Load site config from JSON file
 */
export function loadSiteConfig(domain: string): SiteTraversal | null {
  // Check cache first
  if (configCache.has(domain)) {
    return configCache.get(domain)!;
  }

  // Try to load from file
  const configPath = path.join(SITES_DIR, `${domain}.json`);

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configData) as SiteTraversal;

      configCache.set(domain, config);

      return config;
    }
  } catch (error) {
    console.warn(`Failed to load config for ${domain}:`, error);
  }

  return null;
}

/**
 * Get all available site configs (all are trusted sources)
 */
export function getAvailableSites(): string[] {
  try {
    if (!fs.existsSync(SITES_DIR)) {
      return [];
    }

    return fs
      .readdirSync(SITES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * Load all site configs at once
 */
export function loadAllSiteConfigs(): SiteTraversal[] {
  const sites = getAvailableSites();
  const configs: SiteTraversal[] = [];

  for (const domain of sites) {
    const config = loadSiteConfig(domain);

    if (config) {
      configs.push(config);
    }
  }

  return configs;
}

/**
 * Get site summary for AI context
 */
export function getSiteSummary(config: SiteTraversal): string {
  const categories =
    config.categories?.map((c) => `- ${c.name}: ${c.description}`).join("\n") ||
    "No specific categories";

  return `
## ${config.name}
Domain: ${config.domain}
Languages: ${config.languages.join(", ")}
Evidence Types: ${config.evidenceTypes.join(", ")}

${config.description}

### Categories:
${categories}

### Search:
${config.search.searchTips || `Search URL: ${config.search.urlTemplate}`}

### AI Notes:
${config.aiNotes || "No specific notes"}
`.trim();
}

/**
 * Get all sites summary for AI context
 */
export function getAllSitesSummary(): string {
  const configs = loadAllSiteConfigs();

  return configs.map(getSiteSummary).join("\n\n---\n\n");
}

/**
 * Check if URL matches content page patterns
 */
export function isContentPage(url: string, config: SiteTraversal): boolean {
  for (const pattern of config.contentPage.urlPatterns) {
    const regex = new RegExp(pattern);

    if (regex.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Determine evidence type from URL and config
 */
export function getEvidenceType(
  url: string,
  config: SiteTraversal,
): EvidenceType | undefined {
  // If site only has one evidence type, return that
  if (config.evidenceTypes.length === 1) {
    return config.evidenceTypes[0];
  }

  // Check URL patterns for hints
  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes("/hadith") ||
    lowerUrl.includes("bukhari") ||
    lowerUrl.includes("muslim") ||
    lowerUrl.includes("tirmidhi") ||
    (lowerUrl.includes(":") && config.domain === "sunnah.com")
  ) {
    return "hadith";
  }

  if (
    lowerUrl.includes("/quran") ||
    lowerUrl.includes("/surah") ||
    (/\/\d+\/\d+/.test(lowerUrl) && config.domain === "quran.com")
  ) {
    return "quran";
  }

  if (lowerUrl.includes("/tafsir") || lowerUrl.includes("exegesis")) {
    return "tafsir";
  }

  if (lowerUrl.includes("/fatwa") || lowerUrl.includes("/answers")) {
    return "fatwa";
  }

  if (lowerUrl.includes("/fiqh") || lowerUrl.includes("/ruling")) {
    return "fiqh";
  }

  // Return first evidence type as default
  return config.evidenceTypes[0];
}

/**
 * Build search URL from config template
 */
export function getSearchUrl(query: string, config: SiteTraversal): string {
  return config.search.urlTemplate.replace(
    "{query}",
    encodeURIComponent(query),
  );
}

/**
 * Extract text using selectors in priority order
 */
function extractWithSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string {
  for (const selector of selectors) {
    const elements = $(selector);

    if (elements.length > 0) {
      const texts: string[] = [];

      elements.each((_, el) => {
        const text = $(el).text().trim();

        if (text.length > 10) {
          texts.push(text);
        }
      });
      if (texts.length > 0) {
        return texts.join("\n\n");
      }
    }
  }

  return "";
}

/**
 * Extract metadata using the new MetadataSchema format
 */
function extractMetadata(
  $: cheerio.CheerioAPI,
  metadataConfig?: Record<string, MetadataSchema> | Record<string, string>,
): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (!metadataConfig) return metadata;

  for (const [key, config] of Object.entries(metadataConfig)) {
    // Handle both old format (string selector) and new format (MetadataSchema)
    const selector = typeof config === "string" ? config : config.selector;

    const text = $(selector).first().text().trim();

    if (text) {
      metadata[key] = text;
    }
  }

  return metadata;
}

/**
 * Get metadata field descriptions for AI understanding
 */
export function getMetadataDescriptions(
  config: SiteTraversal,
): Record<string, string> {
  const descriptions: Record<string, string> = {};

  for (const [key, schema] of Object.entries(config.extraction.metadata)) {
    if (typeof schema === "object" && schema.description) {
      descriptions[key] = schema.description;
    }
  }

  return descriptions;
}

/**
 * Find content links on a page
 */
export function findContentLinks(
  html: string,
  url: string,
  config: SiteTraversal,
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const baseUrl = `https://${config.domain}`;

  // Extract links using config selectors
  for (const selector of config.navigation.relatedLinks) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");

      if (!href) return;

      // Build full URL
      let fullUrl: string;

      try {
        if (href.startsWith("http")) {
          fullUrl = href;
        } else if (href.startsWith("/")) {
          fullUrl = baseUrl + href;
        } else {
          fullUrl = new URL(href, url).href;
        }
      } catch {
        return;
      }

      // Check if it's from the same domain
      if (!fullUrl.includes(config.domain)) return;

      // Check exclude patterns
      const shouldExclude = config.navigation.excludePatterns.some((pattern) =>
        fullUrl.includes(pattern),
      );

      if (shouldExclude) return;

      // Check if it's a content page
      if (isContentPage(fullUrl, config)) {
        links.push(fullUrl);
      }
    });
  }

  // Remove duplicates
  return [...new Set(links)];
}

/**
 * Extract search results from a search page
 */
export function extractSearchResults(
  html: string,
  config: SiteTraversal,
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const baseUrl = `https://${config.domain}`;

  $(config.search.resultSelector).each((_, el) => {
    const linkEl = $(el).find(config.search.resultLinkSelector).first();
    const href = linkEl.attr("href") || $(el).find("a").first().attr("href");

    if (!href) return;

    let fullUrl: string;

    try {
      if (href.startsWith("http")) {
        fullUrl = href;
      } else {
        fullUrl = baseUrl + (href.startsWith("/") ? href : "/" + href);
      }
    } catch {
      return;
    }

    links.push(fullUrl);
  });

  return [...new Set(links)];
}

/**
 * Extract content from HTML using site config
 */
export function extractContent(
  html: string,
  url: string,
  config: SiteTraversal | null,
): ExtractedContent {
  const $ = cheerio.load(html);
  const domain = getDomain(url);

  // Remove noise elements
  $(
    "script, style, nav, footer, header, aside, .sidebar, .menu, .navigation, .cookie, .popup, .modal, .ad, .advertisement",
  ).remove();

  // Use config or fallback to generic
  const extractionConfig = config?.extraction || GENERIC_CONFIG.extraction;
  const navigationConfig = config?.navigation || GENERIC_CONFIG.navigation;

  // Extract title
  let title = extractWithSelectors($, extractionConfig.title);

  if (!title) {
    title = $("h1").first().text().trim() || $("title").text().trim() || "";
  }

  // Extract main content
  let content = extractWithSelectors($, extractionConfig.mainContent);

  if (!content || content.length < 100) {
    // Fallback to body text
    content = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);
  }

  // Extract metadata
  const metadata = extractMetadata($, extractionConfig.metadata);

  // Find related links
  const relatedLinks = config
    ? findContentLinks(html, url, config)
    : extractGenericLinks($, url, navigationConfig);

  // Determine evidence type
  const evidenceType = config ? getEvidenceType(url, config) : undefined;

  return {
    url,
    isContentPage: config ? isContentPage(url, config) : false,
    title: title.slice(0, 500),
    content: content.slice(0, 10000),
    metadata,
    relatedLinks: relatedLinks.slice(0, 50),
    source: config?.name || domain,
    evidenceType,
  };
}

/**
 * Extract links using generic config (for unknown sites)
 */
function extractGenericLinks(
  $: cheerio.CheerioAPI,
  url: string,
  navConfig: GenericConfig["navigation"],
): string[] {
  const links: string[] = [];
  const domain = getDomain(url);
  const baseUrl = `https://${domain}`;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");

    if (!href) return;

    let fullUrl: string;

    try {
      if (href.startsWith("http")) {
        fullUrl = href;
      } else if (href.startsWith("/")) {
        fullUrl = baseUrl + href;
      } else {
        return;
      }
    } catch {
      return;
    }

    // Check if same domain
    if (!fullUrl.includes(domain)) return;

    // Check exclude patterns
    const shouldExclude = navConfig.excludePatterns.some((pattern) =>
      fullUrl.includes(pattern),
    );

    if (shouldExclude) return;

    links.push(fullUrl);
  });

  return [...new Set(links)];
}

/**
 * Main traverse function - takes a URL and returns structured content
 */
export async function traverse(
  url: string,
  html?: string,
): Promise<TraverseResult> {
  const domain = getDomain(url);
  const config = loadSiteConfig(domain);

  // If no HTML provided, we just return config info
  if (!html) {
    return {
      url,
      domain,
      isContentPage: config ? isContentPage(url, config) : false,
      extracted: {
        title: "",
        content: "",
        metadata: {},
        evidenceType: config ? getEvidenceType(url, config) : undefined,
      },
      relatedLinks: [],
      configUsed: config ? config.name : "generic",
      timestamp: Date.now(),
    };
  }

  const extracted = extractContent(html, url, config);

  return {
    url,
    domain,
    isContentPage: extracted.isContentPage,
    extracted: {
      title: extracted.title,
      content: extracted.content,
      metadata: extracted.metadata,
      evidenceType: extracted.evidenceType,
    },
    relatedLinks: extracted.relatedLinks,
    configUsed: config ? config.name : "generic",
    timestamp: Date.now(),
  };
}

/**
 * Check if a domain is a trusted source (has a config)
 */
export function isTrustedSource(domain: string): boolean {
  return loadSiteConfig(domain) !== null;
}

/**
 * Get config for a domain
 */
export function getConfigForDomain(domain: string): SiteTraversal | null {
  return loadSiteConfig(domain);
}

// Re-export types
export type {
  SiteTraversal,
  ExtractedContent,
  TraverseResult,
  EvidenceType,
} from "./types";
