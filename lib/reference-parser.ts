/**
 * Reference Parser
 *
 * Converts Islamic text references to clickable links:
 * - [al-Isra 17:23-24] → https://quran.com/al-isra/23-24
 * - Sahih al-Bukhari 5977 → https://sunnah.com/bukhari:5977
 * - Surah 19:14 → https://quran.com/19/14
 */

// Surah name mappings (Arabic transliteration to number/slug)
const SURAH_MAP: Record<string, { number: number; slug: string }> = {
  "al-fatiha": { number: 1, slug: "al-fatiha" },
  "al-fatihah": { number: 1, slug: "al-fatiha" },
  "fatiha": { number: 1, slug: "al-fatiha" },
  "al-baqara": { number: 2, slug: "al-baqarah" },
  "al-baqarah": { number: 2, slug: "al-baqarah" },
  "baqara": { number: 2, slug: "al-baqarah" },
  "al-imran": { number: 3, slug: "ali-imran" },
  "ali-imran": { number: 3, slug: "ali-imran" },
  "al-nisa": { number: 4, slug: "an-nisa" },
  "an-nisa": { number: 4, slug: "an-nisa" },
  "nisa": { number: 4, slug: "an-nisa" },
  "al-maida": { number: 5, slug: "al-maidah" },
  "al-maidah": { number: 5, slug: "al-maidah" },
  "al-anam": { number: 6, slug: "al-anam" },
  "al-araf": { number: 7, slug: "al-araf" },
  "al-anfal": { number: 8, slug: "al-anfal" },
  "at-tawba": { number: 9, slug: "at-tawbah" },
  "at-tawbah": { number: 9, slug: "at-tawbah" },
  "tawba": { number: 9, slug: "at-tawbah" },
  "yunus": { number: 10, slug: "yunus" },
  "hud": { number: 11, slug: "hud" },
  "yusuf": { number: 12, slug: "yusuf" },
  "ar-rad": { number: 13, slug: "ar-rad" },
  "ibrahim": { number: 14, slug: "ibrahim" },
  "al-hijr": { number: 15, slug: "al-hijr" },
  "an-nahl": { number: 16, slug: "an-nahl" },
  "al-isra": { number: 17, slug: "al-isra" },
  "isra": { number: 17, slug: "al-isra" },
  "al-kahf": { number: 18, slug: "al-kahf" },
  "kahf": { number: 18, slug: "al-kahf" },
  "maryam": { number: 19, slug: "maryam" },
  "ta-ha": { number: 20, slug: "ta-ha" },
  "taha": { number: 20, slug: "ta-ha" },
  "al-anbiya": { number: 21, slug: "al-anbiya" },
  "al-hajj": { number: 22, slug: "al-hajj" },
  "al-muminun": { number: 23, slug: "al-muminun" },
  "an-nur": { number: 24, slug: "an-nur" },
  "al-furqan": { number: 25, slug: "al-furqan" },
  "ash-shuara": { number: 26, slug: "ash-shuara" },
  "an-naml": { number: 27, slug: "an-naml" },
  "al-qasas": { number: 28, slug: "al-qasas" },
  "al-ankabut": { number: 29, slug: "al-ankabut" },
  "ar-rum": { number: 30, slug: "ar-rum" },
  "luqman": { number: 31, slug: "luqman" },
  "as-sajda": { number: 32, slug: "as-sajdah" },
  "as-sajdah": { number: 32, slug: "as-sajdah" },
  "al-ahzab": { number: 33, slug: "al-ahzab" },
  "saba": { number: 34, slug: "saba" },
  "fatir": { number: 35, slug: "fatir" },
  "ya-sin": { number: 36, slug: "ya-sin" },
  "yasin": { number: 36, slug: "ya-sin" },
  "as-saffat": { number: 37, slug: "as-saffat" },
  "sad": { number: 38, slug: "sad" },
  "az-zumar": { number: 39, slug: "az-zumar" },
  "ghafir": { number: 40, slug: "ghafir" },
  "fussilat": { number: 41, slug: "fussilat" },
  "ash-shura": { number: 42, slug: "ash-shuraa" },
  "az-zukhruf": { number: 43, slug: "az-zukhruf" },
  "ad-dukhan": { number: 44, slug: "ad-dukhan" },
  "al-jathiya": { number: 45, slug: "al-jathiyah" },
  "al-ahqaf": { number: 46, slug: "al-ahqaf" },
  "muhammad": { number: 47, slug: "muhammad" },
  "al-fath": { number: 48, slug: "al-fath" },
  "al-hujurat": { number: 49, slug: "al-hujurat" },
  "qaf": { number: 50, slug: "qaf" },
  "adh-dhariyat": { number: 51, slug: "adh-dhariyat" },
  "at-tur": { number: 52, slug: "at-tur" },
  "an-najm": { number: 53, slug: "an-najm" },
  "al-qamar": { number: 54, slug: "al-qamar" },
  "ar-rahman": { number: 55, slug: "ar-rahman" },
  "al-waqia": { number: 56, slug: "al-waqiah" },
  "al-waqiah": { number: 56, slug: "al-waqiah" },
  "al-hadid": { number: 57, slug: "al-hadid" },
  "al-mujadila": { number: 58, slug: "al-mujadila" },
  "al-hashr": { number: 59, slug: "al-hashr" },
  "al-mumtahina": { number: 60, slug: "al-mumtahanah" },
  "as-saf": { number: 61, slug: "as-saf" },
  "al-jumua": { number: 62, slug: "al-jumuah" },
  "al-jumuah": { number: 62, slug: "al-jumuah" },
  "al-munafiqun": { number: 63, slug: "al-munafiqun" },
  "at-taghabun": { number: 64, slug: "at-taghabun" },
  "at-talaq": { number: 65, slug: "at-talaq" },
  "at-tahrim": { number: 66, slug: "at-tahrim" },
  "al-mulk": { number: 67, slug: "al-mulk" },
  "al-qalam": { number: 68, slug: "al-qalam" },
  "al-haaqqa": { number: 69, slug: "al-haqqah" },
  "al-haqqah": { number: 69, slug: "al-haqqah" },
  "al-maarij": { number: 70, slug: "al-maarij" },
  "nuh": { number: 71, slug: "nuh" },
  "al-jinn": { number: 72, slug: "al-jinn" },
  "al-muzzammil": { number: 73, slug: "al-muzzammil" },
  "al-muddaththir": { number: 74, slug: "al-muddaththir" },
  "al-qiyama": { number: 75, slug: "al-qiyamah" },
  "al-qiyamah": { number: 75, slug: "al-qiyamah" },
  "al-insan": { number: 76, slug: "al-insan" },
  "al-mursalat": { number: 77, slug: "al-mursalat" },
  "an-naba": { number: 78, slug: "an-naba" },
  "an-naziat": { number: 79, slug: "an-naziat" },
  "abasa": { number: 80, slug: "abasa" },
  "at-takwir": { number: 81, slug: "at-takwir" },
  "al-infitar": { number: 82, slug: "al-infitar" },
  "al-mutaffifin": { number: 83, slug: "al-mutaffifin" },
  "al-inshiqaq": { number: 84, slug: "al-inshiqaq" },
  "al-buruj": { number: 85, slug: "al-buruj" },
  "at-tariq": { number: 86, slug: "at-tariq" },
  "al-ala": { number: 87, slug: "al-ala" },
  "al-ghashiya": { number: 88, slug: "al-ghashiyah" },
  "al-ghashiyah": { number: 88, slug: "al-ghashiyah" },
  "al-fajr": { number: 89, slug: "al-fajr" },
  "al-balad": { number: 90, slug: "al-balad" },
  "ash-shams": { number: 91, slug: "ash-shams" },
  "al-layl": { number: 92, slug: "al-layl" },
  "ad-duha": { number: 93, slug: "ad-duhaa" },
  "ad-duhaa": { number: 93, slug: "ad-duhaa" },
  "ash-sharh": { number: 94, slug: "ash-sharh" },
  "al-inshirah": { number: 94, slug: "ash-sharh" },
  "at-tin": { number: 95, slug: "at-tin" },
  "al-alaq": { number: 96, slug: "al-alaq" },
  "al-qadr": { number: 97, slug: "al-qadr" },
  "al-bayyina": { number: 98, slug: "al-bayyinah" },
  "al-bayyinah": { number: 98, slug: "al-bayyinah" },
  "az-zalzala": { number: 99, slug: "az-zalzalah" },
  "az-zalzalah": { number: 99, slug: "az-zalzalah" },
  "al-adiyat": { number: 100, slug: "al-adiyat" },
  "al-qaria": { number: 101, slug: "al-qariah" },
  "al-qariah": { number: 101, slug: "al-qariah" },
  "at-takathur": { number: 102, slug: "at-takathur" },
  "al-asr": { number: 103, slug: "al-asr" },
  "al-humaza": { number: 104, slug: "al-humazah" },
  "al-humazah": { number: 104, slug: "al-humazah" },
  "al-fil": { number: 105, slug: "al-fil" },
  "quraysh": { number: 106, slug: "quraysh" },
  "al-maun": { number: 107, slug: "al-maun" },
  "al-kawthar": { number: 108, slug: "al-kawthar" },
  "al-kafirun": { number: 109, slug: "al-kafirun" },
  "an-nasr": { number: 110, slug: "an-nasr" },
  "al-masad": { number: 111, slug: "al-masad" },
  "al-ikhlas": { number: 112, slug: "al-ikhlas" },
  "al-falaq": { number: 113, slug: "al-falaq" },
  "an-nas": { number: 114, slug: "an-nas" },
};

