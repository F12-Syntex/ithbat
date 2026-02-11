"use client";

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

import { streamResearch } from "@/lib/api";
import {
  type ResearchState,
  type ResearchStep,
  type ResearchStepType,
  type ResearchStepEvent,
  type Source,
  createStep,
} from "@/types/research";

type ResearchAction =
  | { type: "START_RESEARCH"; query: string }
  | {
      type: "START_FOLLOWUP";
      query: string;
      previousQuery: string;
      previousResponse: string;
    }
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "ADD_STEP"; stepType: ResearchStepType; stepTitle?: string }
  | {
      type: "UPDATE_STEP_STATUS";
      stepType: ResearchStepType;
      status: ResearchStep["status"];
    }
  | { type: "APPEND_STEP_CONTENT"; stepType: ResearchStepType; content: string }
  | { type: "ADD_SOURCE"; source: Source }
  | { type: "SET_RESPONSE"; content: string }
  | { type: "APPEND_RESPONSE"; content: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "COMPLETE" }
  | { type: "RESET" }
  | { type: "START_ANALYZING" }
  | { type: "APPEND_ANALYSIS"; content: string }
  | { type: "FINISH_ANALYZING" };

interface ResearchContextValue {
  state: ResearchState;
  startResearch: (query: string) => Promise<void>;
  askFollowUp: (question: string) => Promise<void>;
  diveDeeper: () => Promise<void>;
  cancelResearch: () => void;
  reset: () => void;
}

interface ExtendedResearchState extends ResearchState {
  sessionId: string | null;
}

const initialState: ExtendedResearchState = {
  query: "",
  status: "idle",
  steps: [],
  sources: [],
  response: "",
  error: null,
  conversationHistory: [],
  completedSessions: [],
  sessionId: null,
};

function researchReducer(
  state: ExtendedResearchState,
  action: ResearchAction,
): ExtendedResearchState {
  switch (action.type) {
    case "START_RESEARCH":
      return {
        ...initialState,
        query: action.query,
        status: "researching",
        sessionId: null,
      };

    case "SET_SESSION_ID":
      return {
        ...state,
        sessionId: action.sessionId,
      };

    case "START_FOLLOWUP": {
      const currentSession = {
        query: action.previousQuery,
        response: action.previousResponse,
        steps: state.steps,
      };

      return {
        ...initialState,
        query: action.query,
        status: "researching",
        conversationHistory: [
          ...(state.conversationHistory || []),
          { query: action.previousQuery, response: action.previousResponse },
        ],
        completedSessions: [...(state.completedSessions || []), currentSession],
        sessionId: state.sessionId,
      };
    }

    case "ADD_STEP": {
      const newStep = createStep(action.stepType, action.stepTitle);
      newStep.startTime = Date.now();
      newStep.status = "in_progress";

      return {
        ...state,
        steps: [...state.steps, newStep],
      };
    }

    case "UPDATE_STEP_STATUS":
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.type === action.stepType
            ? {
                ...step,
                status: action.status,
                endTime:
                  action.status === "completed" ? Date.now() : step.endTime,
              }
            : step,
        ),
      };

    case "APPEND_STEP_CONTENT":
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.type === action.stepType
            ? {
                ...step,
                content: step.content + action.content,
                status: "in_progress",
              }
            : step,
        ),
      };

    case "ADD_SOURCE":
      return {
        ...state,
        sources: [...state.sources, action.source],
      };

    case "SET_RESPONSE":
      return {
        ...state,
        response: action.content,
      };

    case "APPEND_RESPONSE":
      return {
        ...state,
        response: state.response + action.content,
      };

    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        error: action.error,
      };

    case "COMPLETE":
      return {
        ...state,
        status: "completed",
      };

    case "RESET":
      return initialState;

    case "START_ANALYZING":
      return {
        ...state,
        status: "researching",
      };

    case "APPEND_ANALYSIS":
      return {
        ...state,
        response: state.response + action.content,
      };

    case "FINISH_ANALYZING":
      return {
        ...state,
        status: "completed",
      };

    default:
      return state;
  }
}

