/**
 * Quran Surah Reference Map
 * Contains all 114 surahs with their names and total ayahs
 */

export interface SurahInfo {
  number: number;
  name: string; // Arabic transliteration
  englishName: string; // English meaning
  ayahs: number; // Total verses
}

export const SURAH_MAP: Record<number, SurahInfo> = {
  1: { number: 1, name: "Al-Fatihah", englishName: "The Opening", ayahs: 7 },
  2: { number: 2, name: "Al-Baqarah", englishName: "The Cow", ayahs: 286 },
  3: {
    number: 3,
    name: "Aal-E-Imran",
    englishName: "The Family of Imran",
    ayahs: 200,
  },
  4: { number: 4, name: "An-Nisa", englishName: "The Women", ayahs: 176 },
  5: {
    number: 5,
    name: "Al-Ma'idah",
    englishName: "The Table Spread",
    ayahs: 120,
  },
  6: { number: 6, name: "Al-An'am", englishName: "The Cattle", ayahs: 165 },
  7: { number: 7, name: "Al-A'raf", englishName: "The Heights", ayahs: 206 },
  8: {
    number: 8,
    name: "Al-Anfal",
    englishName: "The Spoils of War",
    ayahs: 75,
  },
  9: {
    number: 9,
    name: "At-Tawbah",
    englishName: "The Repentance",
    ayahs: 129,
  },
  10: { number: 10, name: "Yunus", englishName: "Jonah", ayahs: 109 },
  11: { number: 11, name: "Hud", englishName: "Hud", ayahs: 123 },
  12: { number: 12, name: "Yusuf", englishName: "Joseph", ayahs: 111 },
  13: { number: 13, name: "Ar-Ra'd", englishName: "The Thunder", ayahs: 43 },
  14: { number: 14, name: "Ibrahim", englishName: "Abraham", ayahs: 52 },
  15: {
    number: 15,
    name: "Al-Hijr",
    englishName: "The Rocky Tract",
    ayahs: 99,
  },
  16: { number: 16, name: "An-Nahl", englishName: "The Bee", ayahs: 128 },
  17: {
    number: 17,
    name: "Al-Isra",
    englishName: "The Night Journey",
    ayahs: 111,
  },
  18: { number: 18, name: "Al-Kahf", englishName: "The Cave", ayahs: 110 },
  19: { number: 19, name: "Maryam", englishName: "Mary", ayahs: 98 },
  20: { number: 20, name: "Ta-Ha", englishName: "Ta-Ha", ayahs: 135 },
  21: {
    number: 21,
    name: "Al-Anbiya",
    englishName: "The Prophets",
    ayahs: 112,
  },
  22: { number: 22, name: "Al-Hajj", englishName: "The Pilgrimage", ayahs: 78 },
  23: {
    number: 23,
    name: "Al-Mu'minun",
    englishName: "The Believers",
    ayahs: 118,
  },
  24: { number: 24, name: "An-Nur", englishName: "The Light", ayahs: 64 },
  25: {
    number: 25,
    name: "Al-Furqan",
    englishName: "The Criterion",
    ayahs: 77,
  },
  26: { number: 26, name: "Ash-Shu'ara", englishName: "The Poets", ayahs: 227 },
  27: { number: 27, name: "An-Naml", englishName: "The Ant", ayahs: 93 },
  28: { number: 28, name: "Al-Qasas", englishName: "The Stories", ayahs: 88 },
  29: { number: 29, name: "Al-Ankabut", englishName: "The Spider", ayahs: 69 },
  30: { number: 30, name: "Ar-Rum", englishName: "The Romans", ayahs: 60 },
  31: { number: 31, name: "Luqman", englishName: "Luqman", ayahs: 34 },
  32: {
    number: 32,
    name: "As-Sajdah",
    englishName: "The Prostration",
    ayahs: 30,
  },
  33: {
    number: 33,
    name: "Al-Ahzab",
    englishName: "The Combined Forces",
    ayahs: 73,
  },
  34: { number: 34, name: "Saba", englishName: "Sheba", ayahs: 54 },
  35: { number: 35, name: "Fatir", englishName: "The Originator", ayahs: 45 },
  36: { number: 36, name: "Ya-Sin", englishName: "Ya-Sin", ayahs: 83 },
  37: {
    number: 37,
    name: "As-Saffat",
    englishName: "Those Ranged in Ranks",
    ayahs: 182,
  },
  38: { number: 38, name: "Sad", englishName: "Sad", ayahs: 88 },
  39: { number: 39, name: "Az-Zumar", englishName: "The Groups", ayahs: 75 },
  40: { number: 40, name: "Ghafir", englishName: "The Forgiver", ayahs: 85 },
  41: {
    number: 41,
    name: "Fussilat",
    englishName: "Explained in Detail",
    ayahs: 54,
  },
  42: {
    number: 42,
    name: "Ash-Shura",
    englishName: "The Consultation",
    ayahs: 53,
  },
  43: {
    number: 43,
    name: "Az-Zukhruf",
    englishName: "The Gold Adornments",
    ayahs: 89,
  },
  44: { number: 44, name: "Ad-Dukhan", englishName: "The Smoke", ayahs: 59 },
  45: {
    number: 45,
    name: "Al-Jathiyah",
    englishName: "The Kneeling",
    ayahs: 37,
  },
  46: {
    number: 46,
    name: "Al-Ahqaf",
    englishName: "The Wind-Curved Sandhills",
    ayahs: 35,
  },
  47: { number: 47, name: "Muhammad", englishName: "Muhammad", ayahs: 38 },
  48: { number: 48, name: "Al-Fath", englishName: "The Victory", ayahs: 29 },
  49: { number: 49, name: "Al-Hujurat", englishName: "The Rooms", ayahs: 18 },
  50: { number: 50, name: "Qaf", englishName: "Qaf", ayahs: 45 },
  51: {
    number: 51,
    name: "Adh-Dhariyat",
    englishName: "The Winnowing Winds",
    ayahs: 60,
  },
  52: { number: 52, name: "At-Tur", englishName: "The Mount", ayahs: 49 },
  53: { number: 53, name: "An-Najm", englishName: "The Star", ayahs: 62 },
  54: { number: 54, name: "Al-Qamar", englishName: "The Moon", ayahs: 55 },
  55: {
    number: 55,
    name: "Ar-Rahman",
    englishName: "The Most Merciful",
    ayahs: 78,
  },
  56: { number: 56, name: "Al-Waqi'ah", englishName: "The Event", ayahs: 96 },
  57: { number: 57, name: "Al-Hadid", englishName: "The Iron", ayahs: 29 },
  58: {
    number: 58,
    name: "Al-Mujadilah",
    englishName: "The Pleading Woman",
    ayahs: 22,
  },
  59: { number: 59, name: "Al-Hashr", englishName: "The Exile", ayahs: 24 },
  60: {
    number: 60,
    name: "Al-Mumtahanah",
    englishName: "She That is Examined",
    ayahs: 13,
  },
  61: { number: 61, name: "As-Saff", englishName: "The Ranks", ayahs: 14 },
  62: {
    number: 62,
    name: "Al-Jumu'ah",
    englishName: "The Congregation",
    ayahs: 11,
  },
  63: {
    number: 63,
    name: "Al-Munafiqun",
    englishName: "The Hypocrites",
    ayahs: 11,
  },
  64: {
    number: 64,
    name: "At-Taghabun",
    englishName: "The Mutual Disillusion",
    ayahs: 18,
  },
  65: { number: 65, name: "At-Talaq", englishName: "The Divorce", ayahs: 12 },
  66: {
    number: 66,
    name: "At-Tahrim",
    englishName: "The Prohibition",
    ayahs: 12,
  },
  67: {
    number: 67,
    name: "Al-Mulk",
    englishName: "The Sovereignty",
    ayahs: 30,
  },
  68: { number: 68, name: "Al-Qalam", englishName: "The Pen", ayahs: 52 },
  69: { number: 69, name: "Al-Haqqah", englishName: "The Reality", ayahs: 52 },
  70: {
    number: 70,
    name: "Al-Ma'arij",
    englishName: "The Ascending Stairways",
    ayahs: 44,
  },
  71: { number: 71, name: "Nuh", englishName: "Noah", ayahs: 28 },
  72: { number: 72, name: "Al-Jinn", englishName: "The Jinn", ayahs: 28 },
  73: {
    number: 73,
    name: "Al-Muzzammil",
    englishName: "The Enshrouded One",
    ayahs: 20,
  },
  74: {
    number: 74,
    name: "Al-Muddaththir",
    englishName: "The Cloaked One",
    ayahs: 56,
  },
  75: {
    number: 75,
    name: "Al-Qiyamah",
    englishName: "The Resurrection",
    ayahs: 40,
  },
  76: { number: 76, name: "Al-Insan", englishName: "The Human", ayahs: 31 },
  77: {
    number: 77,
    name: "Al-Mursalat",
    englishName: "Those Sent Forth",
    ayahs: 50,
  },
  78: { number: 78, name: "An-Naba", englishName: "The Tidings", ayahs: 40 },
  79: {
    number: 79,
    name: "An-Nazi'at",
    englishName: "Those Who Drag Forth",
    ayahs: 46,
  },
  80: { number: 80, name: "Abasa", englishName: "He Frowned", ayahs: 42 },
  81: {
    number: 81,
    name: "At-Takwir",
    englishName: "The Overthrowing",
    ayahs: 29,
  },
  82: {
    number: 82,
    name: "Al-Infitar",
    englishName: "The Cleaving",
    ayahs: 19,
  },
  83: {
    number: 83,
    name: "Al-Mutaffifin",
    englishName: "The Defrauding",
    ayahs: 36,
  },
  84: {
    number: 84,
    name: "Al-Inshiqaq",
    englishName: "The Sundering",
    ayahs: 25,
  },
  85: {
    number: 85,
    name: "Al-Buruj",
    englishName: "The Mansions of the Stars",
    ayahs: 22,
  },
  86: {
    number: 86,
    name: "At-Tariq",
    englishName: "The Nightcomer",
    ayahs: 17,
  },
  87: { number: 87, name: "Al-A'la", englishName: "The Most High", ayahs: 19 },
  88: {
    number: 88,
    name: "Al-Ghashiyah",
    englishName: "The Overwhelming",
    ayahs: 26,
  },
  89: { number: 89, name: "Al-Fajr", englishName: "The Dawn", ayahs: 30 },
  90: { number: 90, name: "Al-Balad", englishName: "The City", ayahs: 20 },
  91: { number: 91, name: "Ash-Shams", englishName: "The Sun", ayahs: 15 },
  92: { number: 92, name: "Al-Layl", englishName: "The Night", ayahs: 21 },
  93: {
    number: 93,
    name: "Ad-Duhaa",
    englishName: "The Morning Hours",
    ayahs: 11,
  },
  94: { number: 94, name: "Ash-Sharh", englishName: "The Relief", ayahs: 8 },
  95: { number: 95, name: "At-Tin", englishName: "The Fig", ayahs: 8 },
  96: { number: 96, name: "Al-Alaq", englishName: "The Clot", ayahs: 19 },
  97: { number: 97, name: "Al-Qadr", englishName: "The Power", ayahs: 5 },
  98: {
    number: 98,
    name: "Al-Bayyinah",
    englishName: "The Clear Proof",
    ayahs: 8,
  },
  99: {
    number: 99,
    name: "Az-Zalzalah",
    englishName: "The Earthquake",
    ayahs: 8,
  },
  100: {
    number: 100,
    name: "Al-Adiyat",
    englishName: "The Courser",
    ayahs: 11,
  },
  101: {
    number: 101,
    name: "Al-Qari'ah",
    englishName: "The Calamity",
    ayahs: 11,
  },
  102: {
    number: 102,
    name: "At-Takathur",
    englishName: "The Rivalry in Worldly Increase",
    ayahs: 8,
  },
  103: {
    number: 103,
    name: "Al-Asr",
    englishName: "The Declining Day",
    ayahs: 3,
  },
  104: {
    number: 104,
    name: "Al-Humazah",
    englishName: "The Traducer",
    ayahs: 9,
  },
  105: { number: 105, name: "Al-Fil", englishName: "The Elephant", ayahs: 5 },
  106: { number: 106, name: "Quraysh", englishName: "Quraysh", ayahs: 4 },
  107: {
    number: 107,
    name: "Al-Ma'un",
    englishName: "The Small Kindnesses",
    ayahs: 7,
  },
  108: {
    number: 108,
    name: "Al-Kawthar",
    englishName: "The Abundance",
    ayahs: 3,
  },
  109: {
    number: 109,
    name: "Al-Kafirun",
    englishName: "The Disbelievers",
    ayahs: 6,
  },
  110: {
    number: 110,
    name: "An-Nasr",
    englishName: "The Divine Support",
    ayahs: 3,
  },
  111: {
    number: 111,
    name: "Al-Masad",
    englishName: "The Palm Fiber",
    ayahs: 5,
  },
  112: {
    number: 112,
    name: "Al-Ikhlas",
    englishName: "The Sincerity",
    ayahs: 4,
  },
  113: { number: 113, name: "Al-Falaq", englishName: "The Daybreak", ayahs: 5 },
  114: { number: 114, name: "An-Nas", englishName: "Mankind", ayahs: 6 },
};