// Hadith collection mappings
const HADITH_COLLECTIONS: Record<string, string> = {
  "bukhari": "bukhari",
  "sahih bukhari": "bukhari",
  "sahih al-bukhari": "bukhari",
  "muslim": "muslim",
  "sahih muslim": "muslim",
  "tirmidhi": "tirmidhi",
  "jami at-tirmidhi": "tirmidhi",
  "abu dawud": "abudawud",
  "abu dawood": "abudawud",
  "sunan abu dawud": "abudawud",
  "nasai": "nasai",
  "sunan an-nasai": "nasai",
  "ibn majah": "ibnmajah",
  "sunan ibn majah": "ibnmajah",
  "malik": "malik",
  "muwatta malik": "malik",
  "ahmad": "ahmad",
  "musnad ahmad": "ahmad",
  "darimi": "darimi",
  "nawawi": "nawawi40",
  "40 nawawi": "nawawi40",
  "nawawi 40": "nawawi40",
  "riyadh us saliheen": "riyadussalihin",
  "riyadh al-salihin": "riyadussalihin",
  "riyad as-salihin": "riyadussalihin",
};

export interface ParsedReference {
  original: string;
  url: string;
  type: "quran" | "hadith";
}

/**
 * Parse a Quran reference and return URL
 * Handles: [al-Isra 17:23-24], Surah 19:14, Quran 2:255, etc.
 */
