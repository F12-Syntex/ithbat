import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  PLANNING_PROMPT,
  EXPLORATION_PROMPT,
  ROUND_ANALYSIS_PROMPT,
  buildPrompt,
  extractQuranReferences,
} from "@/lib/prompts";
import {
  EvidenceAccumulator,
  extractEvidenceFromPage,
  type ExtractedEvidence,
} from "@/lib/evidence-extractor";
import {
  initialSearch,
  crawlUrls,
  searchQuery,
  googleSearch,
  getAllLinks,
  summarizeCrawledPages,
  formatAvailableLinks,
  formatPagesForAIAnalysis,
  type CrawledPage,
} from "@/lib/crawler";
import {
  type ResearchDepth,
  type Source,
  type CrawledLink,
  type ResearchStep,
  DEPTH_CONFIG,
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
    | "crawl_link"
    | "evidence"
    | "response_start"
    | "response_content"
    | "error"
    | "done";
  sessionId?: string;
  step?: string;
  stepTitle?: string;
  content?: string;
  source?: Source;
  crawlLink?: CrawledLink;
  evidence?: StreamedEvidence;
  error?: string;
}

interface PlannedStep {
  id: string;
  title: string;
}

interface PlanningDecision {
  steps: PlannedStep[];
}

interface ExplorationDecision {
  hasEnoughInfo: boolean;
  reasoning: string;
  linksToExplore: string[];
  alternativeQueries: string[];
  useGoogleSearch?: boolean;
  googleSearchQuery?: string;
  keyFindingsSoFar: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Helper to stream evidence items from extracted data
function streamExtractedEvidence(
  extracted: Partial<ExtractedEvidence>,
  send: (event: ResearchStepEvent) => void,
): void {
  // Stream hadith
  for (const h of extracted.hadith || []) {
    const title = h.number ? `${h.collection} ${h.number}` : h.collection;
    send({
      type: "evidence",
      evidence: {
        type: "hadith",
        title,
        content: h.text?.slice(0, 200) + (h.text?.length > 200 ? "..." : ""),
        source: h.collection,
        url: h.url || h.sourceUrl,
        grade: h.grade,
      },
    });
  }

  // Stream Quran verses
  for (const v of extracted.quranVerses || []) {
    const ref = v.ayahEnd
      ? `${v.surah}:${v.ayahStart}-${v.ayahEnd}`
      : `${v.surah}:${v.ayahStart}`;
    send({
      type: "evidence",
      evidence: {
        type: "quran",
        title: `Quran ${ref}${v.surahName ? ` (${v.surahName})` : ""}`,
        content: v.translation?.slice(0, 200) + (v.translation?.length > 200 ? "..." : ""),
        source: v.translationSource || "Quran",
        url: v.url,
      },
    });
  }

  // Stream scholarly opinions
  for (const o of extracted.scholarlyOpinions || []) {
    send({
      type: "evidence",
      evidence: {
        type: "scholar",
        title: o.scholar || "Scholarly Opinion",
        content: o.quote?.slice(0, 200) + (o.quote?.length > 200 ? "..." : ""),
        source: o.source,
        url: o.url,
      },
    });
  }

  // Stream fatwas
  for (const f of extracted.fatwas || []) {
    send({
      type: "evidence",
      evidence: {
        type: "fatwa",
        title: f.title || "Fatwa",
        content: f.explanation?.slice(0, 200) + (f.explanation?.length > 200 ? "..." : ""),
        source: f.source,
        url: f.url,
      },
    });
  }
}

// Format evidence directly as markdown (no AI needed)
function formatEvidenceAsMarkdown(accumulator: EvidenceAccumulator): string {
  const evidence = accumulator.getEvidence();
  const parts: string[] = [];

  // Quran verses section
  if (evidence.quranVerses.length > 0) {
    parts.push("## Quran\n");
    for (const v of evidence.quranVerses) {
      const ref = v.ayahEnd
        ? `${v.surah}:${v.ayahStart}-${v.ayahEnd}`
        : `${v.surah}:${v.ayahStart}`;
      const surahName = v.surahName ? ` (${v.surahName})` : "";
      const url = v.url || `https://quran.com/${v.surah}/${v.ayahStart}`;

      parts.push(`**[Quran ${ref}${surahName}](${url})**`);
      if (v.arabicText) {
        parts.push(`\n> ${v.arabicText}`);
      }
      if (v.translation) {
        parts.push(`\n"${v.translation}"`);
      }
      parts.push("\n");
    }
  }

  // Hadith section
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

      if (h.arabicText) {
        parts.push(`\n> ${h.arabicText}`);
      }
      if (h.text) {
        parts.push(`\n"${h.text}"`);
      }
      if (h.narrator) {
        parts.push(`\n— Narrated by ${h.narrator}`);
      }
      parts.push("\n");
    }
  }

  // Scholarly opinions section
  if (evidence.scholarlyOpinions.length > 0) {
    parts.push("\n## Scholarly Opinions\n");
    for (const o of evidence.scholarlyOpinions) {
      const scholar = o.scholar || "Scholar";
      const url = o.url;

      if (url) {
        parts.push(`**[${scholar}](${url})**`);
      } else {
        parts.push(`**${scholar}**`);
      }

      if (o.quote) {
        parts.push(`\n"${o.quote}"`);
      }
      if (o.source && o.source !== scholar) {
        parts.push(`\n— ${o.source}`);
      }
      parts.push("\n");
    }
  }

  // Fatwas section
  if (evidence.fatwas.length > 0) {
    parts.push("\n## Fatwas\n");
    for (const f of evidence.fatwas) {
      const title = f.title || "Fatwa";
      const url = f.url;

      if (url) {
        parts.push(`**[${title}](${url})**`);
      } else {
        parts.push(`**${title}**`);
      }

      if (f.ruling) {
        parts.push(`\n**Ruling:** ${f.ruling}`);
      }
      if (f.explanation) {
        parts.push(`\n${f.explanation}`);
      }
      if (f.source) {
        parts.push(`\n— ${f.source}`);
      }
      parts.push("\n");
    }
  }

  // If no evidence found
  if (parts.length === 0) {
    return "No direct evidence was found in the researched sources regarding this topic. Try rephrasing your question or searching for related topics.";
  }

  return parts.join("\n");
}

