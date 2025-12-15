import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  PLANNING_PROMPT,
  EXPLORATION_PROMPT,
  SYNTHESIS_PROMPT,
  VERIFICATION_PROMPT,
  buildPrompt,
} from "@/lib/prompts";
import {
  initialSearch,
  crawlUrls,
  searchQuery,
  googleSearch,
  getAllLinks,
  summarizeCrawledPages,
  formatAvailableLinks,
  formatCrawlResultsForAI,
  type CrawledPage,
} from "@/lib/crawler";
import {
  type ResearchDepth,
  type Source,
  type CrawledLink,
  DEPTH_CONFIG,
} from "@/types/research";

interface ResearchStepEvent {
  type:
    | "step_start"
    | "step_content"
    | "step_complete"
    | "source"
    | "crawl_link"
    | "response_start"
    | "response_content"
    | "error"
    | "done";
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
  const {
    query,
    depth = "deep",
    conversationHistory = [],
  } = await request.json();
  const history = conversationHistory as ConversationTurn[];

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
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      const client = getOpenRouterClient();
      const allCrawledPages: CrawledPage[] = [];
      let sourceId = 1;
      const maxIterations = 5; // Reduced - AI now decides to stop when enough evidence found

      try {
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
          content: `\n━━━ Initial search complete: ${initialPages.length} pages ━━━\n\n`,
        });

        send({ type: "step_complete", step: searchStep.id });

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

        send({ type: "step_complete", step: exploreStep.id });

        // Step 5: Synthesizing (dynamic title)
        send({
          type: "step_start",
          step: synthesizeStep.id,
          stepTitle: synthesizeStep.title,
        });
        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `Analyzing ${allCrawledPages.length} sources...\n`,
        });

        const crawledContent = formatCrawlResultsForAI(allCrawledPages);

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

        const synthesisPrompt = buildPrompt(SYNTHESIS_PROMPT, {
          query: history.length > 0 ? `[Follow-up Question] ${query}` : query,
          research: crawledContent + conversationContext,
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
          content: `Generated initial response, verifying references...\n`,
        });

        // Step 6: Verification - validate all references
        const verificationPrompt = buildPrompt(VERIFICATION_PROMPT, {
          response: synthesisResponse,
          research: crawledContent,
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
          "HIGH",
        )) {
          verifiedResponse += chunk;
        }

        // Clean up any nested/duplicate links that slipped through
        const cleanedResponse = cleanupNestedLinks(verifiedResponse);

        send({
          type: "step_content",
          step: synthesizeStep.id,
          content: `✓ References verified\n`,
        });

        send({ type: "step_complete", step: synthesizeStep.id });

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
