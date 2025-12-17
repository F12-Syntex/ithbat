export type ModelTier = "QUICK" | "HIGH" | "REASONING";

export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsStreaming: boolean;
  supportsWebSearch: boolean;
  maxTokens: number;
  temperature: number;
}

export interface AIConfig {
  models: Record<ModelTier, AIModel>;
  defaultTier: ModelTier;
  trustedDomains: string[];
}

export const aiConfig: AIConfig = {
  models: {
    QUICK: {
      id: "google/gemini-2.0-flash-lite-001",
      name: "Gemini 2.5 Flash",
      description:
        "Fast responses for question understanding and quick lookups",
      supportsStreaming: true,
      supportsWebSearch: false,
      maxTokens: 4096,
      temperature: 0.7,
    },
    HIGH: {
      id: "google/gemini-2.0-flash-lite-001",
      name: "Gemini 2.5 Flash",
      description: "High quality responses for synthesis and detailed analysis",
      supportsStreaming: true,
      supportsWebSearch: false,
      maxTokens: 8192,
      temperature: 0.7,
    },
    REASONING: {
      id: "google/gemini-2.0-flash-lite-001",
      name: "Gemini 2.5 Flash",
      description:
        "Deep research with built-in web search for comprehensive Islamic sources",
      supportsStreaming: true,
      supportsWebSearch: true,
      maxTokens: 8192,
      temperature: 0.7,
    },
  },
  defaultTier: "HIGH",
  trustedDomains: [
    "quran.com",
    "sunnah.com",
    "islamqa.info",
    "islamweb.net",
    "seekersguidance.org",
    "islamqa.org",
  ],
};

export function getModel(tier: ModelTier): AIModel {
  return aiConfig.models[tier];
}

export function getModelId(tier: ModelTier): string {
  return aiConfig.models[tier].id;
}
