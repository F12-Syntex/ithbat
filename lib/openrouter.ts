import { aiConfig, type ModelTier } from "./ai-config";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface UrlCitation {
  url: string;
  title: string;
  start_index?: number;
  end_index?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *streamChat(
    messages: ChatMessage[],
    tier: ModelTier,
    options: StreamOptions = {},
  ): AsyncGenerator<string> {
    const model = aiConfig.models[tier];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://ithbat.app",
        "X-Title": "Ithbat - Islamic Knowledge Research",
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        stream: true,
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || model.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
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

            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                yield content;
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream chat and collect URL citations from web search models.
   * Yields content chunks, and collects annotations (url_citations) returned by the model.
   * Call getAnnotations() after the generator completes to retrieve citations.
   */
  streamChatWithCitations(
    messages: ChatMessage[],
    tier: ModelTier,
    options: StreamOptions = {},
  ): { stream: AsyncGenerator<string>; getAnnotations: () => UrlCitation[] } {
    const annotations: UrlCitation[] = [];
    const model = aiConfig.models[tier];
    const apiKey = this.apiKey;
    const baseUrl = this.baseUrl;

    async function* generator(): AsyncGenerator<string> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ithbat.app",
          "X-Title": "Ithbat - Islamic Knowledge Research",
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          stream: true,
          max_tokens: options.maxTokens || model.maxTokens,
          temperature: options.temperature || model.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
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
              if (data === "[DONE]") return;

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];

                // Extract content
                const content = choice?.delta?.content;
                if (content) {
                  yield content;
                }

                // Collect annotations/citations from delta or message
                const deltaAnnotations = choice?.delta?.annotations;
                if (Array.isArray(deltaAnnotations)) {
                  for (const ann of deltaAnnotations) {
                    if (ann.type === "url_citation" && ann.url) {
                      annotations.push({
                        url: ann.url,
                        title: ann.title || "",
                        start_index: ann.start_index,
                        end_index: ann.end_index,
                      });
                    }
                  }
                }

                // Also check for citations in the message field (some models put them there)
                const messageAnnotations = choice?.message?.annotations;
                if (Array.isArray(messageAnnotations)) {
                  for (const ann of messageAnnotations) {
                    if (ann.type === "url_citation" && ann.url) {
                      annotations.push({
                        url: ann.url,
                        title: ann.title || "",
                        start_index: ann.start_index,
                        end_index: ann.end_index,
                      });
                    }
                  }
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    return {
      stream: generator(),
      getAnnotations: () => annotations,
    };
  }
}

let clientInstance: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!clientInstance) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }
    clientInstance = new OpenRouterClient(apiKey);
  }

  return clientInstance;
}

/**
 * Call Perplexity's Chat Completions API directly.
 * Supports images via standard OpenAI multimodal format.
 * Used for all SEARCH tier calls instead of OpenRouter.
 */
export async function* streamPerplexity(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): AsyncGenerator<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }

  const model = aiConfig.models.SEARCH;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages,
      stream: true,
      max_tokens: options.maxTokens || model.maxTokens,
      temperature: options.temperature || model.temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
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
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
