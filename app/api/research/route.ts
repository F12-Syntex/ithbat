import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  WEB_RESEARCH_PROMPT,
  FORMATTING_PROMPT,
  TRANSLATION_PROMPT,
  buildPrompt,
  extractUrlsFromMarkdown,
} from "@/lib/prompts";
import {
  type Source,
  type ResearchStep,
} from "@/types/research";

async function fetchQuranVerse(surah: number, ayah: number): Promise<{ arabic: string; surahName: string } | null> {
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_key/${surah}:${ayah}?language=en&fields=text_uthmani`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const verse = json.verse;
    if (!verse?.text_uthmani) return null;
    return { arabic: verse.text_uthmani, surahName: `Chapter ${surah}` };
  } catch {
    return null;
  }
}

function extractQuranRefsFromFormatted(text: string): Array<{ surah: number; ayah: number; fullMatch: string }> {
  const refs: Array<{ surah: number; ayah: number; fullMatch: string }> = [];
  const seen = new Set<string>();

  // Match [Quran X:Y](url) patterns
  const linkPattern = /\[Quran\s+(\d{1,3}):(\d{1,3})(?:-\d+)?\]\(https?:\/\/quran\.com\/\d+\/\d+\)/gi;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const key = `${match[1]}:${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ surah: parseInt(match[1]), ayah: parseInt(match[2]), fullMatch: match[0] });
    }
  }

  // Also match bare "Quran X:Y" not already in a link
  const barePattern = /(?<!\[)Quran\s+(\d{1,3}):(\d{1,3})(?!\]|\()/gi;
  while ((match = barePattern.exec(text)) !== null) {
    const key = `${match[1]}:${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ surah: parseInt(match[1]), ayah: parseInt(match[2]), fullMatch: match[0] });
    }
  }

  return refs;
}

async function enrichQuranVerses(text: string): Promise<string> {
  const refs = extractQuranRefsFromFormatted(text);
  if (refs.length === 0) return text;

  // Fetch all verses in parallel (max 10)
  const fetches = refs.slice(0, 10).map(async (ref) => {
    const verse = await fetchQuranVerse(ref.surah, ref.ayah);
    return { ...ref, verse };
  });

  const results = await Promise.all(fetches);
  let enriched = text;

  for (const { surah, ayah, fullMatch, verse } of results) {
    if (!verse) continue;

    // Find blockquotes that precede or follow this reference and inject Arabic
    // Look for a blockquote near this reference that doesn't already have Arabic
    const linkUrl = `https://quran.com/${surah}/${ayah}`;
    const arabicLine = `> <span dir="rtl" class="quran-arabic">${verse.arabic}</span>\n>\n`;

    // If there's a blockquote right before the attribution line containing this reference,
    // inject the Arabic text at the start of that blockquote
    const attrPattern = new RegExp(
      `(>\\s*"[^"]*"\\s*\\n)\\n(—\\s*\\*\\*[^*]*\\*\\*[^\\n]*${linkUrl.replace(/\//g, '\\/')}[^\\n]*)`,
    );
    const attrMatch = enriched.match(attrPattern);
    if (attrMatch) {
      enriched = enriched.replace(attrPattern, `${arabicLine}${attrMatch[1]}\n${attrMatch[2]}`);
      continue;
    }

    // Fallback: convert bare "Quran X:Y" to a clickable link
    if (!fullMatch.startsWith('[')) {
      enriched = enriched.replace(
        fullMatch,
        `[${fullMatch}](${linkUrl})`,
      );
    }
  }

  return enriched;
}
import {
  createChat,
  appendToChat,
  resolveUniqueSlug,
  getSlugBySessionId,
} from "@/lib/conversation-logger";

function extractTermsFromResponse(text: string): string[] {
  const termPattern = /<term\s+data-meaning="[^"]*">([^<]+)<\/term>/g;
  const terms: string[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = termPattern.exec(text)) !== null) {
    const term = match[1].trim();
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      terms.push(term);
    }
  }
  return terms;
}

async function enrichTermDefinitions(
  text: string,
  client: ReturnType<typeof getOpenRouterClient>,
): Promise<string> {
  const terms = extractTermsFromResponse(text);
  if (terms.length === 0) return text;

  const prompt = `You are an Islamic studies expert. Define each of these Islamic terms in 2-6 words. Be precise and accurate. Return ONLY a JSON object mapping each term to its short English definition.

Terms: ${terms.join(", ")}

Example output format:
{"ijma'": "scholarly consensus", "qiyas": "analogical reasoning"}

Return ONLY valid JSON, no other text.`;

  let definitionsText = "";
  for await (const chunk of client.streamChat(
    [{ role: "user", content: prompt }],
    "QUICK",
  )) {
    definitionsText += chunk;
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = definitionsText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return text;

    const definitions: Record<string, string> = JSON.parse(jsonMatch[0]);
    let enriched = text;

    // Replace data-meaning attributes with accurate definitions
    for (const [term, meaning] of Object.entries(definitions)) {
      if (typeof meaning !== "string") continue;
      // Match the <term> tag containing this term (case-insensitive)
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `<term\\s+data-meaning="[^"]*">(${escapedTerm})<\\/term>`,
        "i",
      );
      const replacement = `<term data-meaning="${meaning.replace(/"/g, "&quot;")}">${term}</term>`;
      enriched = enriched.replace(pattern, replacement);
    }

    return enriched;
  } catch {
    // If parsing fails, return original text (terms keep their original meanings)
    return text;
  }
}