function parseQuranReference(text: string): ParsedReference | null {
  // Pattern: [surah-name chapter:verse] or [surah-name chapter:verse-verse]
  const bracketPattern = /\[([a-z-]+)\s+(\d+):(\d+)(?:-(\d+))?\]/gi;
  // Pattern: Surah/Quran number:verse
  const simplePattern = /(?:surah|quran|verse)\s+(\d+):(\d+)(?:-(\d+))?/gi;
  // Pattern: Surah name verse reference (e.g., "Quran 19:14")
  const numberedPattern = /quran\s+(\d+):(\d+)(?:-(\d+))?/gi;

  let match = bracketPattern.exec(text);
  if (match) {
    const surahName = match[1].toLowerCase();
    const chapter = match[2];
    const startVerse = match[3];
    const endVerse = match[4];

    const surahInfo = SURAH_MAP[surahName];
    if (surahInfo) {
      const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;
      return {
        original: match[0],
        url: `https://quran.com/${surahInfo.slug}/${versePath}`,
        type: "quran",
      };
    }
    // If surah name not found, use chapter number
    const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;
    return {
      original: match[0],
      url: `https://quran.com/${chapter}/${versePath}`,
      type: "quran",
    };
  }

  match = numberedPattern.exec(text);
  if (match) {
    const chapter = match[1];
    const startVerse = match[2];
    const endVerse = match[3];
    const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;
    return {
      original: match[0],
      url: `https://quran.com/${chapter}/${versePath}`,
      type: "quran",
    };
  }

  match = simplePattern.exec(text);
  if (match) {
    const chapter = match[1];
    const startVerse = match[2];
    const endVerse = match[3];
    const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;
    return {
      original: match[0],
      url: `https://quran.com/${chapter}/${versePath}`,
      type: "quran",
    };
  }

  return null;
}

/**
 * Parse a hadith reference and return URL
 * Handles: Sahih al-Bukhari 5977, Bukhari 1, Muslim 2553, etc.
 */
