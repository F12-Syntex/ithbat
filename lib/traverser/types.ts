/**
 * Site Traversal Configuration Types
 *
 * Standardized schema for defining how to navigate and extract content
 * from Islamic knowledge websites. These configs are used by the AI
 * to understand site structure and interpret extracted data.
 */

/**
 * Types of Islamic evidence a site provides
 */
export type EvidenceType =
  | "hadith" // Prophetic traditions
  | "quran" // Quranic verses
  | "tafsir" // Quranic exegesis
  | "fatwa" // Scholarly legal opinions
  | "scholarly_opinion" // General scholarly commentary
  | "fiqh"; // Islamic jurisprudence

/**
 * Content categories available on the site
 */
export interface ContentCategory {
  /** Category identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this category contains */
  description: string;
  /** URL pattern or path for this category */
  urlPattern?: string;
}

/**
 * Describes what a metadata field means and how to interpret it
 */
export interface MetadataSchema {
  /** CSS selector to extract this value */
  selector: string;
  /** What this field represents */
  description: string;
  /** Data type for parsing */
  type: "string" | "number" | "grade" | "reference" | "list";
  /** For grade type: what values mean (e.g., "sahih" = authentic) */
  valueMap?: Record<string, string>;
}

/**
 * URL structure patterns for direct navigation
 * Helps AI understand how URLs are constructed for different page types
 */
export interface UrlStructure {
  /** Root URL pattern */
  root: string;
  /** Search URL pattern with {query} placeholder */
  search: string;
  /** Parameter descriptions - explains what each {placeholder} means */
  parameters?: Record<string, string>;
  /** Example URLs for reference */
  examples?: Record<string, string>;
  /** Additional URL patterns - any string key maps to a URL template */
  [key: string]: string | Record<string, string> | undefined;
}

/**
 * Main site configuration - all sites in /sites/ are trusted sources
 */
export interface SiteTraversal {
  /** Domain without protocol, e.g., "sunnah.com" */
  domain: string;

  /** Human-readable site name */
  name: string;

  /** Description of the site for AI context */
  description: string;

  /** Primary language(s) of content */
  languages: string[];

  /** Types of Islamic evidence this site provides */
  evidenceTypes: EvidenceType[];

  /** URL structure patterns for direct access - helps AI construct URLs */
  urlStructure?: UrlStructure;

  /** Content categories available on this site */
  categories?: ContentCategory[];

  /** How to search this site */
  search: SearchConfig;

  /** How to identify content pages vs index/search pages */
  contentPage: ContentPageConfig;

  /** How to extract content from a content page */
  extraction: ExtractionConfig;

  /** How to find and filter links for navigation */
  navigation: NavigationConfig;

  /** Rendering requirements for JavaScript-heavy sites */
  rendering?: RenderingConfig;

  /** Site-specific notes for the AI */
  aiNotes?: string;
}

export interface SearchConfig {
  /** URL template with {query} placeholder, e.g., "https://sunnah.com/search?q={query}" */
  urlTemplate: string;

  /** CSS selector for search result items */
  resultSelector: string;

  /** CSS selector for the link within each result item */
  resultLinkSelector: string;

  /** Optional: CSS selector for pagination/next page link */
  paginationSelector?: string;

  /** Tips for AI on how to use search effectively */
  searchTips?: string;
}

/**
 * Rendering configuration for JavaScript-heavy sites
 */
export interface RenderingConfig {
  /** Whether the site requires JavaScript to render content */
  requiresJavaScript: boolean;

  /** Milliseconds to wait after page load for content to render (default: 2000) */
  waitTime?: number;

  /** Additional wait for search pages specifically (default: same as waitTime) */
  searchWaitTime?: number;

  /** CSS selector to wait for before considering page loaded */
  waitForSelector?: string;

  /** Notes about rendering behavior */
  notes?: string;
}

export interface ContentPageConfig {
  /** Regex patterns that match content page URLs (use double backslash in JSON) */
  urlPatterns: string[];

  /** Description of what constitutes a content page on this site */
  description?: string;
}

export interface ExtractionConfig {
  /** CSS selectors for title, in priority order (first match wins) */
  title: string[];

  /** CSS selectors for main content, in priority order */
  mainContent: string[];

  /** Structured metadata with descriptions for AI understanding */
  metadata: Record<string, MetadataSchema>;

  /** How to interpret the extracted content */
  contentNotes?: string;
}

export interface NavigationConfig {
  /** CSS selectors for links to follow */
  relatedLinks: string[];

  /** URL patterns to exclude (substring match) */
  excludePatterns: string[];

  /** Maximum depth to traverse from a starting page */
  maxDepth?: number;
}

/**
 * Result of extracting content from a page
 */
export interface ExtractedContent {
  url: string;
  isContentPage: boolean;
  title: string;
  content: string;
  metadata: Record<string, string>;
  relatedLinks: string[];
  source: string;
  /** The evidence type determined from the URL/content */
  evidenceType?: EvidenceType;
}

/**
 * Result of traversing a URL
 */
export interface TraverseResult {
  url: string;
  domain: string;
  isContentPage: boolean;
  extracted: {
    title: string;
    content: string;
    metadata: Record<string, string>;
    evidenceType?: EvidenceType;
  };
  relatedLinks: string[];
  configUsed: string;
  timestamp: number;
}

/**
 * Generic fallback config for unknown sites
 */
export interface GenericConfig {
  extraction: ExtractionConfig;
  navigation: NavigationConfig;
}
