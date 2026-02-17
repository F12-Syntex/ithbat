/**
 * Evidence Extractor
 *
 * Extracts structured evidence from crawled pages using AI.
 * This creates a standardized data structure for all evidence types.
 */

import { getOpenRouterClient } from "./openrouter";

// ============================================
// EVIDENCE DATA TYPES
// ============================================

export interface HadithEvidence {
  id: string; // Unique ID for deduplication
  collection: string; // "Sahih Bukhari", "Sahih Muslim", etc.
  number: string; // Hadith number
  text: string; // English text
  arabicText?: string; // Arabic text if available
  grade: "sahih" | "hasan" | "daif" | "mawdu" | "unknown";
  narrator?: string; // Chain of narration summary
  chapter?: string; // Book/chapter name
  url: string; // Direct URL to hadith
  sourceUrl: string; // URL of page where this was found
}

export interface QuranEvidence {
  id: string; // Unique ID (surah:ayah)
  surah: number;
  surahName?: string; // "Al-Baqarah", etc.
  ayahStart: number;
  ayahEnd?: number; // For verse ranges
  arabicText?: string;
  translation: string;
  translationSource?: string; // "Sahih International", etc.
  url: string; // quran.com URL
  sourceUrl: string;
}

export interface ScholarlyOpinion {
  id: string; // Hash of quote for deduplication
  scholar?: string; // "Ibn Baz", "Ibn Uthaymeen", etc.
  quote: string; // The actual quote
  context?: string; // Context around the quote
  source: string; // "IslamQA", "Dar al-Ifta", etc.
  questionNumber?: string; // Fatwa/question number
  url: string;
  sourceUrl: string;
}

export interface FatwaRuling {
  id: string;
  title: string;
  question?: string;
  ruling: string; // "permissible", "prohibited", "recommended", etc.
  explanation: string;
  evidence?: string[]; // Evidence cited in the fatwa
  source: string;
  questionNumber?: string;
  url: string;
  sourceUrl: string;
}

export interface ExtractedEvidence {
  hadith: HadithEvidence[];
  quranVerses: QuranEvidence[];
  scholarlyOpinions: ScholarlyOpinion[];
  fatwas: FatwaRuling[];
  // Metadata
  sourcesProcessed: string[];
  extractionErrors: string[];
}

// ============================================
// EXTRACTION PROMPT
// ============================================