function parseHadithReference(text: string): ParsedReference | null {
  // Pattern: Collection name followed by number
  const pattern = /(sahih\s+al-bukhari|sahih\s+bukhari|sahih\s+muslim|bukhari|muslim|tirmidhi|jami\s+at-tirmidhi|abu\s+dawud|abu\s+dawood|sunan\s+abu\s+dawud|nasai|sunan\s+an-nasai|ibn\s+majah|sunan\s+ibn\s+majah|malik|muwatta\s+malik|ahmad|musnad\s+ahmad|darimi|nawawi|40\s+nawawi|nawawi\s+40|riyadh\s+us\s+saliheen|riyadh\s+al-salihin|riyad\s+as-salihin)\s+(\d+)/gi;

  const match = pattern.exec(text);
  if (match) {
    const collectionName = match[1].toLowerCase();
    const hadithNumber = match[2];

    const collection = HADITH_COLLECTIONS[collectionName];
    if (collection) {
      return {
        original: match[0],
        url: `https://sunnah.com/${collection}:${hadithNumber}`,
        type: "hadith",
      };
    }
  }

  return null;
}

/**
 * Find all references in text and return them with URLs
 */
export function findAllReferences(text: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  const seen = new Set<string>();

  // Find Quran references
  // Pattern: [surah-name chapter:verse-verse]
  const bracketPattern = /\[([a-z-]+)\s+(\d+):(\d+)(?:-(\d+))?\]/gi;
  let match;

  while ((match = bracketPattern.exec(text)) !== null) {
    const surahName = match[1].toLowerCase();
    const chapter = match[2];
    const startVerse = match[3];
    const endVerse = match[4];

    const surahInfo = SURAH_MAP[surahName];
    const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;

    let url: string;
    if (surahInfo) {
      url = `https://quran.com/${surahInfo.slug}/${versePath}`;
    } else {
      url = `https://quran.com/${chapter}/${versePath}`;
    }

    if (!seen.has(match[0])) {
      seen.add(match[0]);
      references.push({
        original: match[0],
        url,
        type: "quran",
      });
    }
  }

  // Pattern: Quran number:verse
  const quranPattern = /quran\s+(\d+):(\d+)(?:-(\d+))?/gi;
  while ((match = quranPattern.exec(text)) !== null) {
    const chapter = match[1];
    const startVerse = match[2];
    const endVerse = match[3];
    const versePath = endVerse ? `${startVerse}-${endVerse}` : startVerse;
    const url = `https://quran.com/${chapter}/${versePath}`;

    if (!seen.has(match[0])) {
      seen.add(match[0]);
      references.push({
        original: match[0],
        url,
        type: "quran",
      });
    }
  }

  // Find hadith references
  const hadithPattern = /(sahih\s+al-bukhari|sahih\s+bukhari|sahih\s+muslim|bukhari|muslim|tirmidhi|jami\s+at-tirmidhi|abu\s+dawud|abu\s+dawood|sunan\s+abu\s+dawud|nasai|sunan\s+an-nasai|ibn\s+majah|sunan\s+ibn\s+majah|malik|muwatta\s+malik|ahmad|musnad\s+ahmad|darimi|nawawi|40\s+nawawi|nawawi\s+40|riyadh\s+us\s+saliheen|riyadh\s+al-salihin|riyad\s+as-salihin)\s+(\d+)/gi;

  while ((match = hadithPattern.exec(text)) !== null) {
    const collectionName = match[1].toLowerCase();
    const hadithNumber = match[2];
    const collection = HADITH_COLLECTIONS[collectionName];

    if (collection && !seen.has(match[0])) {
      seen.add(match[0]);
      references.push({
        original: match[0],
        url: `https://sunnah.com/${collection}:${hadithNumber}`,
        type: "hadith",
      });
    }
  }

  return references;
}

/**
 * Convert all references in text to markdown links
 */
export function convertReferencesToLinks(text: string): string {
  let result = text;
  const references = findAllReferences(text);

  // Sort by length descending to avoid replacing substrings first
  references.sort((a, b) => b.original.length - a.original.length);

  for (const ref of references) {
    // Create markdown link
    const link = `[${ref.original}](${ref.url})`;
    // Replace all occurrences (but not already linked ones)
    const escapedOriginal = ref.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const notAlreadyLinked = new RegExp(`(?<!\\]\\()${escapedOriginal}(?!\\))`, 'gi');
    result = result.replace(notAlreadyLinked, link);
  }

  return result;
}

/**
 * Build a direct URL for a Quran verse
 */
export function buildQuranUrl(surah: number | string, verse: number | string, endVerse?: number | string): string {
  if (endVerse) {
    return `https://quran.com/${surah}/${verse}-${endVerse}`;
  }
  return `https://quran.com/${surah}/${verse}`;
}

/**
 * Build a direct URL for a hadith
 */
export function buildHadithUrl(collection: string, number: number | string): string {
  const normalizedCollection = HADITH_COLLECTIONS[collection.toLowerCase()] || collection.toLowerCase();
  return `https://sunnah.com/${normalizedCollection}:${number}`;
}