interface ResearchStepEvent {
  type:
    | "session_init"
    | "step_start"
    | "step_content"
    | "step_complete"
    | "source"
    | "response_start"
    | "response_content"
    | "error"
    | "done";
  sessionId?: string;
  slug?: string;
  step?: string;
  stepTitle?: string;
  content?: string;
  source?: Source;
  error?: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "source";
  }
}

interface ConversationTurn {
  query: string;
  response: string;
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
}

export async function POST(request: NextRequest) {
  // Extract and hash client IP for user identification in logs
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const userHash = ip !== "unknown" ? await hashIP(ip) : undefined;

  const {
    query,
    conversationHistory = [],
    sessionId: providedSessionId,
    language = "en",
  } = await request.json();
  const history = conversationHistory as ConversationTurn[];
  const sessionId = providedSessionId || crypto.randomUUID();
  const isFollowUp = history.length > 0;

  // Language mapping
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", ar: "Arabic", ja: "Japanese",
    ur: "Urdu", fr: "French", zh: "Chinese",
  };
  const LANGUAGE_NATIVE_NAMES: Record<string, string> = {
    en: "English", ar: "العربية", ja: "日本語",
    ur: "اردو", fr: "Français", zh: "中文",
  };
  const languageName = LANGUAGE_NAMES[language] || "English";
  const languageNativeName = LANGUAGE_NATIVE_NAMES[language] || "English";
  const needsTranslation = language !== "en";

  // Step title translations
  const STEP_TITLES: Record<string, Record<string, string>> = {
    en: { understanding: "Understanding your question", understandingFollowUp: "Understanding your follow-up", searching: "Searching Islamic sources", formatting: "Formatting response", translating: `Translating to ${languageNativeName}` },
    ar: { understanding: "فهم سؤالك", understandingFollowUp: "فهم متابعتك", searching: "البحث في المصادر الإسلامية", formatting: "تنسيق الإجابة", translating: `الترجمة إلى ${languageNativeName}` },
    ja: { understanding: "質問を理解中", understandingFollowUp: "フォローアップを理解中", searching: "イスラーム文献を検索中", formatting: "回答をフォーマット中", translating: `${languageNativeName}に翻訳中` },
    ur: { understanding: "آپ کا سوال سمجھ رہے ہیں", understandingFollowUp: "آپ کا فالو اپ سمجھ رہے ہیں", searching: "اسلامی ذرائع تلاش کر رہے ہیں", formatting: "جواب فارمیٹ کر رہے ہیں", translating: `${languageNativeName} میں ترجمہ کر رہے ہیں` },
    fr: { understanding: "Compréhension de votre question", understandingFollowUp: "Compréhension de votre suivi", searching: "Recherche des sources islamiques", formatting: "Mise en forme de la réponse", translating: `Traduction en ${languageNativeName}` },
    zh: { understanding: "理解您的问题", understandingFollowUp: "理解您的后续问题", searching: "搜索伊斯兰文献", formatting: "格式化回答", translating: `正在翻译为${languageNativeName}` },
  };
  const stepTitle = (key: string) => STEP_TITLES[language]?.[key] ?? STEP_TITLES.en[key] ?? key;

  // Resolve slug: generate new for first request, look up for follow-ups
  let slug: string | null = null;
  if (isFollowUp && providedSessionId) {
    slug = await getSlugBySessionId(providedSessionId);
  }
  if (!slug) {
    slug = await resolveUniqueSlug(query);
  }

  if (!query || typeof query !== "string") {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const allSources: Source[] = [];
      const allSteps: ResearchStep[] = [];
      let sourceId = 1;

      const send = (event: ResearchStepEvent) => {
        if (event.type === "source" && event.source) {
          event.source.id = sourceId++;
          allSources.push(event.source);
        }
        if (event.type === "step_start" && event.step) {
          allSteps.push({
            id: event.step,
            type: event.step,
            status: "in_progress",
            title: event.stepTitle || event.step,
            content: "",
            startTime: Date.now(),
          });
        }
        if (event.type === "step_complete" && event.step) {
          const step = allSteps.find((s) => s.id === event.step);
          if (step) {
            step.status = "completed";
            step.endTime = Date.now();
          }
        }
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      const client = getOpenRouterClient();

      try {
        send({ type: "session_init", sessionId, slug: slug! });

        // Build conversation context for follow-ups
        let conversationContext = "";
        if (history.length > 0) {
          conversationContext = "\n\n## PREVIOUS CONVERSATION CONTEXT:\n";
          for (const turn of history) {
            conversationContext += `\nPrevious Question: ${turn.query}\n`;
            conversationContext += `Previous Answer Summary: ${turn.response.slice(0, 1000)}${turn.response.length > 1000 ? "..." : ""}\n`;
          }
          conversationContext +=
            "\n---\nThis is a FOLLOW-UP question. Answer in context of the previous discussion.\n";
        }

        // ── Step 1: Understanding ──────────────────────────────────────
        send({
          type: "step_start",
          step: "understanding",
          stepTitle: isFollowUp
            ? stepTitle("understandingFollowUp")
            : stepTitle("understanding"),
        });

        const understandingPrompt = buildPrompt(UNDERSTANDING_PROMPT, {
          query: isFollowUp
            ? `[Follow-up Question] ${query}${conversationContext}`
            : query,
        });

        let understandingContent = "";
        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: understandingPrompt },
          ],
          "QUICK",
        )) {
          understandingContent += chunk;
          send({ type: "step_content", step: "understanding", content: chunk });
        }
        send({ type: "step_complete", step: "understanding" });

        // ── Step 2: Perplexity Search (always in English) ────────
        send({
          type: "step_start",
          step: "searching",
          stepTitle: stepTitle("searching"),
        });
        send({
          type: "step_content",
          step: "searching",
          content: ({
            en: "Searching the web for Islamic evidence...\n",
            ar: "البحث في الإنترنت عن الأدلة الإسلامية...\n",
            ja: "イスラームの証拠をウェブで検索中...\n",
            ur: "اسلامی شواہد کے لیے ویب تلاش کر رہے ہیں...\n",
            fr: "Recherche de preuves islamiques sur le web...\n",
            zh: "正在网上搜索伊斯兰证据...\n",
          } as Record<string, string>)[language] || "Searching the web for Islamic evidence...\n",
        });

        const researchPrompt = buildPrompt(WEB_RESEARCH_PROMPT, {
          query: isFollowUp ? `${query}${conversationContext}` : query,
        });

        let perplexityResponse = "";
        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: researchPrompt },
          ],
          "SEARCH",
        )) {
          perplexityResponse += chunk;
        }

        // Extract source URLs from Perplexity's response
        const foundUrls = extractUrlsFromMarkdown(perplexityResponse);
        const foundMsg = ({
          en: `Found ${foundUrls.length} source links\n`,
          ar: `تم العثور على ${foundUrls.length} رابط مصدر\n`,
          ja: `${foundUrls.length}件のソースリンクを発見\n`,
          ur: `${foundUrls.length} ماخذ لنکس ملے\n`,
          fr: `${foundUrls.length} liens de sources trouvés\n`,
          zh: `找到 ${foundUrls.length} 个来源链接\n`,
        } as Record<string, string>)[language] || `Found ${foundUrls.length} source links\n`;
        send({
          type: "step_content",
          step: "searching",
          content: foundMsg,
        });

        // Send Perplexity-found sources
        for (const { title, url } of foundUrls) {
          send({
            type: "source",
            source: {
              id: 0,
              title,
              url,
              domain: getDomainFromUrl(url),
              trusted: true,
            },
          });
        }

        send({ type: "step_complete", step: "searching" });

        // ── Step 3: Format the response (always in English first) ─────
        send({
          type: "step_start",
          step: "formatting",
          stepTitle: stepTitle("formatting"),
        });

        const formattingPrompt = buildPrompt(FORMATTING_PROMPT, {
          research: perplexityResponse,
          query,
        });

        let formattedResponse = "";
        for await (const chunk of client.streamChat(
          [{ role: "user", content: formattingPrompt }],
          "QUICK",
        )) {
          formattedResponse += chunk;
        }

        // Enrich Quran references with Arabic text
        formattedResponse = await enrichQuranVerses(formattedResponse);

        // Enrich Islamic term definitions with accurate LLM-generated meanings
        formattedResponse = await enrichTermDefinitions(formattedResponse, client);

        send({ type: "step_complete", step: "formatting" });

        // ── Step 4: Translate if needed ──────────────────────────────
        if (needsTranslation) {
          send({
            type: "step_start",
            step: "translating",
            stepTitle: stepTitle("translating"),
          });

          const translationPrompt = buildPrompt(TRANSLATION_PROMPT, {
            languageName,
            content: formattedResponse,
          });

          let translatedResponse = "";
          for await (const chunk of client.streamChat(
            [{ role: "user", content: translationPrompt }],
            "QUICK",
          )) {
            translatedResponse += chunk;
          }

          formattedResponse = translatedResponse;
          send({ type: "step_complete", step: "translating" });
        }

        // Send the complete formatted response at once (no streaming)
        send({ type: "response_start" });
        send({ type: "response_content", content: formattedResponse });

        // Log conversation to KV (must await before closing stream,
        // otherwise serverless function terminates before write completes)
        try {
          if (isFollowUp) {
            await appendToChat(slug!, query, formattedResponse, allSteps, allSources);
          } else {
            await createChat(slug!, sessionId, query, formattedResponse, allSteps, allSources, userHash);
          }
        } catch (err) {
          console.error("Failed to log conversation:", err);
        }

        send({ type: "done" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
