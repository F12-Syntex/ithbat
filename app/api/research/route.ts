import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  PLANNING_PROMPT,
  EXPLORATION_PROMPT,
  SYNTHESIS_PROMPT,
  AI_SUMMARY_ADDENDUM,
  VERIFICATION_PROMPT,
  DEEP_VERIFICATION_PROMPT,
  ROUND_ANALYSIS_PROMPT,
  buildPrompt,
  extractUrlsFromMarkdown,
  extractQuranReferences,
} from "@/lib/prompts";
import { convertReferencesToLinks } from "@/lib/reference-parser";
import {
  EvidenceAccumulator,
  extractEvidenceFromPage,
} from "@/lib/evidence-extractor";
import {
  initialSearch,
  crawlUrls,
  searchQuery,
  googleSearch,
  getAllLinks,
  summarizeCrawledPages,
  formatAvailableLinks,
  formatCrawlResultsForAI,
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

interface ResearchStepEvent {
  type:
    | "session_init"
    | "step_start"
    | "step_content"
    | "step_complete"
    | "source"
    | "crawl_link"
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

// Clean up nested/duplicate markdown links
// Fixes patterns like [[Text](url)](url) -> [Text](url)
function cleanupNestedLinks(text: string): string {
  // Pattern: [[inner text](inner url)](outer url)
  // Replace with: [inner text](inner url)
  return text.replace(/\[\[([^\]]+)\]\(([^)]+)\)\]\([^)]+\)/g, "[$1]($2)");
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
    includeAISummary = false,
    searchTimeout = 180000, // Default 3 minutes (standard mode)
    evidenceFilters,
  } = await request.json();
  const history = conversationHistory as ConversationTurn[];
  const sessionId = providedSessionId || crypto.randomUUID();
  const isFollowUp = history.length > 0;
  const wantsAISummary = includeAISummary === true;
  // 0 = unlimited, otherwise respect the timeout
  // Fast mode (1min) will skip deep verification
  const isFastMode = searchTimeout > 0 && searchTimeout <= 60000;

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
      const maxIterations = 5; // Reduced - AI now decides to stop when enough evidence found

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

            // Add to accumulator
            for (let j = 0; j < batch.length; j++) {
              evidenceAccumulator.addEvidence(extractions[j], batch[j].url);
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

            // Extract evidence from new pages
            if (newPages.length > 0) {
              for (const page of newPages) {
                const extracted = await extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                );

                evidenceAccumulator.addEvidence(extracted, page.url);
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

              // Extract evidence from altPages
              for (const page of altPages) {
                const extracted = await extractEvidenceFromPage(
                  page.url,
                  page.content,
                  query,
                );

                evidenceAccumulator.addEvidence(extracted, page.url);
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

            // Extract evidence from Google pages
            for (const page of googlePages) {
              const extracted = await extractEvidenceFromPage(
                page.url,
                page.content,
                query,
              );

              evidenceAccumulator.addEvidence(extracted, page.url);
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

        // Step 5: Synthesizing (dynamic title)
        send({
          type: "step_start",
          step: synthesizeStep.id,
          stepTitle: synthesizeStep.title,
        });
        // Format structured evidence for synthesis
        const structuredEvidence = evidenceAccumulator.formatForSynthesis();
        const evidenceSummary = evidenceAccumulator.getSummary();

        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `Compiling ${evidenceSummary} from ${allCrawledPages.length} sources...\n`,
        });

        // Also include raw content for context (but structured evidence takes priority)
        const rawContent = formatCrawlResultsForAI(allCrawledPages);
        const combinedResearch = `${structuredEvidence}\n\n# RAW SOURCE CONTENT (for additional context)\n\n${rawContent}`;

        // Build conversation context for follow-up questions
        let conversationContext = "";

        if (history.length > 0) {
          conversationContext = "\n\n## CONVERSATION HISTORY (for context):\n";
          for (const turn of history) {
            conversationContext += `\n**Previous Question:** ${turn.query}\n`;
            conversationContext += `**Previous Answer:** ${turn.response.slice(0, 2000)}${turn.response.length > 2000 ? "..." : ""}\n`;
          }
          conversationContext +=
            "\n---\nUse the above context to inform your answer to the current follow-up question. Reference previous answers when relevant.\n";
        }

        // Build synthesis prompt, optionally adding AI summary instructions
        const baseSynthesisPrompt = wantsAISummary
          ? SYNTHESIS_PROMPT + AI_SUMMARY_ADDENDUM
          : SYNTHESIS_PROMPT;

        const synthesisPrompt = buildPrompt(baseSynthesisPrompt, {
          query: history.length > 0 ? `[Follow-up Question] ${query}` : query,
          research: combinedResearch + conversationContext,
        });

        // Collect the initial synthesis response
        let synthesisResponse = "";

        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: synthesisPrompt },
          ],
          "HIGH",
        )) {
          synthesisResponse += chunk;
        }

        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `Finalizing response...\n`,
        });

        // Step 6: Verification - validate all references
        // Use QUICK model for fast mode, HIGH for thorough
        const verificationPrompt = buildPrompt(VERIFICATION_PROMPT, {
          response: synthesisResponse,
          research: combinedResearch,
        });

        let verifiedResponse = "";

        for await (const chunk of client.streamChat(
          [
            {
              role: "system",
              content:
                "You are a reference verification assistant. Return the complete verified response.",
            },
            { role: "user", content: verificationPrompt },
          ],
          isFastMode ? "QUICK" : "HIGH", // Use QUICK for fast mode
        )) {
          verifiedResponse += chunk;
        }

        // Clean up any nested/duplicate links that slipped through
        let cleanedResponse = cleanupNestedLinks(verifiedResponse);

        // Continue finalizing in synthesize step (verification runs silently)
        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `Verifying citations...\n`,
        });

        // Skip deep verification in fast mode
        if (isFastMode) {
          // Fast mode: skip deep URL verification, just clean up the response
          cleanedResponse = convertReferencesToLinks(cleanedResponse);
        } else {
          // Full mode: deep verification with URL crawling
          // Extract URLs from the response
          const citedUrls = extractUrlsFromMarkdown(cleanedResponse);

          // Extract Quran references for tafsir fetching
          const quranRefs = extractQuranReferences(cleanedResponse);

          if (citedUrls.length > 0 || quranRefs.length > 0) {
            // Crawl cited URLs silently (limit to 5 for medium mode)
            const urlsToCrawl = citedUrls.slice(0, 5);
          const verificationPages: CrawledPage[] = [];
          const fetchedUrls: string[] = [];
          const failedUrls: string[] = [];

          for (const url of urlsToCrawl) {
            try {
              const pages = await crawlUrls([url]);

              if (pages.length > 0) {
                verificationPages.push(...pages);
                fetchedUrls.push(url);
              } else {
                failedUrls.push(url);
              }
            } catch {
              failedUrls.push(url);
            }
          }

          // Fetch tafsir for Quran verses silently (limit to 5)
          const tafsirPages: CrawledPage[] = [];

          for (const ref of quranRefs.slice(0, 5)) {
            try {
              const pages = await crawlUrls([ref.tafsirUrl]);

              if (pages.length > 0) {
                tafsirPages.push(...pages);
              }
            } catch {
              // Silent fail
            }
          }

          // Combine all verification sources
          const allVerificationPages = [...verificationPages, ...tafsirPages];

          if (allVerificationPages.length > 0) {
            // Format the crawled source content for verification
            const sourceContent = allVerificationPages
              .map(
                (page) =>
                  `\n--- SOURCE: ${page.url} ---\nTitle: ${page.title}\nContent:\n${page.content.slice(0, 3000)}\n`,
              )
              .join("\n");

            // Format tafsir content separately for context enrichment
            const tafsirContent =
              tafsirPages.length > 0
                ? `\n\n## TAFSIR (Ibn Kathir) CONTEXT:\n${tafsirPages
                    .map(
                      (page) =>
                        `\n--- TAFSIR: ${page.url} ---\n${page.content.slice(0, 4000)}\n`,
                    )
                    .join("\n")}`
                : "";

            // Run deep verification (include tafsir content for context)
            const deepVerificationPrompt = buildPrompt(
              DEEP_VERIFICATION_PROMPT,
              {
                response: cleanedResponse,
                sourceContent: sourceContent + tafsirContent,
              },
            );

            let deepVerifiedResponse = "";

            for await (const chunk of client.streamChat(
              [
                {
                  role: "system",
                  content:
                    "You are a citation verification assistant. Silently remove any content that cannot be verified against the provided sources. Do not add notes about removed content.",
                },
                { role: "user", content: deepVerificationPrompt },
              ],
              "HIGH",
            )) {
              deepVerifiedResponse += chunk;
            }

            // Use the deep verified response if it's valid
            if (deepVerifiedResponse.length > 100) {
              const previousResponse = cleanedResponse;

              cleanedResponse = cleanupNestedLinks(deepVerifiedResponse);

              // Count citations before and after to show what was removed
              const citationsBefore =
                extractUrlsFromMarkdown(previousResponse).length;
              const citationsAfter =
                extractUrlsFromMarkdown(cleanedResponse).length;
              const removed = citationsBefore - citationsAfter;

              if (removed > 0) {
                send({
                  type: "step_content",
                  step: synthesizeStep.id,
                  content: `\n✗ Removed ${removed} unverified citation${removed > 1 ? "s" : ""}\n`,
                });
              }
              send({
                type: "step_content",
                step: synthesizeStep.id,
                content: `✓ ${citationsAfter} citation${citationsAfter !== 1 ? "s" : ""} verified\n`,
              });

              // Check if we need to re-research due to insufficient evidence
              const removalRate =
                citationsBefore > 0 ? removed / citationsBefore : 0;
              const needsMoreResearch = citationsAfter < 2 || removalRate > 0.5;

              if (needsMoreResearch && citationsBefore > 0) {
                send({ type: "step_complete", step: synthesizeStep.id });

                // Start re-research step
                send({
                  type: "step_start",
                  step: synthesizeStep.id,
                  stepTitle: "Finding more evidence",
                });

                send({
                  type: "step_content",
                  step: synthesizeStep.id,
                  content: `Insufficient verified evidence (${citationsAfter} citations). Searching for more specific sources...\n\n`,
                });

                // Search with more specific queries
                const specificQueries = [
                  `${query} hadith evidence`,
                  `${query} scholarly ruling fatwa`,
                  `${query} islamqa`,
                ];

                const additionalPages: CrawledPage[] = [];

                for (const specificQuery of specificQueries.slice(0, 2)) {
                  send({
                    type: "step_content",
                    step: synthesizeStep.id,
                    content: `→ Searching: "${specificQuery}"\n`,
                  });

                  const newPages = await searchQuery(
                    specificQuery,
                    (progress) => {
                      if (progress.type === "found") {
                        send({
                          type: "step_content",
                          step: synthesizeStep.id,
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

                  additionalPages.push(...newPages);
                }

                if (additionalPages.length > 0) {
                  allCrawledPages.push(...additionalPages);

                  send({
                    type: "step_content",
                    step: synthesizeStep.id,
                    content: `\nFound ${additionalPages.length} additional sources. Re-synthesizing...\n`,
                  });

                  // Re-synthesize with all evidence
                  const updatedCrawledContent =
                    formatCrawlResultsForAI(allCrawledPages);
                  const reSynthesisBasePrompt = wantsAISummary
                    ? SYNTHESIS_PROMPT + AI_SUMMARY_ADDENDUM
                    : SYNTHESIS_PROMPT;
                  const reSynthesisPrompt = buildPrompt(reSynthesisBasePrompt, {
                    query:
                      history.length > 0
                        ? `[Follow-up Question] ${query}`
                        : query,
                    research: updatedCrawledContent + conversationContext,
                  });

                  let reSynthesisResponse = "";

                  for await (const chunk of client.streamChat(
                    [
                      {
                        role: "system",
                        content: ISLAMIC_RESEARCH_SYSTEM_PROMPT,
                      },
                      { role: "user", content: reSynthesisPrompt },
                    ],
                    "HIGH",
                  )) {
                    reSynthesisResponse += chunk;
                  }

                  // Quick verification of the new response
                  const reVerificationPrompt = buildPrompt(
                    VERIFICATION_PROMPT,
                    {
                      response: reSynthesisResponse,
                      research: updatedCrawledContent,
                    },
                  );

                  let reVerifiedResponse = "";

                  for await (const chunk of client.streamChat(
                    [
                      {
                        role: "system",
                        content:
                          "You are a reference verification assistant. Return the complete verified response.",
                      },
                      { role: "user", content: reVerificationPrompt },
                    ],
                    "HIGH",
                  )) {
                    reVerifiedResponse += chunk;
                  }

                  if (reVerifiedResponse.length > 100) {
                    cleanedResponse = cleanupNestedLinks(reVerifiedResponse);
                    const newCitations =
                      extractUrlsFromMarkdown(cleanedResponse).length;

                    send({
                      type: "step_content",
                      step: synthesizeStep.id,
                      content: `✓ Re-synthesis complete with ${newCitations} citations\n`,
                    });
                  }
                } else {
                  send({
                    type: "step_content",
                    step: synthesizeStep.id,
                    content: `⚠ No additional sources found. Using best available evidence.\n`,
                  });
                }
              }
            }
          }
        }
        } // Close else block for isFastMode

        // Done with synthesis
        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `✓ Complete\n`,
        });
        send({ type: "step_complete", step: synthesizeStep.id });

        // Post-process: Convert any remaining references to clickable links
        // This handles cases like [al-Isra 17:23-24] -> [al-Isra 17:23-24](https://quran.com/...)
        cleanedResponse = convertReferencesToLinks(cleanedResponse);

        // Stream the cleaned response
        send({ type: "response_start" });

        // Stream it in chunks for better UX
        const chunkSize = 20;

        for (let i = 0; i < cleanedResponse.length; i += chunkSize) {
          const chunk = cleanedResponse.slice(i, i + chunkSize);

          send({ type: "response_content", content: chunk });
          // Small delay for smoother streaming effect
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        // Log conversation to Supabase (non-blocking)
        logConversation(
          sessionId,
          query,
          cleanedResponse,
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
