// Reference parsing and URL generation for Islamic sources

export interface ParsedReference {
  type: "quran" | "hadith" | "scholar" | "url";
  text: string;
  url: string;
  details: {
    surah?: number;
    ayah?: number;
    ayahEnd?: number;
    collection?: string;
    book?: number;
    hadith?: number;
    scholar?: string;
    source?: string;
  };
}

// Surah name to number mapping
const SURAH_MAP: Record<string, number> = {
  "al-fatihah": 1,
  fatiha: 1,
  fatihah: 1,
  "al-baqarah": 2,
  baqarah: 2,
  baqara: 2,
  "ali-imran": 3,
  "al-imran": 3,
  imran: 3,
  "an-nisa": 4,
  nisa: 4,
  nisaa: 4,
  "al-maidah": 5,
  maidah: 5,
  maida: 5,
  "al-anam": 6,
  anam: 6,
  "al-araf": 7,
  araf: 7,
  "al-anfal": 8,
  anfal: 8,
  "at-tawbah": 9,
  tawbah: 9,
  tawba: 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  "ar-rad": 13,
  rad: 13,
  ibrahim: 14,
  "al-hijr": 15,
  hijr: 15,
  "an-nahl": 16,
  nahl: 16,
  "al-isra": 17,
  isra: 17,
  "bani-israil": 17,
  "al-kahf": 18,
  kahf: 18,
  maryam: 19,
  taha: 20,
  "ta-ha": 20,
  "al-anbiya": 21,
  anbiya: 21,
  "al-hajj": 22,
  hajj: 22,
  "al-muminun": 23,
  muminun: 23,
  muminoon: 23,
  "an-nur": 24,
  nur: 24,
  noor: 24,
  "al-furqan": 25,
  furqan: 25,
  "ash-shuara": 26,
  shuara: 26,
  "an-naml": 27,
  naml: 27,
  "al-qasas": 28,
  qasas: 28,
  "al-ankabut": 29,
  ankabut: 29,
  ankaboot: 29,
  "ar-rum": 30,
  rum: 30,
  luqman: 31,
  "as-sajdah": 32,
  sajdah: 32,
  sajda: 32,
  "al-ahzab": 33,
  ahzab: 33,
  saba: 34,
  fatir: 35,
  "ya-sin": 36,
  yasin: 36,
  yaseen: 36,
  "as-saffat": 37,
  saffat: 37,
  sad: 38,
  "az-zumar": 39,
  zumar: 39,
  ghafir: 40,
  "al-mumin": 40,
  fussilat: 41,
  "ash-shura": 42,
  shura: 42,
  "az-zukhruf": 43,
  zukhruf: 43,
  "ad-dukhan": 44,
  dukhan: 44,
  "al-jathiyah": 45,
  jathiyah: 45,
  "al-ahqaf": 46,
  ahqaf: 46,
  muhammad: 47,
  "al-fath": 48,
  fath: 48,
  "al-hujurat": 49,
  hujurat: 49,
  qaf: 50,
  "adh-dhariyat": 51,
  dhariyat: 51,
  "at-tur": 52,
  tur: 52,
  "an-najm": 53,
  najm: 53,
  "al-qamar": 54,
  qamar: 54,
  "ar-rahman": 55,
  rahman: 55,
  "al-waqiah": 56,
  waqiah: 56,
  waqia: 56,
  "al-hadid": 57,
  hadid: 57,
  "al-mujadila": 58,
  mujadila: 58,
  "al-hashr": 59,
  hashr: 59,
  "al-mumtahanah": 60,
  mumtahanah: 60,
  "as-saff": 61,
  saff: 61,
  "al-jumuah": 62,
  jumuah: 62,
  jumua: 62,
  "al-munafiqun": 63,
  munafiqun: 63,
  "at-taghabun": 64,
  taghabun: 64,
  "at-talaq": 65,
  talaq: 65,
  "at-tahrim": 66,
  tahrim: 66,
  "al-mulk": 67,
  mulk: 67,
  "al-qalam": 68,
  qalam: 68,
  "al-haqqah": 69,
  haqqah: 69,
  "al-maarij": 70,
  maarij: 70,
  nuh: 71,
  noah: 71,
  "al-jinn": 72,
  jinn: 72,
  "al-muzzammil": 73,
  muzzammil: 73,
  "al-muddaththir": 74,
  muddaththir: 74,
  "al-qiyamah": 75,
  qiyamah: 75,
  qiyama: 75,
  "al-insan": 76,
  insan: 76,
  "al-mursalat": 77,
  mursalat: 77,
  "an-naba": 78,
  naba: 78,
  "an-naziat": 79,
  naziat: 79,
  abasa: 80,
  "at-takwir": 81,
  takwir: 81,
  "al-infitar": 82,
  infitar: 82,
  "al-mutaffifin": 83,
  mutaffifin: 83,
  "al-inshiqaq": 84,
  inshiqaq: 84,
  "al-buruj": 85,
  buruj: 85,
  "at-tariq": 86,
  tariq: 86,
  "al-ala": 87,
  ala: 87,
  "al-ghashiyah": 88,
  ghashiyah: 88,
  "al-fajr": 89,
  fajr: 89,
  "al-balad": 90,
  balad: 90,
  "ash-shams": 91,
  shams: 91,
  "al-layl": 92,
  layl: 92,
  "ad-duha": 93,
  duha: 93,
  "ash-sharh": 94,
  sharh: 94,
  inshirah: 94,
  "at-tin": 95,
  tin: 95,
  "al-alaq": 96,
  alaq: 96,
  "al-qadr": 97,
  qadr: 97,
  "al-bayyinah": 98,
  bayyinah: 98,
  "az-zalzalah": 99,
  zalzalah: 99,
  "al-adiyat": 100,
  adiyat: 100,
  "al-qariah": 101,
  qariah: 101,
  "at-takathur": 102,
  takathur: 102,
  "al-asr": 103,
  asr: 103,
  "al-humazah": 104,
  humazah: 104,
  "al-fil": 105,
  fil: 105,
  quraysh: 106,
  "al-maun": 107,
  maun: 107,
  "al-kawthar": 108,
  kawthar: 108,
  kauthar: 108,
  "al-kafirun": 109,
  kafirun: 109,
  "an-nasr": 110,
  nasr: 110,
  "al-masad": 111,
  masad: 111,
  lahab: 111,
  "al-ikhlas": 112,
  ikhlas: 112,
  "al-falaq": 113,
  falaq: 113,
  "an-nas": 114,
  nas: 114,
};

