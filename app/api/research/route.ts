import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  WEB_RESEARCH_PROMPT,
  FORMATTING_PROMPT,
  buildPrompt,
  extractUrlsFromMarkdown,
} from "@/lib/prompts";
import {
  type Source,
  type ResearchStep,
} from "@/types/research";

interface AlQuranAyah {
  text: string;
  surah: { englishName: string; number: number };
  numberInSurah: number;
}

interface AlQuranResponse {
  code: number;
  data: AlQuranAyah | AlQuranAyah[];
}

async function fetchQuranVerse(surah: number, ayah: number): Promise<{ arabic: string; surahName: string } | null> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-simple`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json() as AlQuranResponse;
    const data = Array.isArray(json.data) ? json.data[0] : json.data;
    return { arabic: data.text, surahName: data.surah.englishName };
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
import { logConversation } from "@/lib/conversation-logger";

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

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || undefined;

  const {
    query,
    conversationHistory = [],
    sessionId: providedSessionId,
  } = await request.json();
  const history = conversationHistory as ConversationTurn[];
  const sessionId = providedSessionId || crypto.randomUUID();
  const isFollowUp = history.length > 0;

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
        send({ type: "session_init", sessionId });

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
            ? "Understanding your follow-up"
            : "Understanding your question",
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

        // ── Step 2: Perplexity Search (stream directly to user) ────────
        send({
          type: "step_start",
          step: "searching",
          stepTitle: "Searching Islamic sources",
        });
        send({
          type: "step_content",
          step: "searching",
          content: "Searching the web for Islamic evidence...\n",
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
        send({
          type: "step_content",
          step: "searching",
          content: `Found ${foundUrls.length} source links\n`,
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

        // ── Step 3: Format & stream the final response ───────────────
        send({
          type: "step_start",
          step: "formatting",
          stepTitle: "Formatting response",
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

        // Enrich Quran references with Arabic text from alquran.cloud
        formattedResponse = await enrichQuranVerses(formattedResponse);

        send({ type: "step_complete", step: "formatting" });

        // Send the complete formatted response at once (no streaming)
        send({ type: "response_start" });
        send({ type: "response_content", content: formattedResponse });

        // Log conversation
        logConversation(
          sessionId,
          query,
          formattedResponse,
          allSteps,
          allSources,
          isFollowUp,
          { ip, userAgent },
        ).catch((err) => console.error("Failed to log conversation:", err));

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