const EXTRACTION_PROMPT = `You are an Islamic evidence extractor. Extract ONLY Islamic evidence that is DIRECTLY RELEVANT to answering the research question.

## RESEARCH QUESTION:
{query}

## PAGE URL:
{url}

## PAGE CONTENT:
{content}

## YOUR TASK:

Extract ONLY evidence that DIRECTLY addresses or relates to the research question above.

**CRITICAL RELEVANCE FILTER:**
- Read the research question carefully first
- Only extract hadith/verses/opinions that help answer THIS SPECIFIC question
- Skip evidence that is merely on the same general topic but doesn't address the question
- Skip evidence that is about completely different subjects
- If a hadith is about a related but different topic, DO NOT include it

**RELEVANCE EXAMPLES:**
- Question: "Is eating shrimp halal?"
  - ✅ INCLUDE: Hadith about seafood being halal, verses about food permissibility
  - ❌ SKIP: Hadith about general halal/haram that doesn't mention seafood
  - ❌ SKIP: Hadith about meat slaughter (different topic)

- Question: "How to pray Isha?"
  - ✅ INCLUDE: Hadith about Isha prayer times, rakats, method
  - ❌ SKIP: General hadith about prayer virtue that doesn't explain Isha specifically
  - ❌ SKIP: Hadith about Fajr prayer (different prayer)

Return a JSON object with this EXACT structure:

{
  "hadith": [
    {
      "collection": "Sahih Bukhari",
      "number": "1234",
      "text": "The Prophet (ﷺ) said: '...'",
      "arabicText": "قال النبي صلى الله عليه وسلم...",
      "grade": "sahih",
      "narrator": "Narrated by Abu Hurairah",
      "chapter": "Book of Prayer"
    }
  ],
  "quranVerses": [
    {
      "surah": 2,
      "surahName": "Al-Baqarah",
      "ayahStart": 255,
      "ayahEnd": null,
      "arabicText": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ...",
      "translation": "Allah - there is no deity except Him...",
      "translationSource": "Sahih International"
    }
  ],
  "scholarlyOpinions": [
    {
      "scholar": "Ibn Baz",
      "quote": "The ruling on this matter is...",
      "context": "When asked about..."
    }
  ],
  "fatwas": [
    {
      "title": "Ruling on XYZ",
      "question": "What is the ruling on...",
      "ruling": "permissible",
      "explanation": "This is permissible because...",
      "evidence": ["Based on hadith...", "The Quran says..."]
    }
  ]
}

## EXTRACTION RULES:

**RULE #0 - RELEVANCE IS MANDATORY:**
Before extracting ANY evidence, ask: "Does this DIRECTLY help answer the research question?"
- If YES → Extract it
- If NO → Skip it completely
- If MAYBE → Only include if it's closely related, not tangentially related

1. **HADITH**: Extract ONLY hadith that directly address the research question
   - Skip hadith that are merely on the same general topic
   - Include the full text, not summaries
   - Identify the grade (sahih, hasan, daif) if mentioned
   - **CRITICAL - HADITH NUMBER**: Look VERY carefully for the actual number:
     * Look for patterns like "Bukhari 1234", "Muslim:1468", "Hadith 567"
     * Check the page URL for numbers like "/bukhari:1234" or "/muslim/1468"
     * Look for reference numbers in the text like "(1234)" or "No. 567"
     * If you find a number, use it. If NOT found, set number to null (don't guess!)

2. **QURAN VERSES**: Extract ONLY Quran verses that directly relate to the question
   - Skip verses that are about different topics
   - Include surah number and ayah number
   - Include both Arabic and translation if available
   - For verse ranges, specify ayahStart and ayahEnd

3. **SCHOLARLY OPINIONS**: Extract ONLY scholar quotes that address the specific question
   - Skip general Islamic advice that doesn't answer the question
   - Include the scholar's name if mentioned
   - Quote their exact words
   - Note the context

4. **FATWAS**: Extract ONLY fatwas that answer the research question
   - Skip fatwas on related but different topics
   - Include the ruling (halal/haram/makruh/etc)
   - Include the explanation and evidence cited

## HADITH NUMBER EXTRACTION - CRITICAL:

**Where to find hadith numbers:**
- In the text: "Sahih al-Bukhari 1894", "Muslim 1151", "(Hadith 234)"
- In the URL: sunnah.com/bukhari:5063 → number is 5063
- In references: "[Bukhari, Book 11, No. 578]" → number is 578
- Grade markers often have numbers: "Sahih (Al-Bukhari) 1234"

**If number is NOT found:**
- Set "number": null
- Do NOT make up a number or guess
- A wrong number is worse than no number

## IMPORTANT:
- Extract ONLY evidence that DIRECTLY answers the research question
- Quality over quantity - 3 relevant hadith are better than 30 unrelated ones
- Skip evidence that is merely on a similar topic but doesn't address the question
- Use EXACT text from the content, do not paraphrase
- If no RELEVANT evidence of a type is found, use empty array []
- Return ONLY valid JSON, no other text

## FINAL CHECK:
Before returning, review each extracted item and ask: "Does this help answer '{query}'?"
If not, remove it from the output.

JSON:`;

// ============================================
// URL PARSING HELPERS
// ============================================

/**
 * Extract hadith number from sunnah.com URL
 * Examples:
 * - https://sunnah.com/bukhari:1234 → { collection: "Sahih Bukhari", number: "1234" }
 * - https://sunnah.com/muslim/5/123 → { collection: "Sahih Muslim", number: "123" }
 */