/**
 * Get surah info by number
 */
export function getSurahInfo(surahNumber: number): SurahInfo | null {
  return SURAH_MAP[surahNumber] || null;
}

/**
 * Format a Quran reference for display
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number
 * @returns Formatted string like "Quran 25:11 (Al-Furqan)"
 */
export function formatQuranReference(surah: number, ayah: number): string {
  const info = getSurahInfo(surah);

  if (!info) return `Quran ${surah}:${ayah}`;

  return `Quran ${surah}:${ayah} (${info.name})`;
}

/**
 * Get the Quran.com URL for a verse
 */
export function getQuranUrl(surah: number, ayah: number): string {
  return `https://quran.com/${surah}/${ayah}`;
}

/**
 * Parse a Quran URL to extract surah and ayah
 * Supports formats:
 * - quran.com/25/11
 * - quran.com/25:11
 * - quran.com/al-furqan/11
 */
export function parseQuranUrl(
  url: string,
): { surah: number; ayah: number } | null {
  // Pattern: quran.com/NUMBER/NUMBER or quran.com/NUMBER:NUMBER
  const numericMatch = url.match(/quran\.com\/(\d+)[/:](\d+)/);

  if (numericMatch) {
    return {
      surah: parseInt(numericMatch[1]),
      ayah: parseInt(numericMatch[2]),
    };
  }

  return null;
}

