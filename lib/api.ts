import type { ResearchStepEvent, ConversationTurn } from "@/types/research";

export async function* streamResearch(
  query: string,
  signal?: AbortSignal,
  conversationHistory?: ConversationTurn[],
  sessionId?: string,
  language?: string,
  images?: string[],
): AsyncGenerator<ResearchStepEvent> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      conversationHistory,
      sessionId,
      language,
      images,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Research request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();

          if (data) {
            try {
              const event: ResearchStepEvent = JSON.parse(data);

              yield event;
            } catch {
              // Skip malformed events
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
