import { aiConfig, type ModelTier } from "../config/ai";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
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
        temperature: options.temperature || 0.7,
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

  async chat(
    messages: ChatMessage[],
    tier: ModelTier,
    options: StreamOptions = {},
  ): Promise<string> {
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
        stream: false,
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return data.choices?.[0]?.message?.content || "";
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