function parsePlanningResponse(response: string): PlanningDecision {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (
        parsed.steps &&
        Array.isArray(parsed.steps) &&
        parsed.steps.length >= 3
      ) {
        // Validate that we have the required step IDs
        const hasSearching = parsed.steps.some(
          (s: PlannedStep) => s.id === "searching" || s.id.includes("search"),
        );
        const hasExploring = parsed.steps.some(
          (s: PlannedStep) => s.id === "exploring" || s.id.includes("explor"),
        );
        const hasSynthesizing = parsed.steps.some(
          (s: PlannedStep) =>
            s.id === "synthesizing" || s.id.includes("synthes"),
        );

        if (hasSearching && hasExploring && hasSynthesizing) {
          // Normalize the step IDs to ensure consistency
          return {
            steps: parsed.steps.map((s: PlannedStep) => ({
              id: s.id.includes("search")
                ? "searching"
                : s.id.includes("explor")
                  ? "exploring"
                  : s.id.includes("synthes")
                    ? "synthesizing"
                    : s.id,
              title: s.title,
            })),
          };
        }
      }
    }
  } catch {
    // If parsing fails, return default steps
  }

  // Default fallback steps - only used if AI response is malformed
  return {
    steps: [
      { id: "searching", title: "Searching Islamic sources" },
      { id: "exploring", title: "Exploring relevant links" },
      { id: "synthesizing", title: "Preparing your answer" },
    ],
  };
}

function parseExplorationResponse(response: string): ExplorationDecision {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If parsing fails, return default
  }

  return {
    hasEnoughInfo: false, // Default to false to encourage more exploration
    reasoning: "Could not parse AI response - continuing exploration",
    linksToExplore: [],
    alternativeQueries: [],
    useGoogleSearch: false,
    keyFindingsSoFar: "",
  };
}

interface ConversationTurn {
  query: string;
  response: string;
}

