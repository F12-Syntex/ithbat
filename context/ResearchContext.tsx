"use client";

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { streamResearch } from "@/lib/api";
import {
  type ResearchState,
  type ResearchStep,
  type ResearchStepType,
  createStep,
} from "@/types/research";

type ResearchAction =
  | { type: "START_RESEARCH"; query: string }
  | { type: "ADD_STEP"; stepType: ResearchStepType }
  | {
      type: "UPDATE_STEP_STATUS";
      stepType: ResearchStepType;
      status: ResearchStep["status"];
    }
  | { type: "APPEND_STEP_CONTENT"; stepType: ResearchStepType; content: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "COMPLETE" }
  | { type: "RESET" };

interface ResearchContextValue {
  state: ResearchState;
  startResearch: (query: string) => Promise<void>;
  cancelResearch: () => void;
  reset: () => void;
}

const initialState: ResearchState = {
  query: "",
  status: "idle",
  steps: [],
  error: null,
};

function researchReducer(
  state: ResearchState,
  action: ResearchAction,
): ResearchState {
  switch (action.type) {
    case "START_RESEARCH":
      return {
        ...initialState,
        query: action.query,
        status: "researching",
      };

    case "ADD_STEP":
      return {
        ...state,
        steps: [...state.steps, createStep(action.stepType)],
      };

    case "UPDATE_STEP_STATUS":
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.type === action.stepType
            ? { ...step, status: action.status }
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

    default:
      return state;
  }
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(researchReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = async (query: string) => {
    // Cancel any existing research
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    dispatch({ type: "START_RESEARCH", query });

    try {
      for await (const event of streamResearch(
        query,
        abortControllerRef.current.signal,
      )) {
        switch (event.type) {
          case "step_start":
            if (event.step) {
              dispatch({ type: "ADD_STEP", stepType: event.step });
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
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        dispatch({ type: "SET_ERROR", error: error.message });
      }
    }
  };

  const cancelResearch = () => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  };

  const reset = () => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  };

  return (
    <ResearchContext.Provider
      value={{ state, startResearch, cancelResearch, reset }}
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
