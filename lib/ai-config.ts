import { TRUSTED_DOMAIN_LIST } from "@/types/sources";

export type ModelTier = "QUICK" | "SEARCH";

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
      name: "Gemini 2.0 Flash Lite",
      description:
        "Fast responses for question understanding and quick lookups",
      supportsStreaming: true,
      supportsWebSearch: false,
      maxTokens: 4096,
      temperature: 0.7,
    },
    SEARCH: {
      id: "perplexity/sonar",
      name: "Perplexity Sonar",
      description: "Web search model for comprehensive Islamic source research",
      supportsStreaming: true,
      supportsWebSearch: true,
      maxTokens: 8192,
      temperature: 0.5,
    },
  },
  defaultTier: "SEARCH",
  trustedDomains: TRUSTED_DOMAIN_LIST,
};

export function getModel(tier: ModelTier): AIModel {
  return aiConfig.models[tier];
}

export function getModelId(tier: ModelTier): string {
  return aiConfig.models[tier].id;
}
