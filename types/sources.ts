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
  trusted: boolean;
}

export const TRUSTED_DOMAINS: TrustedDomain[] = [
  {
    domain: "quran.com",
    name: "Quran.com",
    types: ["quran", "tafsir"],
    trusted: true,
  },
  {
    domain: "sunnah.com",
    name: "Sunnah.com",
    types: ["hadith"],
    trusted: true,
  },
  {
    domain: "islamqa.info",
    name: "IslamQA",
    types: ["fatwa", "scholarly_opinion", "fiqh"],
    trusted: true,
  },
  {
    domain: "islamweb.net",
    name: "IslamWeb",
    types: ["fatwa", "scholarly_opinion"],
    trusted: true,
  },
  {
    domain: "seekersguidance.org",
    name: "Seeker's Guidance",
    types: ["scholarly_opinion", "fiqh"],
    trusted: true,
  },
];
