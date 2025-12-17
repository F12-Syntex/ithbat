"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clipboard,
  Copy,
  ClipboardPaste,
  Sun,
  Moon,
  Settings,
  RefreshCw,
  Lightbulb,
  ChevronDown,
} from "lucide-react";

import { SearchInput } from "./SearchInput";
import { ResearchStep } from "./ResearchStep";
import { ResearchResponse } from "./ResearchResponse";
import { FollowUpInput } from "./FollowUpInput";
import { ResearchPipeline } from "./pipeline";
import { SourceFlow } from "./sources";
import { ResearchLog } from "./ResearchLog";

import { ContextMenu } from "@/components/ContextMenu";
import { SettingsPanel } from "@/components/SettingsPanel";
import { IntroModal } from "@/components/IntroModal";
import { HowItWorks } from "@/components/HowItWorks";
import { useResearch } from "@/hooks/useResearch";
import { useTheme } from "@/context/ThemeContext";

// Pool of common Islamic questions
const EXAMPLE_QUESTIONS = [
  // Salah (Prayer)
  "How to pray Fajr?",
  "Prayer while traveling",
  "Can I combine prayers?",
  "What breaks wudu?",
  "Is music haram?",
  "Praying in congregation",
  // Fasting
  "What breaks the fast?",
  "Fasting while sick",
  "Making up missed fasts",
  "Fasting on Ashura",
  "Can I brush teeth while fasting?",
  // Zakat & Charity
  "Rules of Zakat",
  "Zakat on gold",
  "Who can receive Zakat?",
  "Sadaqah vs Zakat",
  // Hajj & Umrah
  "Steps of Hajj",
  "Umrah requirements",
  "Ihram rules",
  // Daily Life
  "Is insurance halal?",
  "Halal investing rules",
  "Can Muslims have dogs?",
  "Is cryptocurrency halal?",
  "Beard in Islam",
  "Hijab requirements",
  // Marriage & Family
  "Rights of the wife",
  "Mahr requirements",
  "Marriage in Islam",
  "Divorce in Islam",
  // Quran & Hadith
  "How to memorize Quran?",
  "Virtues of Surah Kahf",
  "Best dhikr to recite",
  "Dua for anxiety",
  // Beliefs
  "Signs of the Day of Judgment",
  "Who are the angels?",
  "What is Qadr?",
  "Intercession in Islam",
  // Ethics
  "Backbiting in Islam",
  "Lying exceptions",
  "Treatment of parents",
  "Rights of neighbors",
];