function parseHadithUrl(
  url: string,
): { collection: string; number: string } | null {
  if (!url.includes("sunnah.com")) return null;

  // Pattern 1: sunnah.com/collection:number
  const colonPattern =
    /sunnah\.com\/(bukhari|muslim|tirmidhi|abudawud|nasai|ibnmajah|malik|ahmad|darimi|nawawi40|riyadussalihin|mishkat):(\d+)/i;
  const colonMatch = url.match(colonPattern);

  if (colonMatch) {
    return {
      collection: normalizeCollectionName(colonMatch[1]),
      number: colonMatch[2],
    };
  }

  // Pattern 2: sunnah.com/collection/book/number
  const slashPattern =
    /sunnah\.com\/(bukhari|muslim|tirmidhi|abudawud|nasai|ibnmajah|malik|ahmad)\/\d+\/(\d+)/i;
  const slashMatch = url.match(slashPattern);

  if (slashMatch) {
    return {
      collection: normalizeCollectionName(slashMatch[1]),
      number: slashMatch[2],
    };
  }

  return null;
}

function normalizeCollectionName(slug: string): string {
  const names: Record<string, string> = {
    bukhari: "Sahih Bukhari",
    muslim: "Sahih Muslim",
    tirmidhi: "Jami at-Tirmidhi",
    abudawud: "Sunan Abu Dawud",
    nasai: "Sunan an-Nasa'i",
    ibnmajah: "Sunan Ibn Majah",
    malik: "Muwatta Malik",
    ahmad: "Musnad Ahmad",
    darimi: "Sunan ad-Darimi",
    nawawi40: "40 Hadith Nawawi",
    riyadussalihin: "Riyad as-Salihin",
    mishkat: "Mishkat al-Masabih",
  };

  return names[slug.toLowerCase()] || slug;
}

/**
 * Extract fatwa number from IslamQA URL
 * Example: https://islamqa.info/en/answers/12345 → "12345"
 */
function parseFatwaUrl(url: string): string | null {
  // IslamQA pattern
  const islamqaMatch = url.match(/islamqa\.info\/\w+\/answers\/(\d+)/);

  if (islamqaMatch) return islamqaMatch[1];

  // IslamWeb pattern
  const islamwebMatch = url.match(/islamweb\.net\/\w+\/fatwa\/(\d+)/);

  if (islamwebMatch) return islamwebMatch[1];

  return null;
}

// ============================================
// EXTRACTION FUNCTION
// ============================================

