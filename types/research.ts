// Dynamic step type - AI determines the steps, "understanding" is always first
export type ResearchStepType = string;
export type ResearchStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "error";
export type ResearchStatus = "idle" | "researching" | "completed" | "error";

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
  images?: string[];
}

export interface ResearchState {
  query: string;
  images: string[];
  status: ResearchStatus;
  steps: ResearchStep[];
  sources: Source[];
  response: string;
  error: string | null;
  isPersonalQuestion: boolean;
  conversationHistory: ConversationTurn[];
  completedSessions: CompletedSession[];
}

export interface ResearchStepEvent {
  type:
    | "session_init"
    | "step_start"
    | "step_content"
    | "step_complete"
    | "source"
    | "response_start"
    | "response_content"
    | "response_replace"
    | "personal_question"
    | "error"
    | "done";
  sessionId?: string;
  slug?: string;
  step?: ResearchStepType;
  stepTitle?: string;
  content?: string;
  source?: Source;
  error?: string;
}

// Default step titles for common steps (fallback)
export const DEFAULT_STEP_TITLES: Record<string, string> = {
  understanding: "Understanding your question",
  searching: "Researching Islamic sources",
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