export async function POST(request: NextRequest) {
  // Extract device info from headers
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || undefined;

  const {
    query,
    depth = "deep",
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

  const depthConfig = DEPTH_CONFIG[depth as ResearchDepth] || DEPTH_CONFIG.deep;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ResearchStepEvent) => {
        // Track sources for logging
        if (event.type === "source" && event.source) {
          allSources.push(event.source);
        }
        // Track steps for logging
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
      const allCrawledPages: CrawledPage[] = [];
      const allSources: Source[] = [];
      const allSteps: ResearchStep[] = [];
      const evidenceAccumulator = new EvidenceAccumulator(); // Structured evidence storage
      let sourceId = 1;
      const maxIterations = 1; // Single pass - fast research

      try {
        // Send session ID to client immediately
        send({ type: "session_init", sessionId });

        // Build conversation context for follow-up questions
        let conversationContextForUnderstanding = "";

        if (history.length > 0) {
          conversationContextForUnderstanding =
            "\n\n## PREVIOUS CONVERSATION CONTEXT:\n";
          for (const turn of history) {
            conversationContextForUnderstanding += `\nPrevious Question: ${turn.query}\n`;
            conversationContextForUnderstanding += `Previous Answer Summary: ${turn.response.slice(0, 1000)}${turn.response.length > 1000 ? "..." : ""}\n`;
          }
          conversationContextForUnderstanding +=
            "\n---\nThis is a FOLLOW-UP question. Analyze it in context of the previous discussion.\n";
        }

        // Step 1: Understanding (always first)
        send({
          type: "step_start",
          step: "understanding",
          stepTitle:
            history.length > 0
              ? "Understanding your follow-up"
              : "Understanding your question",
        });

        const understandingPrompt = buildPrompt(UNDERSTANDING_PROMPT, {
          query:
            history.length > 0
              ? `[Follow-up Question] ${query}${conversationContextForUnderstanding}`
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

        // Step 2: Planning - AI determines the research steps
        const planningPrompt = buildPrompt(PLANNING_PROMPT, {
          query,
          understanding: understandingContent,
        });

        let planningResponse = "";

        for await (const chunk of client.streamChat(
          [
            {
              role: "system",
              content:
                "You are a research planner. Respond ONLY with valid JSON.",
            },
            { role: "user", content: planningPrompt },
          ],
          "QUICK",
        )) {
          planningResponse += chunk;
        }

        const plan = parsePlanningResponse(planningResponse);

        // Find searching, exploring, and synthesizing steps from the plan
        const searchStep = plan.steps.find((s) => s.id.includes("search")) || {
          id: "searching",
          title: "Searching Islamic sources",
        };
        // Dedicated extraction step - always use fixed title for clarity
        const extractStep = {
          id: "extracting",
          title: "Extracting evidence",
        };
        const exploreStep = plan.steps.find((s) => s.id.includes("explor")) || {
          id: "exploring",
          title: "Exploring relevant links",
        };
        const synthesizeStep = plan.steps.find((s) =>
          s.id.includes("synthes"),
        ) || { id: "synthesizing", title: "Preparing your answer" };

        // Step 3: Initial Search (dynamic title)
        send({
          type: "step_start",
          step: searchStep.id,
          stepTitle: searchStep.title,
        });
        send({
          type: "step_content",
          step: searchStep.id,
          content: `Searching for "${query}"...\n\n`,
        });

        const initialPages = await initialSearch(query, (progress) => {
          if (progress.type === "visiting") {
            send({
              type: "crawl_link",
              crawlLink: {
                url: progress.url!,
                depth: progress.depth || 0,
                status: "visiting",
              },
            });
            send({
              type: "step_content",
              step: searchStep.id,
              content: `→ ${progress.url}\n`,
            });
          } else if (progress.type === "found") {
            send({
              type: "crawl_link",
              crawlLink: {
                url: progress.url!,
                title: progress.title,
                depth: progress.depth || 0,
                status: "found",
              },
            });
            send({
              type: "step_content",
              step: searchStep.id,
              content: `✓ Found: ${progress.title?.slice(0, 60) || "Page"}\n`,
            });

            const source: Source = {
              id: sourceId++,
              title: progress.title || "Page",
              url: progress.url!,
              domain: new URL(progress.url!).hostname.replace("www.", ""),
              trusted: true,
            };

            send({ type: "source", source });
          } else if (progress.type === "error") {
            send({
              type: "step_content",
              step: searchStep.id,
              content: `✗ Failed: ${progress.url}\n`,
            });
          }
        });

        allCrawledPages.push(...initialPages);

        send({
          type: "step_content",
          step: searchStep.id,
          content: `\n━━━ Search complete: ${initialPages.length} pages found ━━━\n`,
        });

        send({ type: "step_complete", step: searchStep.id });

        // STEP: EXTRACTING EVIDENCE - Dedicated step for evidence extraction
        send({
          type: "step_start",
          step: extractStep.id,
          stepTitle: extractStep.title,
        });

        if (initialPages.length > 0) {
          send({
            type: "step_content",
            step: extractStep.id,
            content: `Analyzing ${initialPages.length} pages for Islamic evidence...\n\n`,
          });

          // Extract evidence from each page in parallel (batch of 3)
          for (let i = 0; i < initialPages.length; i += 3) {
            const batch = initialPages.slice(i, i + 3);
            const batchNum = Math.floor(i / 3) + 1;
            const totalBatches = Math.ceil(initialPages.length / 3);

            send({
              type: "step_content",
              step: extractStep.id,
              content: `Processing batch ${batchNum}/${totalBatches}...\n`,
            });

            const extractions = await Promise.all(
              batch.map((page) =>
                extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                  (msg) => {
                    send({
                      type: "step_content",
                      step: extractStep.id,
                      content: `  ${msg}\n`,
                    });
                  },
                ),
              ),
            );

            // Add to accumulator and stream evidence as found
            for (let j = 0; j < batch.length; j++) {
              const extracted = extractions[j];
              evidenceAccumulator.addEvidence(extracted, batch[j].url);

              // Stream evidence items to UI immediately
              streamExtractedEvidence(extracted, send);
            }
          }

          // Get evidence summary for pretty display
          const evidence = evidenceAccumulator.getEvidence();

          // Pretty summary with counts
          send({
            type: "step_content",
            step: extractStep.id,
            content: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `📚 EVIDENCE FOUND:\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `   📖 Hadith:     ${evidence.hadith.length} references\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `   📜 Quran:      ${evidence.quranVerses.length} verses\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `   🎓 Scholarly:  ${evidence.scholarlyOpinions.length} opinions\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `   ⚖️  Fatwas:     ${evidence.fatwas.length} rulings\n`,
          });
          send({
            type: "step_content",
            step: extractStep.id,
            content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
          });

          // Check if we have minimum evidence
          if (evidenceAccumulator.hasMinimumEvidence()) {
            send({
              type: "step_content",
              step: extractStep.id,
              content: `\n✓ Sufficient evidence gathered\n`,
            });
          } else {
            send({
              type: "step_content",
              step: extractStep.id,
              content: `\n⚠ Need more evidence - will continue exploring\n`,
            });
          }
        } else {
          send({
            type: "step_content",
            step: extractStep.id,
            content: `No pages to analyze\n`,
          });
        }

        send({ type: "step_complete", step: extractStep.id });

        // Step 4: AI-Driven Exploration Loop
        send({
          type: "step_start",
          step: exploreStep.id,
          stepTitle: exploreStep.title,
        });

        let iteration = 0;
        let hasEnoughInfo = false;

        while (iteration < maxIterations && !hasEnoughInfo) {
          iteration++;

          send({
            type: "step_content",
            step: exploreStep.id,
            content: `\n🔍 Exploration round ${iteration}/${maxIterations}\n`,
          });

          // Get available links
          const availableLinks = getAllLinks(allCrawledPages);

          // Ask AI what to explore
          const explorationPrompt = buildPrompt(EXPLORATION_PROMPT, {
            query,
            crawledSummary: summarizeCrawledPages(allCrawledPages),
            availableLinks: formatAvailableLinks(availableLinks, 30),
          });

          send({
            type: "step_content",
            step: exploreStep.id,
            content: `Analyzing ${allCrawledPages.length} pages, ${availableLinks.length} available links...\n`,
          });

          // Get AI's decision
          let aiResponse = "";

          for await (const chunk of client.streamChat(
            [
              {
                role: "system",
                content:
                  "You are a research assistant. Respond ONLY with valid JSON.",
              },
              { role: "user", content: explorationPrompt },
            ],
            "QUICK",
          )) {
            aiResponse += chunk;
          }

          const decision = parseExplorationResponse(aiResponse);

          send({
            type: "step_content",
            step: exploreStep.id,
            content: `\nAI Decision: ${decision.reasoning}\n`,
          });

          if (decision.hasEnoughInfo) {
            hasEnoughInfo = true;
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `✓ Sufficient information gathered\n`,
            });

            if (decision.keyFindingsSoFar) {
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `Key findings: ${decision.keyFindingsSoFar}\n`,
              });
            }
            break;
          }

          // Explore links AI chose
          if (decision.linksToExplore.length > 0) {
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `\nExploring ${decision.linksToExplore.length} links:\n`,
            });

            const newPages = await crawlUrls(
              decision.linksToExplore.slice(0, 5),
              (progress) => {
                if (progress.type === "visiting") {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `  → ${progress.url}\n`,
                  });
                } else if (progress.type === "found") {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `  ✓ ${progress.title?.slice(0, 50) || "Page"}\n`,
                  });

                  const source: Source = {
                    id: sourceId++,
                    title: progress.title || "Page",
                    url: progress.url!,
                    domain: new URL(progress.url!).hostname.replace("www.", ""),
                    trusted: true,
                  };

                  send({ type: "source", source });
                }
              },
            );

            allCrawledPages.push(...newPages);
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `  Found ${newPages.length} new pages\n`,
            });

            // Extract evidence from new pages and stream as found
            if (newPages.length > 0) {
              for (const page of newPages) {
                const extracted = await extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                );

                evidenceAccumulator.addEvidence(extracted, page.url);
                // Stream evidence items to UI immediately
                streamExtractedEvidence(extracted, send);
              }
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `  📊 Total evidence: ${evidenceAccumulator.getSummary()}\n`,
              });
            }
          }

          // Try alternative queries if suggested
          if (
            decision.alternativeQueries.length > 0 &&
            allCrawledPages.length < depthConfig.maxPages
          ) {
            for (const altQuery of decision.alternativeQueries.slice(0, 2)) {
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `\nTrying alternative search: "${altQuery}"\n`,
              });

              const altPages = await searchQuery(altQuery, (progress) => {
                if (progress.type === "found") {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `  ✓ ${progress.title?.slice(0, 50) || "Page"}\n`,
                  });

                  const source: Source = {
                    id: sourceId++,
                    title: progress.title || "Page",
                    url: progress.url!,
                    domain: new URL(progress.url!).hostname.replace("www.", ""),
                    trusted: true,
                  };

                  send({ type: "source", source });
                }
              });

              allCrawledPages.push(...altPages);

              // Extract evidence from altPages and stream as found
              for (const page of altPages) {
                const extracted = await extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                );

                evidenceAccumulator.addEvidence(extracted, page.url);
                // Stream evidence items to UI immediately
                streamExtractedEvidence(extracted, send);
              }
            }
          }

          // Try Google search if AI requests it
          if (
            decision.useGoogleSearch &&
            decision.googleSearchQuery &&
            allCrawledPages.length < depthConfig.maxPages
          ) {
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `\n🌐 Searching Google: "${decision.googleSearchQuery}"\n`,
            });

            const googlePages = await googleSearch(
              decision.googleSearchQuery,
              (progress) => {
                if (progress.type === "visiting") {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `  → ${progress.url}\n`,
                  });
                } else if (progress.type === "found") {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `  ✓ ${progress.title?.slice(0, 50) || "Page"}\n`,
                  });

                  const source: Source = {
                    id: sourceId++,
                    title: progress.title || "Page",
                    url: progress.url!,
                    domain: new URL(progress.url!).hostname.replace("www.", ""),
                    trusted: false, // Mark Google results as needing verification
                  };

                  send({ type: "source", source });
                }
              },
            );

            allCrawledPages.push(...googlePages);
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `  Found ${googlePages.length} pages from Google\n`,
            });

            // Extract evidence from Google pages and stream as found
            for (const page of googlePages) {
              const extracted = await extractEvidenceFromPage(
                page.url,
                page.content,
                query,
              );

              evidenceAccumulator.addEvidence(extracted, page.url);
              // Stream evidence items to UI immediately
              streamExtractedEvidence(extracted, send);
            }
          }

          // Check evidence status using our structured accumulator
          const evidence = evidenceAccumulator.getEvidence();
          const hadithCount = evidence.hadith.length;
          const quranCount = evidence.quranVerses.length;
          const scholarCount =
            evidence.scholarlyOpinions.length + evidence.fatwas.length;

          send({
            type: "step_content",
            step: exploreStep.id,
            content: `\n📊 Evidence status: ${hadithCount} hadith, ${quranCount} Quran, ${scholarCount} scholarly\n`,
          });

          // Check if we have enough based on structured evidence
          if (evidenceAccumulator.hasMinimumEvidence()) {
            hasEnoughInfo = true;
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `✓ Sufficient evidence gathered!\n`,
            });
            break;
          }

          // Only continue the old round analysis for link suggestions
          if (allCrawledPages.length > 0 && !hasEnoughInfo) {
            const pagesForAnalysis = formatPagesForAIAnalysis(allCrawledPages);
            const roundAnalysisPrompt = buildPrompt(ROUND_ANALYSIS_PROMPT, {
              query,
              pagesContent: pagesForAnalysis,
            });

            let roundAnalysisResponse = "";

            for await (const chunk of client.streamChat(
              [
                {
                  role: "system",
                  content:
                    "You are an Islamic evidence analyzer. Suggest links to explore. Return ONLY valid JSON.",
                },
                { role: "user", content: roundAnalysisPrompt },
              ],
              "QUICK",
            )) {
              roundAnalysisResponse += chunk;
            }

            try {
              const jsonMatch = roundAnalysisResponse.match(/\{[\s\S]*\}/);

              if (jsonMatch) {
                const roundAnalysis = JSON.parse(jsonMatch[0]);

                // Report what evidence was found
                const hadithCount = roundAnalysis.totalHadith || 0;
                const quranCount = roundAnalysis.totalQuran || 0;
                const scholarCount = roundAnalysis.totalScholarQuotes || 0;

                send({
                  type: "step_content",
                  step: exploreStep.id,
                  content: `📊 Evidence found: ${hadithCount} hadith, ${quranCount} Quran verses, ${scholarCount} scholar quotes\n`,
                });

                // Check if we have enough evidence based on AI analysis
                if (roundAnalysis.hasEnoughEvidence && hadithCount >= 3) {
                  hasEnoughInfo = true;
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `✓ Sufficient evidence gathered!\n`,
                  });
                  break;
                }

                // Report what's missing
                if (
                  roundAnalysis.missingEvidence &&
                  roundAnalysis.missingEvidence.length > 0
                ) {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `⚠ Still needed: ${roundAnalysis.missingEvidence.slice(0, 2).join(", ")}\n`,
                  });
                }

                // If AI suggested specific links to explore, add them to next round
                if (
                  roundAnalysis.linksToExplore &&
                  roundAnalysis.linksToExplore.length > 0 &&
                  iteration < maxIterations
                ) {
                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `\n🔗 AI suggests exploring ${roundAnalysis.linksToExplore.length} promising links...\n`,
                  });

                  const aiSuggestedPages = await crawlUrls(
                    roundAnalysis.linksToExplore.slice(0, 3),
                    (progress) => {
                      if (progress.type === "found") {
                        send({
                          type: "step_content",
                          step: exploreStep.id,
                          content: `  ✓ ${progress.title?.slice(0, 50) || "Page"}\n`,
                        });

                        const source: Source = {
                          id: sourceId++,
                          title: progress.title || "Page",
                          url: progress.url!,
                          domain: new URL(progress.url!).hostname.replace(
                            "www.",
                            "",
                          ),
                          trusted: true,
                        };

                        send({ type: "source", source });
                      }
                    },
                  );

                  allCrawledPages.push(...aiSuggestedPages);
                }

                // If AI suggested alternative searches and we don't have enough evidence
                if (
                  !roundAnalysis.hasEnoughEvidence &&
                  roundAnalysis.suggestedSearches &&
                  roundAnalysis.suggestedSearches.length > 0 &&
                  iteration < maxIterations
                ) {
                  const suggestedQuery = roundAnalysis.suggestedSearches[0];

                  send({
                    type: "step_content",
                    step: exploreStep.id,
                    content: `\n🔎 AI suggests searching: "${suggestedQuery}"\n`,
                  });

                  const suggestedPages = await searchQuery(
                    suggestedQuery,
                    (progress) => {
                      if (progress.type === "found") {
                        send({
                          type: "step_content",
                          step: exploreStep.id,
                          content: `  ✓ ${progress.title?.slice(0, 50) || "Page"}\n`,
                        });

                        const source: Source = {
                          id: sourceId++,
                          title: progress.title || "Page",
                          url: progress.url!,
                          domain: new URL(progress.url!).hostname.replace(
                            "www.",
                            "",
                          ),
                          trusted: true,
                        };

                        send({ type: "source", source });
                      }
                    },
                  );

                  allCrawledPages.push(...suggestedPages);
                }
              }
            } catch {
              // Analysis parsing failed, continue anyway
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `⚠ AI analysis incomplete, continuing...\n`,
              });
            }
          }

          // Check if we've hit the page limit
          if (allCrawledPages.length >= depthConfig.maxPages) {
            send({
              type: "step_content",
              step: exploreStep.id,
              content: `\n⚠ Reached page limit (${depthConfig.maxPages})\n`,
            });
            break;
          }
        }

        send({
          type: "step_content",
          step: exploreStep.id,
          content: `\n━━━ Exploration complete: ${allCrawledPages.length} total pages ━━━\n`,
        });

        // Fetch tafsir for any Quran references in the query BEFORE synthesis
        const queryQuranRefs = extractQuranReferences(query);

        if (queryQuranRefs.length > 0) {
          send({
            type: "step_content",
            step: exploreStep.id,
            content: `\n📖 Fetching tafsir for ${queryQuranRefs.length} Quran reference${queryQuranRefs.length > 1 ? "s" : ""}...\n`,
          });

          for (const ref of queryQuranRefs.slice(0, 5)) {
            try {
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `  Fetching tafsir for ${ref.surah}:${ref.ayah}...\n`,
              });

              const tafsirPages = await crawlUrls([ref.tafsirUrl]);

              if (tafsirPages.length > 0) {
                // Add tafsir content to crawled pages with clear labeling
                for (const page of tafsirPages) {
                  page.title = `Tafsir Ibn Kathir - Quran ${ref.surah}:${ref.ayah}`;
                  page.content = `[TAFSIR IBN KATHIR FOR QURAN ${ref.surah}:${ref.ayah}]\n\n${page.content}`;
                  allCrawledPages.push(page);
                }
                send({
                  type: "step_content",
                  step: exploreStep.id,
                  content: `  ✓ Got tafsir for Quran ${ref.surah}:${ref.ayah}\n`,
                });
              }
            } catch (err) {
              send({
                type: "step_content",
                step: exploreStep.id,
                content: `  ⚠ Could not fetch tafsir for ${ref.surah}:${ref.ayah}\n`,
              });
            }
          }
        }

        send({ type: "step_complete", step: exploreStep.id });

        // Step 5: Format evidence (no AI needed - direct formatting)
        send({
          type: "step_start",
          step: synthesizeStep.id,
          stepTitle: "Formatting evidence",
        });

        const evidenceSummary = evidenceAccumulator.getSummary();
        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `Found ${evidenceSummary}\n`,
        });

        // Format evidence directly as markdown (no AI call needed!)
        const formattedResponse = formatEvidenceAsMarkdown(evidenceAccumulator);

        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `✓ Complete\n`,
        });
        send({ type: "step_complete", step: synthesizeStep.id });

        // Stream the formatted response
        send({ type: "response_start" });

        // Stream it in chunks for better UX
        const chunkSize = 50;

        for (let i = 0; i < formattedResponse.length; i += chunkSize) {
          const chunk = formattedResponse.slice(i, i + chunkSize);

          send({ type: "response_content", content: chunk });
          // Small delay for smoother streaming effect
          await new Promise((resolve) => setTimeout(resolve, 3));
        }

        // Log conversation to Supabase (non-blocking)
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
