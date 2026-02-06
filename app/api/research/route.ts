import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  WEB_RESEARCH_PROMPT,
  buildPrompt,
  extractUrlsFromMarkdown,
} from "@/lib/prompts";
import {
  EvidenceAccumulator,
  extractEvidenceFromPage,
  type ExtractedEvidence,
} from "@/lib/evidence-extractor";
import { crawlUrls, type CrawledPage } from "@/lib/crawler";
import {
  type Source,
  type ResearchStep,
} from "@/types/research";
import { logConversation } from "@/lib/conversation-logger";

// Evidence item for streaming
interface StreamedEvidence {
  type: "hadith" | "quran" | "scholar" | "fatwa";
  title: string;
  content: string;
  source: string;
  url: string;
  grade?: string;
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
  step?: string;
  stepTitle?: string;
  content?: string;
  source?: Source;
  error?: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Helper to stream evidence items from extracted data
function streamExtractedEvidence(
  extracted: Partial<ExtractedEvidence>,
  send: (event: ResearchStepEvent) => void,
): void {
  for (const h of extracted.hadith || []) {
    const title = h.number ? `${h.collection} ${h.number}` : h.collection;
    send({
      type: "source",
      source: {
        id: 0, // will be overwritten
        title,
        url: h.url || h.sourceUrl,
        domain: getDomainFromUrl(h.url || h.sourceUrl),
        trusted: true,
      },
    });
  }

  for (const v of extracted.quranVerses || []) {
    const ref = v.ayahEnd
      ? `${v.surah}:${v.ayahStart}-${v.ayahEnd}`
      : `${v.surah}:${v.ayahStart}`;
    send({
      type: "source",
      source: {
        id: 0,
        title: `Quran ${ref}${v.surahName ? ` (${v.surahName})` : ""}`,
        url: v.url,
        domain: getDomainFromUrl(v.url),
        trusted: true,
      },
    });
  }

  for (const o of extracted.scholarlyOpinions || []) {
    send({
      type: "source",
      source: {
        id: 0,
        title: o.scholar || "Scholarly Opinion",
        url: o.url,
        domain: getDomainFromUrl(o.url),
        trusted: true,
      },
    });
  }

  for (const f of extracted.fatwas || []) {
    send({
      type: "source",
      source: {
        id: 0,
        title: f.title || "Fatwa",
        url: f.url,
        domain: getDomainFromUrl(f.url),
        trusted: true,
      },
    });
  }
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "source";
  }
}

