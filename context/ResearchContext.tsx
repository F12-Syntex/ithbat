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
import { useSettings } from "@/context/SettingsContext";
import {
  type ResearchState,
  type ResearchStep,
  type ResearchStepType,
  type ResearchStepEvent,
  type CompletedSession,
  type ConversationTurn,
  type Source,
  createStep,
} from "@/types/research";

type ResearchAction =
  | { type: "START_RESEARCH"; query: string; images?: string[] }
  | {
      type: "START_FOLLOWUP";
      query: string;
      images?: string[];
      previousQuery: string;
      previousResponse: string;
      previousImages?: string[];
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
  | { type: "SET_SLUG"; slug: string }
  | {
      type: "HYDRATE_CHAT";
      sessionId: string;
      slug: string;
      query: string;
      response: string;
      steps: ResearchStep[];
      sources: Source[];
      images: string[];
      completedSessions: CompletedSession[];
      conversationHistory: ConversationTurn[];
    }
  | { type: "SET_PERSONAL_QUESTION" }
  | { type: "START_ANALYZING" }
  | { type: "APPEND_ANALYSIS"; content: string }
  | { type: "FINISH_ANALYZING" };

interface ResearchContextValue {
  state: ResearchState;
  isAnalyzing: boolean;
  slug: string | null;
  startResearch: (query: string, images?: string[]) => Promise<void>;
  askFollowUp: (question: string, images?: string[]) => Promise<void>;
  diveDeeper: () => Promise<void>;
  hydrateChat: (slug: string) => Promise<boolean>;
  cancelResearch: () => void;
  reset: () => void;
}

interface ExtendedResearchState extends ResearchState {
  sessionId: string | null;
  slug: string | null;
  isAnalyzing: boolean;
}

const initialState: ExtendedResearchState = {
  query: "",
  images: [],
  status: "idle",
  steps: [],
  sources: [],
  response: "",
  error: null,
  isPersonalQuestion: false,
  conversationHistory: [],
  completedSessions: [],
  sessionId: null,
  slug: null,
  isAnalyzing: false,
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
        images: action.images || [],
        status: "researching",
        sessionId: null,
        slug: null,
      };

    case "SET_SESSION_ID":
      return {
        ...state,
        sessionId: action.sessionId,
      };

    case "SET_SLUG":
      return {
        ...state,
        slug: action.slug,
      };

    case "HYDRATE_CHAT":
      return {
        ...initialState,
        sessionId: action.sessionId,
        slug: action.slug,
        query: action.query,
        images: action.images,
        response: action.response,
        steps: action.steps,
        sources: action.sources,
        completedSessions: action.completedSessions,
        conversationHistory: action.conversationHistory,
        status: "completed",
      };

    case "START_FOLLOWUP": {
      const currentSession = {
        query: action.previousQuery,
        response: action.previousResponse,
        steps: state.steps,
        ...(action.previousImages?.length
          ? { images: action.previousImages }
          : {}),
      };

      return {
        ...initialState,
        query: action.query,
        images: action.images || [],
        status: "researching",
        conversationHistory: [
          ...(state.conversationHistory || []),
          { query: action.previousQuery, response: action.previousResponse },
        ],
        completedSessions: [...(state.completedSessions || []), currentSession],
        sessionId: state.sessionId,
        slug: state.slug,
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
        isAnalyzing: false,
      };

    case "COMPLETE":
      return {
        ...state,
        status: "completed",
      };

    case "SET_PERSONAL_QUESTION":
      return {
        ...state,
        isPersonalQuestion: true,
      };

    case "RESET":
      return initialState;

    case "START_ANALYZING":
      return {
        ...state,
        status: "researching",
        isAnalyzing: true,
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
        isAnalyzing: false,
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
      if (event.slug) {
        dispatch({ type: "SET_SLUG", slug: event.slug });
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

    case "personal_question":
      dispatch({ type: "SET_PERSONAL_QUESTION" });
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
  const { settings } = useSettings();
  const languageRef = useRef(settings.language);

  languageRef.current = settings.language;

  const startResearch = useCallback(
    async (query: string, images?: string[]) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      dispatch({ type: "START_RESEARCH", query, images });

      try {
        for await (const event of streamResearch(
          query,
          abortControllerRef.current.signal,
          undefined,
          undefined,
          languageRef.current,
          images,
        )) {
          handleSSEEvent(event, dispatch);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          dispatch({ type: "SET_ERROR", error: error.message });
        }
      }
    },
    [],
  );

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
        languageRef.current,
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
  }, [
    state.query,
    state.response,
    state.status,
    state.conversationHistory,
    state.sessionId,
  ]);

  const askFollowUp = useCallback(
    async (question: string, images?: string[]) => {
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
        images,
        previousQuery,
        previousResponse,
        previousImages: state.images.length > 0 ? state.images : undefined,
      });

      const currentSessionId = (state as ExtendedResearchState).sessionId;

      try {
        for await (const event of streamResearch(
          question,
          abortControllerRef.current.signal,
          conversationHistory,
          currentSessionId || undefined,
          languageRef.current,
          images,
        )) {
          handleSSEEvent(event, dispatch);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          dispatch({ type: "SET_ERROR", error: error.message });
        }
      }
    },
    [state.query, state.response, state.conversationHistory, state.sessionId],
  );

  const hydrateChat = useCallback(
    async (chatSlug: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/chat/${chatSlug}`);

        if (!res.ok) return false;

        const data = await res.json();
        const conversations = data.conversations as Array<{
          query: string;
          response: string;
          steps: ResearchStep[];
          sources: Source[];
          images?: string[];
          isFollowUp: boolean;
        }>;

        if (!conversations || conversations.length === 0) return false;

        // Last conversation becomes the current state
        const last = conversations[conversations.length - 1];

        // All previous conversations become completedSessions + conversationHistory
        const completedSessions: CompletedSession[] = conversations
          .slice(0, -1)
          .map((c) => ({
            query: c.query,
            response: c.response,
            steps: c.steps || [],
            ...(c.images?.length ? { images: c.images } : {}),
          }));

        const conversationHistory: ConversationTurn[] = conversations
          .slice(0, -1)
          .map((c) => ({
            query: c.query,
            response: c.response,
          }));

        dispatch({
          type: "HYDRATE_CHAT",
          sessionId: data.sessionId || "",
          slug: chatSlug,
          query: last.query,
          response: last.response,
          steps: last.steps || [],
          sources: last.sources || [],
          images: last.images || [],
          completedSessions,
          conversationHistory,
        });

        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return (
    <ResearchContext.Provider
      value={{
        state,
        isAnalyzing: state.isAnalyzing,
        slug: state.slug,
        startResearch,
        askFollowUp,
        diveDeeper,
        hydrateChat,
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
