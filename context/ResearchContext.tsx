"use client";

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { streamResearch } from "@/lib/api";
import {
  type ResearchState,
  type ResearchStep,
  type ResearchStepType,
  type ResearchDepth,
  type Source,
  type CrawledLink,
  createStep,
} from "@/types/research";

type ResearchAction =
  | { type: "START_RESEARCH"; query: string; depth: ResearchDepth }
  | {
      type: "START_FOLLOWUP";
      query: string;
      depth: ResearchDepth;
      previousQuery: string;
      previousResponse: string;
    }
  | { type: "ADD_STEP"; stepType: ResearchStepType; stepTitle?: string }
  | {
      type: "UPDATE_STEP_STATUS";
      stepType: ResearchStepType;
      status: ResearchStep["status"];
    }
  | { type: "APPEND_STEP_CONTENT"; stepType: ResearchStepType; content: string }
  | { type: "ADD_SOURCE"; source: Source }
  | { type: "ADD_CRAWL_LINK"; crawlLink: CrawledLink }
  | { type: "SET_RESPONSE"; content: string }
  | { type: "APPEND_RESPONSE"; content: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "COMPLETE" }
  | { type: "RESET" };

interface ResearchContextValue {
  state: ResearchState;
  startResearch: (query: string) => Promise<void>;
  askFollowUp: (question: string) => Promise<void>;
  cancelResearch: () => void;
  reset: () => void;
}

const initialState: ResearchState = {
  query: "",
  status: "idle",
  steps: [],
  sources: [],
  crawledLinks: [],
  response: "",
  error: null,
  depth: "deep",
  conversationHistory: [],
  completedSessions: [],
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
        depth: action.depth,
      };

    case "START_FOLLOWUP":
      // Save the current session to completed sessions before starting new one
      const currentSession = {
        query: action.previousQuery,
        response: action.previousResponse,
        steps: state.steps,
      };

      return {
        ...initialState,
        query: action.query,
        status: "researching",
        depth: action.depth,
        conversationHistory: [
          ...(state.conversationHistory || []),
          { query: action.previousQuery, response: action.previousResponse },
        ],
        completedSessions: [...(state.completedSessions || []), currentSession],
      };

    case "ADD_STEP":
      const newStep = createStep(action.stepType, action.stepTitle);

      newStep.startTime = Date.now();

      return {
        ...state,
        steps: [...state.steps, newStep],
      };

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

    case "ADD_CRAWL_LINK":
      // Update existing link or add new one
      const existingIndex = state.crawledLinks.findIndex(
        (l) => l.url === action.crawlLink.url,
      );

      if (existingIndex >= 0) {
        const updated = [...state.crawledLinks];

        updated[existingIndex] = action.crawlLink;

        return { ...state, crawledLinks: updated };
      }

      return {
        ...state,
        crawledLinks: [...state.crawledLinks, action.crawlLink],
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

    default:
      return state;
  }
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(researchReducer, initialState);
  const [depth] = useState<ResearchDepth>("deep");
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = async (query: string) => {
    // Cancel any existing research
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    dispatch({ type: "START_RESEARCH", query, depth });

    try {
      for await (const event of streamResearch(
        query,
        depth,
        abortControllerRef.current.signal,
      )) {
        switch (event.type) {
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

          case "crawl_link":
            if (event.crawlLink) {
              dispatch({ type: "ADD_CRAWL_LINK", crawlLink: event.crawlLink });
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

  const askFollowUp = async (question: string) => {
    // Cancel any existing research
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const previousQuery = state.query;
    const previousResponse = state.response;

    // Build conversation history including current Q&A
    const conversationHistory = [
      ...(state.conversationHistory || []),
      { query: previousQuery, response: previousResponse },
    ];

    dispatch({
      type: "START_FOLLOWUP",
      query: question,
      depth,
      previousQuery,
      previousResponse,
    });

    try {
      for await (const event of streamResearch(
        question,
        depth,
        abortControllerRef.current.signal,
        conversationHistory,
      )) {
        switch (event.type) {
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

          case "crawl_link":
            if (event.crawlLink) {
              dispatch({ type: "ADD_CRAWL_LINK", crawlLink: event.crawlLink });
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

  return (
    <ResearchContext.Provider
      value={{ state, startResearch, askFollowUp, cancelResearch, reset }}
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
