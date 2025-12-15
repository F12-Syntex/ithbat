"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { SearchInput } from "./SearchInput";
import { ResearchStep } from "./ResearchStep";
import { ResearchResponse } from "./ResearchResponse";
import { FollowUpInput } from "./FollowUpInput";

import { ContextMenu } from "@/components/ContextMenu";
import { SettingsPanel } from "@/components/SettingsPanel";
import { IntroModal } from "@/components/IntroModal";
import { useResearch } from "@/hooks/useResearch";
import { useTheme } from "@/context/ThemeContext";

export function ResearchContainer() {
  const { state, startResearch, askFollowUp, reset } = useResearch();
  const { theme, setTheme, themes } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: reset,
    },
    {
      label: "Paste & Search",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: handlePasteAndSearch,
    },
    { divider: true as const },
    {
      label: "Copy",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: () => {
        const selection = window.getSelection()?.toString();

        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      },
    },
    {
      label: "Paste",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0v4m0 4v4m-4-4h4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
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
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: () => {
        if (state.response) {
          navigator.clipboard.writeText(state.response);
        }
      },
      disabled: !state.response,
    },
    {
      label: "Copy Query",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
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
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          {theme.mode === "dark" ? (
            <path
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      ),
      onClick: toggleDarkMode,
    },
    {
      label: "Settings",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: () => setSettingsOpen(true),
    },
    { divider: true as const },
    {
      label: "Reload Page",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
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
          <svg
            className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
                  <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-800 dark:text-neutral-100">
                    ithbat
                  </h1>
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
                  onSearch={startResearch}
                />
              </div>
              {/* Mobile settings button - matches search input (px-4 py-3 with h-8 content) */}
              <button
                aria-label="Settings"
                className="sm:hidden flex-shrink-0 px-4 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
                onClick={() => setSettingsOpen(true)}
              >
                <svg
                  className="w-8 h-8 text-neutral-500 dark:text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
                  {[
                    "What breaks the fast?",
                    "Rules of Zakat",
                    "Prayer while traveling",
                  ].map((example, i) => (
                    <motion.button
                      key={example}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400 transition-all active:scale-95 sm:hover:scale-105"
                      initial={{ opacity: 0, y: 10 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => startResearch(example)}
                    >
                      {example}
                    </motion.button>
                  ))}
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
                  {/* Clear button at top */}
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-end mb-3 sm:mb-4"
                    initial={{ opacity: 0 }}
                  >
                    {state.status === "completed" && (
                      <button
                        className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                        onClick={reset}
                      >
                        New conversation
                      </button>
                    )}
                  </motion.div>

                  {/* Completed Sessions (Previous Q&A in thread) */}
                  {state.completedSessions?.map((session, sessionIndex) => (
                    <div key={sessionIndex} className="mb-6">
                      {/* Previous Query */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {sessionIndex + 1}
                          </span>
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                          {session.query}
                        </span>
                      </div>

                      {/* Previous Progress (collapsed by default) */}
                      <div className="bg-white dark:bg-neutral-900 rounded-lg sm:rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3 opacity-75">
                        <details className="group">
                          <summary className="px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-between">
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              Progress ({session.steps.length} steps)
                            </span>
                            <svg
                              className="w-3 h-3 text-neutral-400 transition-transform group-open:rotate-180"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M19 9l-7 7-7-7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
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

                      {/* Current Research Progress */}
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-neutral-900 rounded-lg sm:rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3 sm:mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Progress
                          </span>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {state.steps.map((step, index) => (
                            <ResearchStep
                              key={step.id}
                              defaultExpanded={false}
                              index={index}
                              step={step}
                            />
                          ))}
                        </div>
                      </motion.div>

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
              ithbat v0.1
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <a
              href="/logs"
              className="text-[10px] text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
            >
              Chats logged for analysis
            </a>
          </div>
        </div>
      </div>
    </ContextMenu>
  );
}
