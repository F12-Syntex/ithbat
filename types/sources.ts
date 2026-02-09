export type SourceType =
  | "quran"
  | "hadith"
  | "scholarly_opinion"
  | "fatwa"
  | "tafsir"
  | "fiqh";
export type HadithAuthenticity =
  | "sahih"
  | "hasan"
  | "daif"
  | "mawdu"
  | "unknown";

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  reference: string;
  arabicText?: string;
  translation?: string;
  url?: string;
  domain?: string;
  authenticity?: HadithAuthenticity;
  scholarName?: string;
  collectionName?: string;
}

export interface TrustedDomain {
  domain: string;
  name: string;
  types: SourceType[];
}

/**
 * Single source of truth for all trusted Islamic domains.
 * Used by: ai-config.ts (model config), HowItWorks.tsx (UI display)
 */
export const TRUSTED_DOMAINS: TrustedDomain[] = [
  {
    domain: "quran.com",
    name: "Quran.com",
    types: ["quran", "tafsir"],
  },
  {
    domain: "sunnah.com",
    name: "Sunnah.com",
    types: ["hadith"],
  },
  {
    domain: "islamqa.info",
    name: "IslamQA",
    types: ["fatwa", "scholarly_opinion", "fiqh"],
  },
  {
    domain: "islamqa.org",
    name: "IslamQA (Hanafi)",
    types: ["fatwa", "scholarly_opinion"],
  },
  {
    domain: "islamweb.net",
    name: "IslamWeb",
    types: ["fatwa", "scholarly_opinion"],
  },
  {
    domain: "seekersguidance.org",
    name: "SeekersGuidance",
    types: ["scholarly_opinion", "fiqh"],
  },
];

/** Domain strings for AI config */
export const TRUSTED_DOMAIN_LIST: string[] = TRUSTED_DOMAINS.map((d) => d.domain);

/** Check if a URL belongs to a trusted domain */
export function isTrustedUrl(url: string): boolean {
  return TRUSTED_DOMAINS.some((d) => url.includes(d.domain));
}

/** UI-friendly label for a source type */
const TYPE_LABELS: Record<string, string> = {
  hadith: "Hadith",
  quran: "Quran",
  tafsir: "Tafsir",
  fatwa: "Fatawa",
  scholarly_opinion: "Scholarly",
  fiqh: "Fiqh",
};

/** Get trusted domains formatted for UI display */
export function getTrustedDomainsForUI(): { name: string; type: string }[] {
  return TRUSTED_DOMAINS.map((d) => ({
    name: d.name,
    type: TYPE_LABELS[d.types[0]] || d.types[0],
  }));
}
