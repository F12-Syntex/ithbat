export type ResearchStepType =
  | "understanding"
  | "searching"
  | "exploring"
  | "synthesizing";
export type ResearchStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "error";
export type ResearchStatus = "idle" | "researching" | "completed" | "error";
export type ResearchDepth = "quick" | "standard" | "deep";

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
}

export interface ResearchState {
  query: string;
  status: ResearchStatus;
  steps: ResearchStep[];
  sources: Source[];
  crawledLinks: CrawledLink[];
  response: string;
  error: string | null;
  depth: ResearchDepth;
}

export interface CrawledLink {
  url: string;
  title?: string;
  depth: number;
  status: "visiting" | "found" | "error";
  source?: string;
}

export interface ResearchStepEvent {
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
  step?: ResearchStepType;
  content?: string;
  source?: Source;
  crawlLink?: CrawledLink;
  error?: string;
}

export const STEP_TITLES: Record<ResearchStepType, string> = {
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
  quick: {
    label: "Quick",
    description: "Search pages only, no deep crawling",
    sourcesToFetch: 3,
    crawlDepth: 0,
    maxPages: 3,
  },
  standard: {
    label: "Standard",
    description: "Follow 1 level of links",
    sourcesToFetch: 5,
    crawlDepth: 1,
    maxPages: 8,
  },
  deep: {
    label: "Deep",
    description: "Recursive crawling, 3 levels deep",
    sourcesToFetch: 15,
    crawlDepth: 3,
    maxPages: 20,
  },
};

export function createStep(type: ResearchStepType): ResearchStep {
  return {
    id: `${type}-${Date.now()}`,
    type,
    status: "pending",
    title: STEP_TITLES[type],
    content: "",
  };
}
