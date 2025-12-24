// Dynamic step type - AI determines the steps, "understanding" is always first
export type ResearchStepType = string;
export type ResearchStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "error";
export type ResearchStatus = "idle" | "researching" | "completed" | "error";
export type ResearchDepth = "fast" | "quick" | "standard" | "deep";

export interface Source {
  id: number;
  title: string;
  url: string;
  domain: string;
  trusted: boolean;
}

export interface ResearchStep {
  id: string;
  type: ResearchStepType;
  status: ResearchStepStatus;
  title: string;
  content: string;
  startTime?: number;
  endTime?: number;
}

export interface ConversationTurn {
  query: string;
  response: string;
}

export interface CompletedSession {
  query: string;
  response: string;
  steps: ResearchStep[];
}

export interface ResearchState {
  query: string;
  status: ResearchStatus;
  steps: ResearchStep[];
  sources: Source[];
  crawledLinks: CrawledLink[];
  evidence: StreamedEvidence[];
  response: string;
  error: string | null;
  depth: ResearchDepth;
  conversationHistory: ConversationTurn[];
  completedSessions: CompletedSession[];
}

export interface CrawledLink {
  url: string;
  title?: string;
  depth: number;
  status: "visiting" | "found" | "error";
  source?: string;
}

export interface StreamedEvidence {
  type: "hadith" | "quran" | "scholar" | "fatwa";
  title: string;
  content: string;
  source: string;
  url: string;
  grade?: string;
}

export interface ResearchStepEvent {
  type:
    | "session_init"
    | "step_start"
    | "step_content"
    | "step_complete"
    | "source"
    | "crawl_link"
    | "evidence"
    | "response_start"
    | "response_content"
    | "error"
    | "done";
  sessionId?: string;
  step?: ResearchStepType;
  stepTitle?: string;
  content?: string;
  source?: Source;
  crawlLink?: CrawledLink;
  evidence?: StreamedEvidence;
  error?: string;
}

// Default step titles for common steps (fallback)
export const DEFAULT_STEP_TITLES: Record<string, string> = {
  understanding: "Understanding your question",
  searching: "Searching Islamic sources",
  exploring: "AI exploring relevant links",
  synthesizing: "Preparing your answer",
};

export const DEPTH_CONFIG: Record<
  ResearchDepth,
  {
    label: string;
    description: string;
    sourcesToFetch: number;
    crawlDepth: number;
    maxPages: number;
  }
> = {
  fast: {
    label: "Fast",
    description: "Direct AI search with Perplexity - no crawling",
    sourcesToFetch: 0,
    crawlDepth: 0,
    maxPages: 0,
  },
  quick: {
    label: "Quick",
    description: "Search pages only, no deep crawling",
    sourcesToFetch: 3,
    crawlDepth: 0,
    maxPages: 10,
  },
  standard: {
    label: "Standard",
    description: "Follow 1 level of links",
    sourcesToFetch: 5,
    crawlDepth: 1,
    maxPages: 15,
  },
  deep: {
    label: "Deep",
    description: "Thorough research with Google search",
    sourcesToFetch: 10,
    crawlDepth: 2,
    maxPages: 25,
  },
};

export function createStep(
  type: ResearchStepType,
  title?: string,
): ResearchStep {
  return {
    id: `${type}-${Date.now()}`,
    type,
    status: "pending",
    title: title || DEFAULT_STEP_TITLES[type] || type,
    content: "",
    startTime: undefined,
    endTime: undefined,
  };
}