function getRandomQuestions(count: number): string[] {
  const shuffled = [...EXAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

export function ResearchContainer() {
  const {
    state,
    startResearch: baseStartResearch,
    askFollowUp: baseAskFollowUp,
    requestAIAnalysis,
    cancelResearch,
    reset,
  } = useResearch();
  const { theme, setTheme, themes } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>();

  // Wrapper functions - never include AI summary by default
  const startResearch = useCallback(
    (query: string) => baseStartResearch(query, false),
    [baseStartResearch],
  );
  const askFollowUp = (question: string) => baseAskFollowUp(question, false);

  // Handler to clear suggested query after it's been applied to the input
  const handleSuggestedQueryApplied = useCallback(
    () => setSuggestedQuery(undefined),
    [],
  );

  // Random example questions - set client-side only to avoid hydration mismatch
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([
    EXAMPLE_QUESTIONS[0],
    EXAMPLE_QUESTIONS[1],
    EXAMPLE_QUESTIONS[2],
  ]);

  useEffect(() => {
    setExampleQuestions(getRandomQuestions(3));
  }, []);

  const isResearching = state.status === "researching";
  const hasResults =
    state.steps.length > 0 || (state.completedSessions?.length || 0) > 0;
  const isStreaming = isResearching && state.response.length > 0;

  const toggleDarkMode = () => {
    const currentMode = theme.mode;
    const newMode = currentMode === "dark" ? "light" : "dark";
    const newTheme = themes.find(
      (t) => t.mode === newMode && t.accent === theme.accent,
    );

    if (newTheme) setTheme(newTheme);
  };

  const handlePasteAndSearch = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (text.trim()) {
        startResearch(text.trim());
      }
    } catch {
      // Clipboard access denied
    }
  };

  const contextMenuItems = [
    {
      label: "New Search",
      icon: <Search className="w-4 h-4" strokeWidth={2} />,
      onClick: reset,
    },
    {
      label: "Paste & Search",
      icon: <Clipboard className="w-4 h-4" strokeWidth={2} />,
      onClick: handlePasteAndSearch,
    },
    { divider: true as const },
    {
      label: "Copy",
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        const selection = window.getSelection()?.toString();

        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      },
    },
    {
      label: "Paste",
      icon: <ClipboardPaste className="w-4 h-4" strokeWidth={2} />,
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          // Focus on active input and paste
          const activeElement = document.activeElement as HTMLInputElement;

          if (
            activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA"
          ) {
            const start = activeElement.selectionStart || 0;
            const end = activeElement.selectionEnd || 0;
            const value = activeElement.value;

            activeElement.value =
              value.slice(0, start) + text + value.slice(end);
            activeElement.selectionStart = activeElement.selectionEnd =
              start + text.length;
            activeElement.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } catch {
          // Clipboard access denied
        }
      },
    },
    { divider: true as const },
    {
      label: "Copy Response",
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        if (state.response) {
          navigator.clipboard.writeText(state.response);
        }
      },
      disabled: !state.response,
    },
    {
      label: "Copy Query",
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        if (state.query) {
          navigator.clipboard.writeText(state.query);
        }
      },
      disabled: !state.query,
    },
    { divider: true as const },
    {
      label: theme.mode === "dark" ? "Light Mode" : "Dark Mode",
      icon:
        theme.mode === "dark" ? (
          <Sun className="w-4 h-4" strokeWidth={2} />
        ) : (
          <Moon className="w-4 h-4" strokeWidth={2} />
        ),
      onClick: toggleDarkMode,
    },
    {
      label: "Settings",
      icon: <Settings className="w-4 h-4" strokeWidth={2} />,
      onClick: () => setSettingsOpen(true),
    },
    { divider: true as const },
    {
      label: "Reload Page",
      icon: <RefreshCw className="w-4 h-4" strokeWidth={2} />,
      onClick: () => window.location.reload(),
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      {/* Intro Modal for first-time visitors */}
      <IntroModal />

      <div className="relative h-screen h-[100dvh] overflow-hidden bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        {/* Settings Button - Fixed top right (desktop only) */}
        <button
          aria-label="Settings"
          className="hidden sm:flex fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 items-center justify-center shadow-sm hover:shadow-md hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-5 h-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
        </button>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* Search Section - Centers when no results, scrolls with content when results exist */}
          <div
            className={`flex flex-col items-center justify-center px-3 sm:px-4 transition-all duration-500 ease-out ${
              hasResults ? "pt-4 sm:pt-6 pb-3 sm:pb-4" : "flex-1"
            }`}
          >
            {/* Title - Animate out when searching */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="text-center mb-6 sm:mb-8"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="relative inline-block group">
                    <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-800 dark:text-neutral-100 cursor-default">
                      إثبات
                    </h1>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                      <div className="px-2.5 py-1 bg-neutral-800 dark:bg-neutral-200 text-neutral-100 dark:text-neutral-800 text-[11px] rounded-md whitespace-nowrap">
                        Proof / Evidence
                      </div>
                    </div>
                  </div>
                  <p className="text-neutral-400 dark:text-neutral-500 text-xs sm:text-sm mt-2">
                    Search hadith, Quran, and scholarly rulings
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Input with mobile settings button */}
            <div className="w-full max-w-md flex items-center gap-2">
              <div className="flex-1">
                <SearchInput
                  isLoading={isResearching}
                  suggestedQuery={suggestedQuery}
                  onCancel={cancelResearch}
                  onSearch={startResearch}
                  onSuggestedQueryApplied={handleSuggestedQueryApplied}
                />
              </div>
              {/* Mobile settings button - matches search input (px-4 py-3 with h-8 content) */}
              <button
                aria-label="Settings"
                className="sm:hidden flex-shrink-0 px-4 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-8 h-8 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
              </button>
            </div>

            {/* Example Buttons */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 px-2"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {exampleQuestions.map((example, i) => (
                    <motion.button
                      key={example}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400 transition-all active:scale-95 sm:hover:scale-105"
                      initial={{ opacity: 0, y: 10 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSuggestedQuery(example)}
                    >
                      {example}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it Works */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="mt-6 sm:mt-8 flex justify-center"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <HowItWorks />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Section - Part of scrollable content */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="px-3 sm:px-4"
                exit={{ opacity: 0, y: 50 }}
                initial={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="max-w-2xl mx-auto py-3 sm:py-4">
                  {/* Completed Sessions (Previous Q&A in thread) */}
                  {state.completedSessions?.map((session, sessionIndex) => (
                    <div key={sessionIndex} className="mb-6">
                      {/* Previous Query - with New conversation button on first session */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {sessionIndex + 1}
                          </span>
                        </span>
                        <span className="flex-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                          {session.query}
                        </span>
                        {sessionIndex === 0 && state.status === "completed" && (
                          <button
                            className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                            type="button"
                            onClick={reset}
                          >
                            New conversation
                          </button>
                        )}
                      </div>

                      {/* Previous Progress (collapsed by default) */}
                      <div className="bg-white dark:bg-neutral-900 rounded-lg sm:rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3 opacity-75">
                        <details className="group">
                          <summary className="px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-between">
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              Progress ({session.steps.length} steps)
                            </span>
                            <ChevronDown className="w-3 h-3 text-neutral-400 transition-transform group-open:rotate-180" strokeWidth={2} />
                          </summary>
                          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
                            {session.steps.map((step, stepIndex) => (
                              <ResearchStep
                                key={step.id}
                                defaultExpanded={false}
                                index={stepIndex}
                                step={step}
                              />
                            ))}
                          </div>
                        </details>
                      </div>

                      {/* Previous Response */}
                      <div className="opacity-90">
                        <ResearchResponse
                          content={session.response}
                          isStreaming={false}
                        />
                      </div>

                      {/* Divider between sessions */}
                      <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          Follow-up
                        </span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                    </div>
                  ))}

                  {/* Current Session */}
                  {state.steps.length > 0 && (
                    <>
                      {/* Current Query Display */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {(state.completedSessions?.length || 0) + 1}
                          </span>
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                          {state.query}
                        </span>
                      </div>

                      {/* Research Pipeline - Horizontal Flow */}
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-neutral-900 rounded-lg sm:rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3"
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.1 }}
                      >
                        <ResearchPipeline
                          isCompact={false}
                          showDetails={false}
                          steps={state.steps}
                        />
                      </motion.div>

                      {/* Research Log - Separate content display */}
                      {state.steps.some((s) => s.content) && (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4"
                          initial={{ opacity: 0, y: 10 }}
                          transition={{ delay: 0.15 }}
                        >
                          <ResearchLog steps={state.steps} />
                        </motion.div>
                      )}

                      {/* Source Flow - Connected Nodes */}
                      {state.sources.length > 0 && (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4"
                          initial={{ opacity: 0, y: 20 }}
                          transition={{ delay: 0.15 }}
                        >
                          <SourceFlow
                            isLoading={
                              isResearching && state.sources.length === 0
                            }
                            sources={state.sources.map((source, index) => ({
                              id: `source-${source.id || index}`,
                              type: "unknown" as const,
                              title: source.title,
                              url: source.url,
                              domain: source.domain,
                              trusted: source.trusted,
                            }))}
                          />
                        </motion.div>
                      )}

                      {/* Current Response */}
                      {(state.response || isStreaming) && (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          initial={{ opacity: 0, y: 20 }}
                          transition={{ delay: 0.2 }}
                        >
                          <ResearchResponse
                            content={state.response}
                            isStreaming={isStreaming}
                          />
                        </motion.div>
                      )}

                      {/* Request AI Analysis Button */}
                      {(state.status === "completed" ||
                        (state.status === "researching" && state.response)) &&
                        state.response &&
                        !state.response.includes("## ⚠️ AI Analysis") && (
                          <motion.div
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 flex justify-center"
                            initial={{ opacity: 0, y: 10 }}
                            transition={{ delay: 0.3 }}
                          >
                            <button
                              className="group flex items-center gap-2 px-4 py-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isResearching}
                              onClick={requestAIAnalysis}
                            >
                              {isResearching ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full"
                                    transition={{
                                      duration: 0.8,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                  />
                                  <span className="text-amber-700 dark:text-amber-400">
                                    Analyzing...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                                  <span className="text-amber-700 dark:text-amber-400">
                                    Request AI Analysis
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-300 rounded group-hover:bg-amber-200 dark:group-hover:bg-amber-800 transition-colors">
                                    Can make mistakes
                                  </span>
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                    </>
                  )}

                  {/* Follow-up Input */}
                  {state.status === "completed" && state.response && (
                    <FollowUpInput
                      isLoading={isResearching}
                      previousQuery={state.query}
                      onSubmit={askFollowUp}
                    />
                  )}

                  {/* Error */}
                  {state.error && (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mt-3 sm:mt-4"
                      initial={{ opacity: 0 }}
                    >
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {state.error}
                      </p>
                    </motion.div>
                  )}

                  {/* Disclaimer */}
                  {state.status === "completed" && (
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] text-neutral-400 pt-4 sm:pt-6 pb-2"
                      initial={{ opacity: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Consult a qualified scholar for personal rulings
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 py-2 sm:py-3 text-center border-t border-neutral-200/50 dark:border-neutral-800/50">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
              ithbat v0.2
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <a
              className="text-[10px] text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
              href="/logs"
            >
              Chats logged for analysis
            </a>
          </div>
        </div>
      </div>
    </ContextMenu>
  );
}
