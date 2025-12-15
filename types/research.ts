export type ResearchStepType = "understanding" | "searching" | "synthesizing";
export type ResearchStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "error";
export type ResearchStatus = "idle" | "researching" | "completed" | "error";

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
  error: string | null;
}

export interface ResearchStepEvent {
  type: "step_start" | "step_content" | "step_complete" | "error" | "done";
  step?: ResearchStepType;
  content?: string;
  error?: string;
}

export const STEP_TITLES: Record<ResearchStepType, string> = {
  understanding: "Understanding your question",
  searching: "Searching Islamic sources",
  synthesizing: "Preparing your answer",
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
