import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  SYNTHESIS_PROMPT,
  buildPrompt,
} from "@/lib/prompts";
import {
  crawlIslamicSources,
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
  content?: string;
  source?: Source;
  crawlLink?: CrawledLink;
  error?: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { query, depth = "standard" } = await request.json();

  if (!query || typeof query !== "string") {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const depthConfig =
    DEPTH_CONFIG[depth as ResearchDepth] || DEPTH_CONFIG.standard;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ResearchStepEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      const client = getOpenRouterClient();
      const sources: Source[] = [];
      const crawledPages: CrawledPage[] = [];

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

        // Step 2: Web Crawling
        send({ type: "step_start", step: "searching" });
        send({
          type: "step_content",
          step: "searching",
          content: `Starting web crawl for "${query}"...\n`,
        });
        send({
          type: "step_content",
          step: "searching",
          content: `Depth: ${depthConfig.crawlDepth} levels, Max pages: ${depthConfig.maxPages}\n\n`,
        });

        try {
          const crawler = crawlIslamicSources(
            query,
            depthConfig.crawlDepth,
            depthConfig.maxPages,
          );

          let sourceId = 1;
          let result = await crawler.next();

          while (!result.done) {
            const progress = result.value;

            // Send crawl link event for UI tracking
            if (progress.type === "visiting") {
              send({
                type: "crawl_link",
                crawlLink: {
                  url: progress.url!,
                  depth: progress.depth!,
                  status: "visiting",
                },
              });
              send({
                type: "step_content",
                step: "searching",
                content: `${"  ".repeat(progress.depth!)}→ ${progress.url}\n`,
              });
            } else if (progress.type === "found") {
              send({
                type: "crawl_link",
                crawlLink: {
                  url: progress.url!,
                  title: progress.title,
                  depth: progress.depth!,
                  status: "found",
                },
              });
              send({
                type: "step_content",
                step: "searching",
                content: `${"  ".repeat(progress.depth!)}✓ Found: ${progress.title?.slice(0, 60) || "Page"}...\n`,
              });

              // Create source for UI
              const source: Source = {
                id: sourceId++,
                title: progress.title || "Page",
                url: progress.url!,
                domain: new URL(progress.url!).hostname.replace("www.", ""),
                trusted: true,
              };

              sources.push(source);
              send({ type: "source", source });
            } else if (progress.type === "error") {
              send({
                type: "crawl_link",
                crawlLink: {
                  url: progress.url!,
                  depth: progress.depth || 0,
                  status: "error",
                },
              });
              send({
                type: "step_content",
                step: "searching",
                content: `✗ Failed: ${progress.url}\n`,
              });
            }

            result = await crawler.next();
          }

          // Get final crawl results
          const crawlResult = result.value;

          crawledPages.push(...crawlResult.pages);

          send({
            type: "step_content",
            step: "searching",
            content: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
          });
          send({
            type: "step_content",
            step: "searching",
            content: `Crawl complete: ${crawlResult.pages.length} pages, ${crawlResult.visitedUrls.length} URLs visited\n`,
          });
          send({
            type: "step_content",
            step: "searching",
            content: `Time: ${(crawlResult.totalTime / 1000).toFixed(1)}s\n`,
          });
        } catch (crawlError) {
          const errorMsg =
            crawlError instanceof Error ? crawlError.message : "Crawl failed";

          send({
            type: "step_content",
            step: "searching",
            content: `\nCrawl error: ${errorMsg}\n`,
          });
        }

        send({ type: "step_complete", step: "searching" });

        // Step 3: Synthesizing with crawled content only
        send({ type: "step_start", step: "synthesizing" });
        send({
          type: "step_content",
          step: "synthesizing",
          content: `Analyzing ${crawledPages.length} crawled sources...\n`,
        });

        const crawledContent = formatCrawlResultsForAI(crawledPages);

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