export async function extractEvidenceFromPage(
  url: string,
  content: string,
  query: string,
  onProgress?: (message: string) => void,
): Promise<Partial<ExtractedEvidence>> {
  const client = getOpenRouterClient();

  // Parse hadith info from URL if it's a sunnah.com page
  const urlHadithInfo = parseHadithUrl(url);
  const urlFatwaNumber = parseFatwaUrl(url);

  // Limit content length to avoid token limits
  const truncatedContent = content.slice(0, 15000);

  // Add URL hint to help AI extract the right reference numbers
  let urlHint = "";

  if (urlHadithInfo) {
    urlHint = `\n\n**IMPORTANT: This page URL indicates this is ${urlHadithInfo.collection} hadith #${urlHadithInfo.number}. Use this exact number!**\n`;
  }
  if (urlFatwaNumber) {
    urlHint += `\n\n**IMPORTANT: This page URL indicates this is fatwa/answer #${urlFatwaNumber}. Include this number in your extraction!**\n`;
  }

  const prompt = EXTRACTION_PROMPT.replace("{url}", url)
    .replace("{content}", urlHint + truncatedContent)
    .replace("{query}", query);

  try {
    let response = "";

    for await (const chunk of client.streamChat(
      [
        {
          role: "system",
          content:
            "You are an Islamic evidence extractor. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      "QUICK",
    )) {
      response += chunk;
    }

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      onProgress?.(`⚠ Could not parse evidence from ${url}`);

      return { hadith: [], quranVerses: [], scholarlyOpinions: [], fatwas: [] };
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Process and add URLs/IDs
    const result: Partial<ExtractedEvidence> = {
      hadith: (extracted.hadith || []).map((h: any, i: number) => {
        // Use URL-parsed info if AI didn't extract a number
        let collection = h.collection;
        let number = h.number;

        // If we have URL-parsed info and AI didn't get the number, use URL info
        if (urlHadithInfo && (!number || number === "null")) {
          collection = urlHadithInfo.collection;
          number = urlHadithInfo.number;
        }

        return {
          ...h,
          collection,
          number,
          id: `${collection?.toLowerCase().replace(/\s+/g, "-")}-${number || i}`,
          grade: normalizeGrade(h.grade),
          url: buildHadithUrl(collection, number),
          sourceUrl: url,
        };
      }),
      quranVerses: (extracted.quranVerses || []).map((v: any) => ({
        ...v,
        id: `${v.surah}:${v.ayahStart}${v.ayahEnd ? `-${v.ayahEnd}` : ""}`,
        url: buildQuranUrl(v.surah, v.ayahStart, v.ayahEnd),
        sourceUrl: url,
      })),
      scholarlyOpinions: (extracted.scholarlyOpinions || []).map(
        (o: any, i: number) => ({
          ...o,
          id: `scholar-${hashString(o.quote || "")}-${i}`,
          source: extractSourceName(url),
          url: url,
          sourceUrl: url,
        }),
      ),
      fatwas: (extracted.fatwas || []).map((f: any, i: number) => ({
        ...f,
        id: `fatwa-${hashString(f.title || "")}-${i}`,
        source: extractSourceName(url),
        questionNumber: extractQuestionNumber(url),
        url: url,
        sourceUrl: url,
      })),
    };

    const totalEvidence =
      (result.hadith?.length || 0) +
      (result.quranVerses?.length || 0) +
      (result.scholarlyOpinions?.length || 0) +
      (result.fatwas?.length || 0);

    if (totalEvidence > 0) {
      onProgress?.(
        `✓ Extracted ${result.hadith?.length || 0} hadith, ${result.quranVerses?.length || 0} verses, ${result.scholarlyOpinions?.length || 0} opinions`,
      );
    }

    return result;
  } catch (error) {
    onProgress?.(`⚠ Extraction error for ${url}: ${error}`);

    return { hadith: [], quranVerses: [], scholarlyOpinions: [], fatwas: [] };
  }
}

// ============================================
// EVIDENCE ACCUMULATOR
// ============================================

export class EvidenceAccumulator {
  private evidence: ExtractedEvidence = {
    hadith: [],
    quranVerses: [],
    scholarlyOpinions: [],
    fatwas: [],
    sourcesProcessed: [],
    extractionErrors: [],
  };

  private seenIds = new Set<string>();

  /**
   * Add extracted evidence, deduplicating by ID
   */
  addEvidence(extracted: Partial<ExtractedEvidence>, sourceUrl: string): void {
    this.evidence.sourcesProcessed.push(sourceUrl);

    // Add hadith (deduplicate)
    for (const h of extracted.hadith || []) {
      if (!this.seenIds.has(h.id)) {
        this.seenIds.add(h.id);
        this.evidence.hadith.push(h);
      }
    }

    // Add Quran verses (deduplicate)
    for (const v of extracted.quranVerses || []) {
      if (!this.seenIds.has(v.id)) {
        this.seenIds.add(v.id);
        this.evidence.quranVerses.push(v);
      }
    }

    // Add scholarly opinions (deduplicate by quote hash)
    for (const o of extracted.scholarlyOpinions || []) {
      if (!this.seenIds.has(o.id)) {
        this.seenIds.add(o.id);
        this.evidence.scholarlyOpinions.push(o);
      }
    }

    // Add fatwas
    for (const f of extracted.fatwas || []) {
      if (!this.seenIds.has(f.id)) {
        this.seenIds.add(f.id);
        this.evidence.fatwas.push(f);
      }
    }
  }

  /**
   * Get all accumulated evidence
   */
  getEvidence(): ExtractedEvidence {
    return this.evidence;
  }

  /**
   * Get evidence summary
   */
  getSummary(): string {
    return `${this.evidence.hadith.length} hadith, ${this.evidence.quranVerses.length} Quran verses, ${this.evidence.scholarlyOpinions.length} scholarly opinions, ${this.evidence.fatwas.length} fatwas`;
  }

  /**
   * Check if we have minimum evidence (relaxed for faster results)
   */
  hasMinimumEvidence(): boolean {
    // Any evidence is enough - don't block on minimums
    const totalEvidence =
      this.evidence.hadith.length +
      this.evidence.quranVerses.length +
      this.evidence.scholarlyOpinions.length +
      this.evidence.fatwas.length;

    return totalEvidence >= 1;
  }

  /**
   * Get only sahih/hasan hadith
   */
  getAuthenticHadith(): HadithEvidence[] {
    return this.evidence.hadith.filter(
      (h) => h.grade === "sahih" || h.grade === "hasan",
    );
  }

  /**
   * Format evidence for AI synthesis
   */
  formatForSynthesis(): string {
    let output = "# EXTRACTED EVIDENCE\n\n";

    // Hadith
    if (this.evidence.hadith.length > 0) {
      output += "## HADITH EVIDENCE\n\n";
      for (const h of this.evidence.hadith) {
        // Check if we have a valid number
        const hasValidNumber =
          h.number &&
          h.number !== "null" &&
          h.number !== "undefined" &&
          h.number.trim() !== "" &&
          /\d/.test(h.number);

        const hadithRef = hasValidNumber
          ? `${h.collection} ${h.number}`
          : h.collection;

        output += `### ${hadithRef}\n`;
        output += `**Grade:** ${h.grade}\n`;
        if (h.narrator) output += `**Narrator:** ${h.narrator}\n`;
        if (h.arabicText) output += `**Arabic:** ${h.arabicText}\n`;
        output += `**Text:** ${h.text}\n`;

        // URL handling - CRITICAL: Only include if we have a verified number
        if (hasValidNumber && h.url && h.url.includes(":")) {
          // URL has format like sunnah.com/bukhari:1234
          output += `**URL:** ${h.url}\n`;
          output += `**HAS_VERIFIED_LINK:** YES\n`;
        } else {
          // NO verified number - explicitly tell AI not to create a link
          output += `**Source:** ${h.collection}\n`;
          output += `**HAS_VERIFIED_LINK:** NO - Do NOT create a sunnah.com link for this hadith. Just cite the collection name.\n`;
        }
        output += "\n";
      }
    }

    // Quran verses
    if (this.evidence.quranVerses.length > 0) {
      output += "## QURAN VERSES\n\n";
      for (const v of this.evidence.quranVerses) {
        const ref = v.ayahEnd
          ? `${v.surah}:${v.ayahStart}-${v.ayahEnd}`
          : `${v.surah}:${v.ayahStart}`;

        output += `### Quran ${ref}${v.surahName ? ` (${v.surahName})` : ""}\n`;
        if (v.arabicText) output += `**Arabic:** ${v.arabicText}\n`;
        output += `**Translation:** ${v.translation}\n`;
        if (v.translationSource)
          output += `**Source:** ${v.translationSource}\n`;
        output += `**URL:** ${v.url}\n\n`;
      }
    }

    // Scholarly opinions
    if (this.evidence.scholarlyOpinions.length > 0) {
      output += "## SCHOLARLY OPINIONS\n\n";
      for (const o of this.evidence.scholarlyOpinions) {
        output += `### ${o.scholar || "Scholar"} (${o.source})\n`;
        if (o.context) output += `**Context:** ${o.context}\n`;
        output += `**Quote:** "${o.quote}"\n`;
        output += `**URL:** ${o.url}\n\n`;
      }
    }

    // Fatwas
    if (this.evidence.fatwas.length > 0) {
      output += "## FATWA RULINGS\n\n";
      for (const f of this.evidence.fatwas) {
        output += `### ${f.title} (${f.source}${f.questionNumber ? ` #${f.questionNumber}` : ""})\n`;
        if (f.question) output += `**Question:** ${f.question}\n`;
        output += `**Ruling:** ${f.ruling}\n`;
        output += `**Explanation:** ${f.explanation}\n`;
        if (f.evidence && f.evidence.length > 0) {
          output += `**Evidence cited:** ${f.evidence.join("; ")}\n`;
        }
        output += `**URL:** ${f.url}\n\n`;
      }
    }

    return output;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeGrade(grade: string | undefined): HadithEvidence["grade"] {
  if (!grade) return "unknown";
  const lower = grade.toLowerCase();

  if (lower.includes("sahih") || lower === "authentic") return "sahih";
  if (lower.includes("hasan") || lower === "good") return "hasan";
  if (lower.includes("daif") || lower.includes("weak")) return "daif";
  if (lower.includes("mawdu") || lower.includes("fabricated")) return "mawdu";

  return "unknown";
}

function buildHadithUrl(
  collection: string | undefined,
  number: string | undefined,
): string {
  // Return empty if no collection
  if (!collection) return "";

  // Check if number is actually valid (not null, undefined, empty, or the string "null")
  const hasValidNumber =
    number &&
    number !== "null" &&
    number !== "undefined" &&
    number.trim() !== "" &&
    /\d/.test(number); // Must contain at least one digit

  const collectionMap: Record<string, string> = {
    "sahih bukhari": "bukhari",
    bukhari: "bukhari",
    "sahih muslim": "muslim",
    muslim: "muslim",
    tirmidhi: "tirmidhi",
    "jami at-tirmidhi": "tirmidhi",
    "abu dawud": "abudawud",
    "sunan abu dawud": "abudawud",
    nasai: "nasai",
    "sunan an-nasai": "nasai",
    "ibn majah": "ibnmajah",
    "sunan ibn majah": "ibnmajah",
    malik: "malik",
    "muwatta malik": "malik",
    ahmad: "ahmad",
    "musnad ahmad": "ahmad",
    nawawi: "nawawi40",
    "riyadh al-salihin": "riyadussalihin",
    "riyadh us saliheen": "riyadussalihin",
    darimi: "darimi",
    baihaqi: "mishkat", // Baihaqi often in Mishkat
    mishkat: "mishkat",
  };

  const slug =
    collectionMap[collection.toLowerCase()] ||
    collection.toLowerCase().replace(/\s+/g, "");

  // If no valid number, return EMPTY - do NOT create a link to wrong hadith
  if (!hasValidNumber) {
    return ""; // No link is better than wrong link
  }

  // Extract just the numeric part if there's extra text
  const numericPart = number.match(/\d+/)?.[0] || number;

  return `https://sunnah.com/${slug}:${numericPart}`;
}

function buildQuranUrl(
  surah: number,
  ayahStart: number,
  ayahEnd?: number,
): string {
  if (ayahEnd) {
    return `https://quran.com/${surah}/${ayahStart}-${ayahEnd}`;
  }

  return `https://quran.com/${surah}/${ayahStart}`;
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");

    if (hostname.includes("islamqa")) return "IslamQA";
    if (hostname.includes("sunnah")) return "Sunnah.com";
    if (hostname.includes("quran")) return "Quran.com";

    return hostname;
  } catch {
    return "Unknown";
  }
}

function extractQuestionNumber(url: string): string | undefined {
  const match = url.match(/answers\/(\d+)/);

  return match ? match[1] : undefined;
}

function hashString(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);

    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}
