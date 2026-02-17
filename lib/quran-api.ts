/**
 * Quran API Utility
 *
 * Fetches accurate Quran verse text from the Al-Quran Cloud API.
 * Uses caching to avoid repeated API calls for the same verses.
 */

// In-memory cache for fetched verses (persists during the research session)
const verseCache = new Map<string, QuranVerse>();

export interface QuranVerse {
  surah: number;
  ayah: number;
  arabicText?: string;
  translation: string;
  translationSource: string;
  surahName: string;
  surahNameArabic: string;
}

export interface QuranApiResponse {
  code: number;
  status: string;
  data: {
    number: number;
    text: string;
    edition: {
      identifier: string;
      language: string;
      name: string;
      englishName: string;
      format: string;
      type: string;
    };
    surah: {
      number: number;
      name: string;
      englishName: string;
      englishNameTranslation: string;
      numberOfAyahs: number;
      revelationType: string;
    };
    numberInSurah: number;
  };
}

/**
 * Parse a Quran reference string into surah and ayah numbers
 * Supports formats like: "2:255", "Quran 2:255", "al-Baqarah 2:255", etc.
 */
export function parseQuranReference(
  reference: string,
): { surah: number; ayah: number; ayahEnd?: number } | null {
  // Match patterns like "2:255", "2:255-256", "Quran 2:255"
  const match = reference.match(/(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?/);

  if (match) {
    const surah = parseInt(match[1], 10);
    const ayah = parseInt(match[2], 10);
    const ayahEnd = match[3] ? parseInt(match[3], 10) : undefined;

    // Validate surah (1-114) and ayah ranges
    if (surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 300) {
      return { surah, ayah, ayahEnd };
    }
  }

  return null;
}

/**
 * Fetch a single verse from the Al-Quran Cloud API
 */
async function fetchVerseFromApi(
  surah: number,
  ayah: number,
  edition: string = "en.sahih",
): Promise<QuranVerse | null> {
  const cacheKey = `${surah}:${ayah}:${edition}`;

  // Check cache first
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  try {
    // Fetch translation
    const translationResponse = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${edition}`,
      { signal: AbortSignal.timeout(5000) }, // 5 second timeout
    );

    if (!translationResponse.ok) {
      console.error(
        `Failed to fetch verse ${surah}:${ayah}: ${translationResponse.status}`,
      );

      return null;
    }

    const translationData: QuranApiResponse = await translationResponse.json();

    // Fetch Arabic text
    let arabicText: string | undefined;

    try {
      const arabicResponse = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`,
        { signal: AbortSignal.timeout(5000) },
      );

      if (arabicResponse.ok) {
        const arabicData: QuranApiResponse = await arabicResponse.json();

        arabicText = arabicData.data.text;
      }
    } catch {
      // Arabic fetch failed, continue without it
    }

    const verse: QuranVerse = {
      surah,
      ayah,
      arabicText,
      translation: translationData.data.text,
      translationSource: translationData.data.edition.englishName,
      surahName: translationData.data.surah.englishName,
      surahNameArabic: translationData.data.surah.name,
    };

    // Cache the result
    verseCache.set(cacheKey, verse);

    return verse;
  } catch (error) {
    console.error(`Error fetching verse ${surah}:${ayah}:`, error);

    return null;
  }
}

/**
 * Fetch a verse or range of verses
 */
export async function fetchQuranVerse(
  surah: number,
  ayahStart: number,
  ayahEnd?: number,
): Promise<QuranVerse[] | null> {
  const verses: QuranVerse[] = [];

  const end = ayahEnd || ayahStart;

  // Limit to max 10 verses at a time to avoid API abuse
  const maxVerses = Math.min(end - ayahStart + 1, 10);

  for (let ayah = ayahStart; ayah < ayahStart + maxVerses; ayah++) {
    const verse = await fetchVerseFromApi(surah, ayah);

    if (verse) {
      verses.push(verse);
    }
  }

  return verses.length > 0 ? verses : null;
}

/**
 * Fetch verse by reference string (e.g., "2:255" or "Quran 2:255-256")
 */
export async function fetchVerseByReference(
  reference: string,
): Promise<QuranVerse[] | null> {
  const parsed = parseQuranReference(reference);

  if (!parsed) {
    return null;
  }

  return fetchQuranVerse(parsed.surah, parsed.ayah, parsed.ayahEnd);
}

/**
 * Format a verse for display in the response
 */
export function formatVerseForDisplay(verses: QuranVerse[]): string {
  if (verses.length === 0) return "";

  const first = verses[0];
  const last = verses[verses.length - 1];

  const reference =
    verses.length > 1
      ? `${first.surah}:${first.ayah}-${last.ayah}`
      : `${first.surah}:${first.ayah}`;

  // Combine verse texts
  const arabicText = verses
    .filter((v) => v.arabicText)
    .map((v) => v.arabicText)
    .join(" ");

  const translationText = verses.map((v) => v.translation).join(" ");

  let formatted = "";

  if (arabicText) {
    formatted += `**Arabic:** ${arabicText}\n\n`;
  }

  formatted += `**Translation (${first.translationSource}):** "${translationText}"`;

  return formatted;
}

/**
 * Extract all Quran references from text and fetch them
 */
export async function fetchAllQuranReferences(
  text: string,
): Promise<Map<string, QuranVerse[]>> {
  const results = new Map<string, QuranVerse[]>();

  // Find all Quran references in text
  const refPattern =
    /(?:Quran|Qur'an|Surah)\s*(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?/gi;
  const matches = text.matchAll(refPattern);

  for (const match of matches) {
    const surah = parseInt(match[1], 10);
    const ayahStart = parseInt(match[2], 10);
    const ayahEnd = match[3] ? parseInt(match[3], 10) : undefined;

    const key = ayahEnd
      ? `${surah}:${ayahStart}-${ayahEnd}`
      : `${surah}:${ayahStart}`;

    // Skip if already fetched
    if (results.has(key)) continue;

    const verses = await fetchQuranVerse(surah, ayahStart, ayahEnd);

    if (verses) {
      results.set(key, verses);
    }
  }

  return results;
}

/**
 * Clear the verse cache (useful for testing or memory management)
 */
export function clearVerseCache(): void {
  verseCache.clear();
}

/**
 * Get cache size (for debugging)
 */
export function getVerseCacheSize(): number {
  return verseCache.size;
}
