/**
 * Trusted Sites Configuration
 *
 * This file provides the list of trusted Islamic knowledge sites.
 * Sites are defined in lib/traverser/sites/*.json and enabled in sites.json
 *
 * IMPORTANT: Only sites listed here should be searched.
 * To add a new site, use: yarn traverse analyze <url>
 */

// Import configs from traverser (single source of truth)
import { loadAllSiteConfigs, getSearchUrl } from "./traverser";

export interface TrustedSite {
  domain: string;
  name: string;
  description: string;
  evidenceTypes: string[];
  searchUrl: (query: string) => string;
}

/**
 * All trusted sites - dynamically loaded from traverser configs
 * ONLY these sites should be searched
 */
export const TRUSTED_SITES: TrustedSite[] = loadAllSiteConfigs().map((config) => ({
  domain: config.domain,
  name: config.name,
  description: config.description,
  evidenceTypes: config.evidenceTypes,
  searchUrl: (q: string) => getSearchUrl(q, config),
}));

/**
 * Get display info for UI components
 */
export function getTrustedSitesForUI(): { name: string; type: string }[] {
  return TRUSTED_SITES.map((site) => ({
    name: site.name.split(" - ")[0], // Just the site name, not description
    type: getTypeLabel(site.evidenceTypes[0]),
  }));
}

/**
 * Convert evidence type to UI-friendly label
 */
function getTypeLabel(evidenceType: string): string {
  const labels: Record<string, string> = {
    hadith: "Hadith",
    quran: "Quran",
    tafsir: "Tafsir",
    fatwa: "Fatawa",
    scholarly_opinion: "Scholarly",
    fiqh: "Fiqh",
  };
  return labels[evidenceType] || evidenceType;
}

/**
 * Check if a URL is from a trusted site
 */
export function isTrustedUrl(url: string): boolean {
  return TRUSTED_SITES.some((site) => url.includes(site.domain));
}

/**
 * Get trusted site config by domain
 */
export function getTrustedSiteByDomain(domain: string): TrustedSite | undefined {
  return TRUSTED_SITES.find((site) => domain.includes(site.domain));
}