// Hadith collection mapping for sunnah.com
const HADITH_COLLECTION_MAP: Record<string, string> = {
  bukhari: "bukhari",
  "sahih bukhari": "bukhari",
  "sahih al-bukhari": "bukhari",
  muslim: "muslim",
  "sahih muslim": "muslim",
  tirmidhi: "tirmidhi",
  "jami at-tirmidhi": "tirmidhi",
  "jami` at-tirmidhi": "tirmidhi",
  "abu dawud": "abudawud",
  "sunan abu dawud": "abudawud",
  nasai: "nasai",
  "sunan an-nasai": "nasai",
  "ibn majah": "ibnmajah",
  "sunan ibn majah": "ibnmajah",
  malik: "malik",
  "muwatta malik": "malik",
  darimi: "darimi",
  nawawi: "nawawi40",
  "40 hadith nawawi": "nawawi40",
  qudsi: "qudsi40",
  "hadith qudsi": "qudsi40",
};

/**
 * Parse a Quran reference and generate a URL
 * Handles formats like:
 * - "Surah An-Nisa 4:103"
 * - "4:103"
 * - "Quran 2:255"
 * - "Al-Baqarah, 2:43"
 * - "Surah 4, Ayah 103"
 */
export function parseQuranReference(text: string): ParsedReference | null {
  // Pattern 1: Surah Name with chapter:verse (e.g., "Surah An-Nisa 4:103" or "Al-Baqarah, 2:43")
  const surahNamePattern =
    /(?:surah\s+)?([a-z\-']+)[\s,]*(\d+):(\d+)(?:-(\d+))?/i;

  // Pattern 2: Just chapter:verse (e.g., "4:103" or "Quran 4:103")
  const chapterVersePattern = /(?:quran\s+)?(\d+):(\d+)(?:-(\d+))?/i;

  // Pattern 3: Surah X, Ayah Y format
  const surahAyahPattern =
    /surah\s+(\d+)[\s,]*(?:ayah|verse)\s+(\d+)(?:-(\d+))?/i;

  let surah: number | undefined;
  let ayah: number | undefined;
  let ayahEnd: number | undefined;

  // Try pattern 1
  let match = text.match(surahNamePattern);

  if (match) {
    const surahName = match[1].toLowerCase().replace(/['\s]/g, "-");

    surah = SURAH_MAP[surahName] || parseInt(match[2], 10);
    ayah = parseInt(match[3], 10);
    ayahEnd = match[4] ? parseInt(match[4], 10) : undefined;
  }

  // Try pattern 2
  if (!surah) {
    match = text.match(chapterVersePattern);
    if (match) {
      surah = parseInt(match[1], 10);
      ayah = parseInt(match[2], 10);
      ayahEnd = match[3] ? parseInt(match[3], 10) : undefined;
    }
  }

  // Try pattern 3
  if (!surah) {
    match = text.match(surahAyahPattern);
    if (match) {
      surah = parseInt(match[1], 10);
      ayah = parseInt(match[2], 10);
      ayahEnd = match[3] ? parseInt(match[3], 10) : undefined;
    }
  }

  if (surah && ayah && surah >= 1 && surah <= 114) {
    const url = ayahEnd
      ? `https://quran.com/${surah}/${ayah}-${ayahEnd}`
      : `https://quran.com/${surah}/${ayah}`;

    return {
      type: "quran",
      text: text.trim(),
      url,
      details: { surah, ayah, ayahEnd },
    };
  }

  return null;
}

/**
 * Parse a Hadith reference and generate a URL
 * Handles formats like:
 * - "Sahih Bukhari, Book 11, Hadith 605"
 * - "Sahih Muslim 4:19"
 * - "Bukhari 605"
 * - "Jami at-Tirmidhi, Book 40, Hadith 2616"
 */
export function parseHadithReference(text: string): ParsedReference | null {
  const lowerText = text.toLowerCase();

  // Find the collection
  let collection: string | undefined;
  let collectionKey: string | undefined;

  for (const [key, value] of Object.entries(HADITH_COLLECTION_MAP)) {
    if (lowerText.includes(key)) {
      collection = value;
      collectionKey = key;
      break;
    }
  }

  if (!collection) return null;

  let book: number | undefined;
  let hadith: number | undefined;

  // Pattern 1: "Book X, Hadith Y" or "Book X Hadith Y"
  const bookHadithPattern = /book\s+(\d+)[\s,]*hadith\s+(\d+)/i;
  let match = text.match(bookHadithPattern);

  if (match) {
    book = parseInt(match[1], 10);
    hadith = parseInt(match[2], 10);
  }

  // Pattern 2: "Collection X:Y" (e.g., "Muslim 4:19")
  if (!hadith) {
    const collectionNumPattern = new RegExp(
      `${collectionKey}\\s+(\\d+):(\\d+)`,
      "i",
    );

    match = text.match(collectionNumPattern);
    if (match) {
      book = parseInt(match[1], 10);
      hadith = parseInt(match[2], 10);
    }
  }

  // Pattern 3: Just hadith number (e.g., "Bukhari 605")
  if (!hadith) {
    const simplePattern = new RegExp(`${collectionKey}\\s+(\\d+)(?!:)`, "i");

    match = text.match(simplePattern);
    if (match) {
      hadith = parseInt(match[1], 10);
    }
  }

  // Pattern 4: "Hadith X" alone after collection name
  if (!hadith) {
    const hadithOnlyPattern = /hadith\s+(\d+)/i;

    match = text.match(hadithOnlyPattern);
    if (match) {
      hadith = parseInt(match[1], 10);
    }
  }

  if (hadith) {
    // sunnah.com direct URL format: https://sunnah.com/collection:hadith
    // e.g., https://sunnah.com/bukhari:605, https://sunnah.com/muslim:19
    const url = `https://sunnah.com/${collection}:${hadith}`;

    return {
      type: "hadith",
      text: text.trim(),
      url,
      details: { collection, book, hadith },
    };
  }

  return null;
}

/**
 * Parse the numbered sources list from AI response
 * Handles multiple formats:
 * [1] Title - https://example.com
 * [1] https://example.com
 * [1] [Title](https://example.com)
 * 1. Title - https://example.com
 */
function parseSourcesList(
  text: string,
): Map<number, { title: string; url: string }> {
  const sources = new Map<number, { title: string; url: string }>();

  // Find sources section - look for ## Sources or just sources list
  const sourcesSection = text.match(/##\s*Sources[\s\S]*$/i);
  const textToSearch = sourcesSection ? sourcesSection[0] : text;

  // Pattern 1: [N] Title - URL or [N] URL
  const pattern1 =
    /\[(\d+)\]\s*([^-\[\]\n]*?)(?:\s*-\s*)?(https?:\/\/[^\s\n\)]+)/gi;

  // Pattern 2: [N] [Title](URL) - markdown link format
  const pattern2 = /\[(\d+)\]\s*\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi;

  // Pattern 3: N. Title - URL (numbered list)
  const pattern3 = /^(\d+)\.\s*([^-\n]+?)\s*-\s*(https?:\/\/[^\s\n]+)/gim;

  let match;

  // Try pattern 1
  while ((match = pattern1.exec(textToSearch)) !== null) {
    const num = parseInt(match[1], 10);
    const title = match[2].trim() || "Source";
    const url = match[3].trim().replace(/[)\].,;]+$/, ""); // Clean trailing punctuation

    if (!sources.has(num)) {
      sources.set(num, { title, url });
    }
  }

  // Try pattern 2 (markdown links)
  while ((match = pattern2.exec(textToSearch)) !== null) {
    const num = parseInt(match[1], 10);
    const title = match[2].trim();
    const url = match[3].trim();

    if (!sources.has(num)) {
      sources.set(num, { title, url });
    }
  }

  // Try pattern 3 (numbered list)
  while ((match = pattern3.exec(textToSearch)) !== null) {
    const num = parseInt(match[1], 10);
    const title = match[2].trim();
    const url = match[3].trim();

    if (!sources.has(num)) {
      sources.set(num, { title, url });
    }
  }

  // Also scan the entire text for any URL on a line with [N]
  const lines = text.split("\n");

  for (const line of lines) {
    const numMatch = line.match(/\[(\d+)\]/);
    const urlMatch = line.match(/(https?:\/\/[^\s\n\)]+)/);

    if (numMatch && urlMatch) {
      const num = parseInt(numMatch[1], 10);
      const url = urlMatch[1].replace(/[)\].,;]+$/, "");

      if (!sources.has(num)) {
        // Try to extract title from line
        const titlePart = line
          .replace(/\[\d+\]/, "")
          .replace(url, "")
          .replace(/-/g, " ")
          .trim();

        sources.set(num, { title: titlePart || "Source", url });
      }
    }
  }

  return sources;
}