// Format evidence directly as markdown (no AI needed)
function formatEvidenceAsMarkdown(accumulator: EvidenceAccumulator): string {
  const evidence = accumulator.getEvidence();
  const parts: string[] = [];

  if (evidence.quranVerses.length > 0) {
    parts.push("## Quran\n");
    for (const v of evidence.quranVerses) {
      const ref = v.ayahEnd
        ? `${v.surah}:${v.ayahStart}-${v.ayahEnd}`
        : `${v.surah}:${v.ayahStart}`;
      const surahName = v.surahName ? ` (${v.surahName})` : "";
      const url = v.url || `https://quran.com/${v.surah}/${v.ayahStart}`;
      parts.push(`**[Quran ${ref}${surahName}](${url})**`);
      if (v.arabicText) parts.push(`\n> ${v.arabicText}`);
      if (v.translation) parts.push(`\n"${v.translation}"`);
      parts.push("\n");
    }
  }

  if (evidence.hadith.length > 0) {
    parts.push("\n## Hadith\n");
    for (const h of evidence.hadith) {
      const title = h.number ? `${h.collection} ${h.number}` : h.collection;
      const gradeLabel = h.grade && h.grade !== "unknown" ? ` — *${h.grade}*` : "";
      const url = h.url || h.sourceUrl;
      if (url) {
        parts.push(`**[${title}](${url})**${gradeLabel}`);
      } else {
        parts.push(`**${title}**${gradeLabel}`);
      }
      if (h.arabicText) parts.push(`\n> ${h.arabicText}`);
      if (h.text) parts.push(`\n"${h.text}"`);
      if (h.narrator) parts.push(`\n— Narrated by ${h.narrator}`);
      parts.push("\n");
    }
  }

  if (evidence.scholarlyOpinions.length > 0) {
    parts.push("\n## Scholarly Opinions\n");
    for (const o of evidence.scholarlyOpinions) {
      const scholar = o.scholar || "Scholar";
      if (o.url) {
        parts.push(`**[${scholar}](${o.url})**`);
      } else {
        parts.push(`**${scholar}**`);
      }
      if (o.quote) parts.push(`\n"${o.quote}"`);
      if (o.source && o.source !== scholar) parts.push(`\n— ${o.source}`);
      parts.push("\n");
    }
  }

  if (evidence.fatwas.length > 0) {
    parts.push("\n## Fatwas\n");
    for (const f of evidence.fatwas) {
      const title = f.title || "Fatwa";
      if (f.url) {
        parts.push(`**[${title}](${f.url})**`);
      } else {
        parts.push(`**${title}**`);
      }
      if (f.ruling) parts.push(`\n**Ruling:** ${f.ruling}`);
      if (f.explanation) parts.push(`\n${f.explanation}`);
      if (f.source) parts.push(`\n— ${f.source}`);
      parts.push("\n");
    }
  }

  if (parts.length === 0) {
    return "";
  }

  return parts.join("\n");
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
        // Assign source IDs
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

        // ── Step 2: Perplexity Search ──────────────────────────────────
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

        // Send Perplexity-found sources immediately
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

        // ── Step 3: Crawl & Extract Evidence ───────────────────────────
        const evidenceAccumulator = new EvidenceAccumulator();
        let hasExtractedEvidence = false;

        if (foundUrls.length > 0) {
          send({
            type: "step_start",
            step: "exploring",
            stepTitle: "Exploring sources",
          });

          const urlsToCrawl = foundUrls
            .map((u) => u.url)
            .slice(0, 8); // Limit to 8 URLs

          send({
            type: "step_content",
            step: "exploring",
            content: `Crawling ${urlsToCrawl.length} sources for detailed evidence...\n`,
          });

          // Crawl the URLs Perplexity found
          const crawledPages: CrawledPage[] = await crawlUrls(
            urlsToCrawl,
            (progress) => {
              if (progress.type === "found") {
                send({
                  type: "step_content",
                  step: "exploring",
                  content: `  ✓ ${progress.title?.slice(0, 60) || "Page"}\n`,
                });
              } else if (progress.type === "error") {
                send({
                  type: "step_content",
                  step: "exploring",
                  content: `  ✗ Failed: ${progress.url}\n`,
                });
              }
            },
          );

          send({
            type: "step_content",
            step: "exploring",
            content: `\nCrawled ${crawledPages.length} pages. Extracting evidence...\n\n`,
          });

          // Extract evidence from each crawled page in batches of 3
          for (let i = 0; i < crawledPages.length; i += 3) {
            const batch = crawledPages.slice(i, i + 3);

            const extractions = await Promise.all(
              batch.map((page) =>
                extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                  (msg) => {
                    send({
                      type: "step_content",
                      step: "exploring",
                      content: `  ${msg}\n`,
                    });
                  },
                ),
              ),
            );

            for (let j = 0; j < batch.length; j++) {
              const extracted = extractions[j];
              evidenceAccumulator.addEvidence(extracted, batch[j].url);
              streamExtractedEvidence(extracted, send);
            }
          }

          // Summary
          const evidence = evidenceAccumulator.getEvidence();
          const totalEvidence =
            evidence.hadith.length +
            evidence.quranVerses.length +
            evidence.scholarlyOpinions.length +
            evidence.fatwas.length;

          hasExtractedEvidence = totalEvidence > 0;

          send({
            type: "step_content",
            step: "exploring",
            content: `\n━━━ Evidence extracted: ${evidence.hadith.length} hadith, ${evidence.quranVerses.length} Quran, ${evidence.scholarlyOpinions.length} scholarly, ${evidence.fatwas.length} fatwas ━━━\n`,
          });

          send({ type: "step_complete", step: "exploring" });
        }

        // ── Step 4: Stream Response ────────────────────────────────────
        // Stream Perplexity's response first (the main answer)
        send({ type: "response_start" });

        const chunkSize = 50;
        for (let i = 0; i < perplexityResponse.length; i += chunkSize) {
          const chunk = perplexityResponse.slice(i, i + chunkSize);
          send({ type: "response_content", content: chunk });
          await new Promise((resolve) => setTimeout(resolve, 3));
        }

        // Append structured evidence from crawled sources if we found any
        if (hasExtractedEvidence) {
          const evidenceMarkdown = formatEvidenceAsMarkdown(evidenceAccumulator);
          if (evidenceMarkdown) {
            const separator = "\n\n---\n\n## Verified Evidence from Sources\n\n";
            send({ type: "response_content", content: separator });

            for (let i = 0; i < evidenceMarkdown.length; i += chunkSize) {
              const chunk = evidenceMarkdown.slice(i, i + chunkSize);
              send({ type: "response_content", content: chunk });
              await new Promise((resolve) => setTimeout(resolve, 3));
            }
          }
        }

        // Log conversation
        const fullResponse = perplexityResponse + (hasExtractedEvidence
          ? "\n\n---\n\n## Verified Evidence from Sources\n\n" + formatEvidenceAsMarkdown(evidenceAccumulator)
          : "");

        logConversation(
          sessionId,
          query,
          fullResponse,
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
