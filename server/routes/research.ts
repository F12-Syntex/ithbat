import { Router, type Request, type Response } from "express";

import { getOpenRouterClient } from "../services/openrouter";
import {
  ISLAMIC_RESEARCH_SYSTEM_PROMPT,
  UNDERSTANDING_PROMPT,
  SEARCH_PROMPT,
  SYNTHESIS_PROMPT,
  buildPrompt,
} from "../services/prompts";

const router = Router();

interface ResearchStepEvent {
  type: "step_start" | "step_content" | "step_complete" | "error" | "done";
  step?: string;
  content?: string;
  error?: string;
}

function sendSSE(res: Response, event: ResearchStepEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

router.post("/research", async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query is required" });

    return;
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = getOpenRouterClient();

  try {
    // Step 1: Understanding
    sendSSE(res, { type: "step_start", step: "understanding" });

    let understanding = "";
    const understandingPrompt = buildPrompt(UNDERSTANDING_PROMPT, { query });

    for await (const chunk of client.streamChat(
      [
        { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: understandingPrompt },
      ],
      "QUICK",
    )) {
      understanding += chunk;
      sendSSE(res, {
        type: "step_content",
        step: "understanding",
        content: chunk,
      });
    }

    sendSSE(res, { type: "step_complete", step: "understanding" });

    // Step 2: Searching
    sendSSE(res, { type: "step_start", step: "searching" });

    let research = "";
    const searchPrompt = buildPrompt(SEARCH_PROMPT, { query, understanding });

    for await (const chunk of client.streamChat(
      [
        { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: searchPrompt },
      ],
      "REASONING",
    )) {
      research += chunk;
      sendSSE(res, { type: "step_content", step: "searching", content: chunk });
    }

    sendSSE(res, { type: "step_complete", step: "searching" });

    // Step 3: Synthesizing
    sendSSE(res, { type: "step_start", step: "synthesizing" });

    const synthesisPrompt = buildPrompt(SYNTHESIS_PROMPT, { query, research });

    for await (const chunk of client.streamChat(
      [
        { role: "system", content: ISLAMIC_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: synthesisPrompt },
      ],
      "HIGH",
    )) {
      sendSSE(res, {
        type: "step_content",
        step: "synthesizing",
        content: chunk,
      });
    }

    sendSSE(res, { type: "step_complete", step: "synthesizing" });
    sendSSE(res, { type: "done" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    sendSSE(res, { type: "error", error: message });
  } finally {
    res.end();
  }
});

export default router;