/**
 * Generate AI-friendly Quran reference info
 * This is used in prompts to help the AI format Quran citations
 */
export function getQuranReferenceGuide(): string {
  return `
## QURAN CITATION FORMAT

When citing Quran verses, use this format:
[Quran SURAH:AYAH](https://quran.com/SURAH/AYAH)

Examples:
- [Quran 2:255](https://quran.com/2/255) - Ayatul Kursi
- [Quran 25:11](https://quran.com/25/11) - From Al-Furqan
- [Quran 4:93](https://quran.com/4/93) - From An-Nisa

Common scary/warning verses to consider:
- [Quran 4:93](https://quran.com/4/93) - Killing a believer intentionally
- [Quran 99:1-8](https://quran.com/99/1) - The Earthquake (Az-Zalzalah)
- [Quran 101:1-11](https://quran.com/101/1) - The Calamity (Al-Qari'ah)
- [Quran 69:1-37](https://quran.com/69/1) - The Reality (Al-Haqqah)
- [Quran 78:1-40](https://quran.com/78/1) - The Tidings (An-Naba)
- [Quran 56:1-96](https://quran.com/56/1) - The Event (Al-Waqi'ah)
- [Quran 18:49](https://quran.com/18/49) - Book of Deeds
- [Quran 3:185](https://quran.com/3/185) - Every soul will taste death

URL FORMAT: https://quran.com/SURAH/AYAH (e.g., https://quran.com/25/11)
`;
}
