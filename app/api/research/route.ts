import { NextRequest } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  SYNTHESIS_PROMPT,
  buildPrompt,
} from "@/lib/prompts";
import { searchWeb, fetchPageContent, isTrustedDomain } from "@/lib/web-search";

interface ResearchStepEvent {
  type: "step_start" | "step_content" | "step_complete" | "error" | "done";
  step?: string;
  content?: string;
  error?: string;
}

function encodeSSE(event: ResearchStepEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  if (!query || typeof query !== "string") {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ResearchStepEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      const client = getOpenRouterClient();

      try {
        // Step 1: Understanding
        send({ type: "step_start", step: "understanding" });

        let understanding = "";
        const understandingPrompt = buildPrompt(UNDERSTANDING_PROMPT, { query });

        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: understandingPrompt },
          ],
          "QUICK"
        )) {
          understanding += chunk;
          send({ type: "step_content", step: "understanding", content: chunk });
        }

        send({ type: "step_complete", step: "understanding" });

        // Step 2: Real Web Search
        send({ type: "step_start", step: "searching" });

        let searchResults = "";

        try {
          send({ type: "step_content", step: "searching", content: `searching: "${query}"...\n` });

          const { results } = await searchWeb(query);

          if (results.length === 0) {
            send({ type: "step_content", step: "searching", content: "no results found\n" });
          } else {
            send({ type: "step_content", step: "searching", content: `found ${results.length} results\n\n` });

            // Fetch content from top trusted sources
            const trustedResults = results.filter((r) => isTrustedDomain(r.domain));
            const resultsToFetch = trustedResults.length > 0 ? trustedResults.slice(0, 3) : results.slice(0, 3);

            for (const result of resultsToFetch) {
              const trusted = isTrustedDomain(result.domain);
              send({
                type: "step_content",
                step: "searching",
                content: `[${result.domain}]${trusted ? " (trusted)" : ""}\n  ${result.title}\n  ${result.link}\n`,
              });

              // Fetch page content
              const content = await fetchPageContent(result.link);
              if (content) {
                searchResults += `\n\n--- SOURCE: ${result.title} (${result.link}) ---\n${content}\n`;
              }
            }

            send({ type: "step_content", step: "searching", content: "\nfetched content from sources\n" });
          }
        } catch (searchError) {
          const errorMsg = searchError instanceof Error ? searchError.message : "Search failed";
          send({ type: "step_content", step: "searching", content: `search error: ${errorMsg}\n` });
          // Continue without search results
          searchResults = "No web search results available. Please provide answer based on your knowledge.";
        }

        send({ type: "step_complete", step: "searching" });

        // Step 3: Synthesizing with real search results
        send({ type: "step_start", step: "synthesizing" });

        const synthesisPrompt = buildPrompt(SYNTHESIS_PROMPT, {
          query,
          research: searchResults || "No search results available.",
        });

        for await (const chunk of client.streamChat(
          [
            { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
            { role: "user", content: synthesisPrompt },
          ],
          "HIGH"
        )) {
          send({ type: "step_content", step: "synthesizing", content: chunk });
        }

        send({ type: "step_complete", step: "synthesizing" });
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