/**
 * Convert combined citations like [1, 2, 3] to separate [1] [2] [3]
 */
function expandCombinedCitations(text: string): string {
  // Match [1, 2, 3] or [1,2,3] or [1, 8, 13, 23] patterns
  return text.replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (match, numbers) => {
    const nums = numbers.split(/\s*,\s*/);

    return nums.map((n: string) => `[${n.trim()}]`).join(" ");
  });
}

/**
 * Convert [1], [2] style citations to clickable links
 */
function processNumberedCitations(
  text: string,
  sources: Map<number, { title: string; url: string }>,
): string {
  if (sources.size === 0) return text;

  // First, expand any combined citations like [1, 2, 3] to [1] [2] [3]
  let expandedText = expandCombinedCitations(text);

  // Replace [N] citations with clickable links (but not in the Sources section)
  const sourcesIndex = expandedText.search(/##\s*Sources/i);
  const mainText =
    sourcesIndex > 0 ? expandedText.substring(0, sourcesIndex) : expandedText;
  const sourcesSection =
    sourcesIndex > 0 ? expandedText.substring(sourcesIndex) : "";

  let processedMain = mainText;

  // Replace [1], [2], etc. with clickable superscript-style links
  // Match [N] but not when followed by Title - URL (which is the sources list)
  processedMain = processedMain.replace(
    /\[(\d+)\](?!\s*[^\[\]]+\s*-?\s*https?:)/g,
    (match, num) => {
      const n = parseInt(num, 10);
      const source = sources.get(n);

      if (source) {
        return `[[${n}]](${source.url})`;
      }

      return match;
    },
  );

  // Also make the sources list clickable
  let processedSources = sourcesSection;

  for (const [num, { title, url }] of sources) {
    // Replace [N] Title - URL with [N] [Title](URL)
    const pattern = new RegExp(
      `\\[${num}\\]\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*-?\\s*${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g",
    );

    processedSources = processedSources.replace(
      pattern,
      `[${num}] [${title}](${url})`,
    );
  }

  // If that didn't work, try a simpler approach
  if (processedSources === sourcesSection && sourcesSection) {
    processedSources = sourcesSection.replace(
      /\[(\d+)\]\s*([^-\n]+)\s*-\s*(https?:\/\/[^\s\n]+)/g,
      (_, num, title, url) => `[${num}] [${title.trim()}](${url.trim()})`,
    );
  }

  return processedMain + processedSources;
}

/**
 * Extract all references from a text and convert to clickable links
 * IMPORTANT: If the text already contains markdown links (from AI inline citations),
 * we skip re-processing to avoid double-wrapping
 */
export function extractReferences(text: string): {
  processedText: string;
  references: ParsedReference[];
} {
  const references: ParsedReference[] = [];

  // Check if the text already has properly formatted markdown links
  // Pattern: [text](url) - if we find these, the AI has already formatted the links
  const hasInlineLinks = /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(text);

  // If the AI has already created inline links, just return the text as-is
  // This prevents double-wrapping like [[Text](url)](url)
  if (hasInlineLinks) {
    return { processedText: text, references };
  }

  let processedText = text;

  // First, parse the numbered sources list and convert [1], [2] citations
  const sources = parseSourcesList(text);

  if (sources.size > 0) {
    processedText = processNumberedCitations(processedText, sources);

    // Add sources to references
    for (const [, { title, url }] of sources) {
      references.push({
        type: "url",
        text: title,
        url,
        details: { source: title },
      });
    }
  }

  // Quran reference patterns to find and replace
  const quranPatterns = [
    // Surah Name Chapter:Verse
    /(?:Surah\s+)?([A-Za-z\-']+)[\s,]*(\d+):(\d+)(?:-(\d+))?/g,
    // Quran Chapter:Verse
    /Quran\s+(\d+):(\d+)(?:-(\d+))?/gi,
    // Standalone Chapter:Verse that look like Quran refs (context dependent)
  ];

  // Hadith patterns
  const hadithPatterns = [
    /(Sahih\s+(?:al-)?Bukhari|Bukhari)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
    /(Sahih\s+Muslim|Muslim)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
    /(Jami[`']?\s+at-Tirmidhi|Tirmidhi)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
    /(Sunan\s+Abu\s+Dawud|Abu\s+Dawud)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
    /(Sunan\s+(?:an-)?Nasai|Nasai)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
    /(Sunan\s+Ibn\s+Majah|Ibn\s+Majah)[\s,]*(?:Book\s+(\d+)[\s,]*)?(?:Hadith\s+)?(\d+)/gi,
  ];

  // Process Quran references
  for (const pattern of quranPatterns) {
    processedText = processedText.replace(pattern, (match) => {
      const ref = parseQuranReference(match);

      if (ref) {
        references.push(ref);

        return `[${match}](${ref.url})`;
      }

      return match;
    });
  }

  // Process Hadith references
  for (const pattern of hadithPatterns) {
    processedText = processedText.replace(pattern, (match) => {
      const ref = parseHadithReference(match);

      if (ref) {
        references.push(ref);

        return `[${match}](${ref.url})`;
      }

      return match;
    });
  }

  // Convert any remaining plain URLs to clickable links (not already in markdown format)
  processedText = processedText.replace(
    /(?<!\]\()(?<!\()(?<!href=["'])(https?:\/\/[^\s\n\)\]<>"]+)(?!\))/g,
    (url) => {
      // Don't wrap if it's already part of a markdown link
      const cleanUrl = url.replace(/[.,;:]+$/, ""); // Clean trailing punctuation
      const domain = new URL(cleanUrl).hostname.replace("www.", "");

      return `[${domain}](${cleanUrl})`;
    },
  );

  return { processedText, references };
}

/**
 * Generate a Quran.com URL for a specific verse
 */
export function getQuranUrl(
  surah: number,
  ayah: number,
  ayahEnd?: number,
): string {
  if (ayahEnd) {
    return `https://quran.com/${surah}/${ayah}-${ayahEnd}`;
  }

  return `https://quran.com/${surah}/${ayah}`;
}

/**
 * Generate a direct Sunnah.com URL for a hadith
 */
export function getHadithUrl(collection: string, hadith: number): string {
  const collectionSlug =
    HADITH_COLLECTION_MAP[collection.toLowerCase()] || collection.toLowerCase();

  // Direct URL format: https://sunnah.com/collection:hadith
  return `https://sunnah.com/${collectionSlug}:${hadith}`;
}

/**
 * Generate a Sunnah.com search URL for a topic
 */
export function getSunnahSearchUrl(query: string): string {
  return `https://sunnah.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Generate a Quran.com search URL
 */
export function getQuranSearchUrl(query: string): string {
  return `https://quran.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Generate search URL for IslamQA
 */
export function getIslamQASearchUrl(query: string): string {
  return `https://islamqa.info/en/search?q=${encodeURIComponent(query)}`;
}