function handleSSEEvent(
  event: ResearchStepEvent,
  dispatch: React.Dispatch<ResearchAction>,
) {
  switch (event.type) {
    case "session_init":
      if (event.sessionId) {
        dispatch({ type: "SET_SESSION_ID", sessionId: event.sessionId });
      }
      break;

    case "step_start":
      if (event.step) {
        dispatch({
          type: "ADD_STEP",
          stepType: event.step,
          stepTitle: event.stepTitle,
        });
      }
      break;

    case "step_content":
      if (event.step && event.content) {
        dispatch({
          type: "APPEND_STEP_CONTENT",
          stepType: event.step,
          content: event.content,
        });
      }
      break;

    case "step_complete":
      if (event.step) {
        dispatch({
          type: "UPDATE_STEP_STATUS",
          stepType: event.step,
          status: "completed",
        });
      }
      break;

    case "source":
      if (event.source) {
        dispatch({ type: "ADD_SOURCE", source: event.source });
      }
      break;

    case "response_start":
      dispatch({ type: "SET_RESPONSE", content: "" });
      break;

    case "response_content":
      if (event.content) {
        dispatch({ type: "APPEND_RESPONSE", content: event.content });
      }
      break;

    case "response_replace":
      if (event.content) {
        dispatch({ type: "SET_RESPONSE", content: event.content });
      }
      break;

    case "error":
      dispatch({
        type: "SET_ERROR",
        error: event.error || "Unknown error",
      });
      break;

    case "done":
      dispatch({ type: "COMPLETE" });
      break;
  }
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(researchReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(async (query: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    dispatch({ type: "START_RESEARCH", query });

    try {
      for await (const event of streamResearch(
        query,
        abortControllerRef.current.signal,
      )) {
        handleSSEEvent(event, dispatch);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        dispatch({ type: "SET_ERROR", error: error.message });
      }
    }
  }, []);

  const cancelResearch = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  }, []);

  const diveDeeper = useCallback(async () => {
    if (!state.query || !state.response || state.status !== "completed") {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    dispatch({ type: "START_ANALYZING" });

    const conversationHistory = [
      ...(state.conversationHistory || []),
      { query: state.query, response: state.response },
    ];

    const currentSessionId = (state as ExtendedResearchState).sessionId;

    try {
      let newContent = "";

      for await (const event of streamResearch(
        `Provide additional depth, details, scholarly opinions, and evidence on this topic that was NOT already covered: ${state.query}`,
        abortControllerRef.current.signal,
        conversationHistory,
        currentSessionId || undefined,
      )) {
        if (event.type === "source" && event.source) {
          dispatch({ type: "ADD_SOURCE", source: event.source });
        }
        if (event.type === "response_content" && event.content) {
          newContent += event.content;
        }
      }

      if (newContent) {
        dispatch({
          type: "APPEND_ANALYSIS",
          content: "\n\n---\n\n" + newContent,
        });
      }

      dispatch({ type: "FINISH_ANALYZING" });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        dispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "Dive deeper failed",
        });
      }
    }
  }, [state.query, state.response, state.status, state.conversationHistory, state.sessionId]);

  const askFollowUp = useCallback(async (question: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const previousQuery = state.query;
    const previousResponse = state.response;

    const conversationHistory = [
      ...(state.conversationHistory || []),
      { query: previousQuery, response: previousResponse },
    ];

    dispatch({
      type: "START_FOLLOWUP",
      query: question,
      previousQuery,
      previousResponse,
    });

    const currentSessionId = (state as ExtendedResearchState).sessionId;

    try {
      for await (const event of streamResearch(
        question,
        abortControllerRef.current.signal,
        conversationHistory,
        currentSessionId || undefined,
      )) {
        handleSSEEvent(event, dispatch);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        dispatch({ type: "SET_ERROR", error: error.message });
      }
    }
  }, [state.query, state.response, state.conversationHistory, state.sessionId]);

  return (
    <ResearchContext.Provider
      value={{
        state,
        startResearch,
        askFollowUp,
        diveDeeper,
        cancelResearch,
        reset,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearchContext() {
  const context = useContext(ResearchContext);

  if (!context) {
    throw new Error(
      "useResearchContext must be used within a ResearchProvider",
    );
  }

  return context;
}
