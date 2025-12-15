import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  EXPLORATION_PROMPT,
  SYNTHESIS_PROMPT,
  buildPrompt,
} from "@/lib/prompts";
import {
  initialSearch,
  crawlUrls,
  searchQuery,
  getAllLinks,
  summarizeCrawledPages,
  formatAvailableLinks,
  formatCrawlResultsForAI,
  type CrawledPage,
  type CrawlProgress,
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
  content?: string;
  source?: Source;
  crawlLink?: CrawledLink;
  error?: string;
}

interface ExplorationDecision {
  hasEnoughInfo: boolean;
  reasoning: string;
  linksToExplore: string[];
  alternativeQueries: string[];
  keyFindingsSoFar: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
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
    hasEnoughInfo: true,
    reasoning: "Could not parse AI response",
    linksToExplore: [],
    alternativeQueries: [],
    keyFindingsSoFar: "",
  };
}

export async function POST(request: NextRequest) {
  const { query, depth = "deep" } = await request.json();

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
      const maxIterations = 5; // Maximum exploration iterations

      // Helper to send crawl progress
      const onCrawlProgress = (progress: CrawlProgress) => {
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
            step: "searching",
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
            step: "searching",
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
            step: "searching",
            content: `✗ Failed: ${progress.url}\n`,
          });
        }
      };

      try {
        // Step 1: Understanding
        send({ type: "step_start", step: "understanding" });

        const understandingPrompt = buildPrompt(UNDERSTANDING_PROMPT, {
          query,
        });

        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: understandingPrompt },
          ],
          "QUICK",
        )) {
          send({ type: "step_content", step: "understanding", content: chunk });
        }

        send({ type: "step_complete", step: "understanding" });

        // Step 2: Initial Search
        send({ type: "step_start", step: "searching" });
        send({
          type: "step_content",
          step: "searching",
          content: `Searching for "${query}"...\n\n`,
        });

        const initialPages = await initialSearch(query, onCrawlProgress);

        allCrawledPages.push(...initialPages);

        send({
          type: "step_content",
          step: "searching",
          content: `\n━━━ Initial search complete: ${initialPages.length} pages ━━━\n\n`,
        });

        send({ type: "step_complete", step: "searching" });

        // Step 3: AI-Driven Exploration Loop
        send({ type: "step_start", step: "exploring" });

        let iteration = 0;
        let hasEnoughInfo = false;

        while (iteration < maxIterations && !hasEnoughInfo) {
          iteration++;

          send({
            type: "step_content",
            step: "exploring",
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
            step: "exploring",
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
            step: "exploring",
            content: `\nAI Decision: ${decision.reasoning}\n`,
          });

          if (decision.hasEnoughInfo) {
            hasEnoughInfo = true;
            send({
              type: "step_content",
              step: "exploring",
              content: `✓ Sufficient information gathered\n`,
            });

            if (decision.keyFindingsSoFar) {
              send({
                type: "step_content",
                step: "exploring",
                content: `Key findings: ${decision.keyFindingsSoFar}\n`,
              });
            }
            break;
          }

          // Explore links AI chose
          if (decision.linksToExplore.length > 0) {
            send({
              type: "step_content",
              step: "exploring",
              content: `\nExploring ${decision.linksToExplore.length} links:\n`,
            });

            const newPages = await crawlUrls(
              decision.linksToExplore.slice(0, 5),
              (progress) => {
                if (progress.type === "visiting") {
                  send({
                    type: "step_content",
                    step: "exploring",
                    content: `  → ${progress.url}\n`,
                  });
                } else if (progress.type === "found") {
                  send({
                    type: "step_content",
                    step: "exploring",
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
              step: "exploring",
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
                step: "exploring",
                content: `\nTrying alternative search: "${altQuery}"\n`,
              });

              const altPages = await searchQuery(altQuery, (progress) => {
                if (progress.type === "found") {
                  send({
                    type: "step_content",
                    step: "exploring",
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

          // Check if we've hit the page limit
          if (allCrawledPages.length >= depthConfig.maxPages) {
            send({
              type: "step_content",
              step: "exploring",
              content: `\n⚠ Reached page limit (${depthConfig.maxPages})\n`,
            });
            break;
          }
        }

        send({
          type: "step_content",
          step: "exploring",
          content: `\n━━━ Exploration complete: ${allCrawledPages.length} total pages ━━━\n`,
        });

        send({ type: "step_complete", step: "exploring" });

        // Step 4: Synthesizing
        send({ type: "step_start", step: "synthesizing" });
        send({
          type: "step_content",
          step: "synthesizing",
          content: `Analyzing ${allCrawledPages.length} sources...\n`,
        });

        const crawledContent = formatCrawlResultsForAI(allCrawledPages);

        const synthesisPrompt = buildPrompt(SYNTHESIS_PROMPT, {
          query,
          research: crawledContent,
        });

        send({ type: "step_complete", step: "synthesizing" });

        // Start streaming the response
        send({ type: "response_start" });

        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: synthesisPrompt },
          ],
          "HIGH",
        )) {
          send({ type: "response_content", content: chunk });
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
