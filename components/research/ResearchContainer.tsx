"use client";

import { motion, AnimatePresence } from "framer-motion";

import { SearchInput } from "./SearchInput";
import { ResearchStep } from "./ResearchStep";
import { ResearchResponse } from "./ResearchResponse";

import { useResearch } from "@/hooks/useResearch";

export function ResearchContainer() {
  const { state, startResearch, reset } = useResearch();

  const isResearching = state.status === "researching";
  const hasResults = state.steps.length > 0;
  const isStreaming = isResearching && state.response.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900" />

      {/* Header - Compact */}
      <header className="flex-shrink-0 pt-6 pb-4 px-4">
        <motion.div
          animate={{ opacity: 1 }}
          className="text-center"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light tracking-tight bg-gradient-to-r from-neutral-800 to-neutral-600 dark:from-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
            ithbat
          </h1>
          <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
            Islamic Knowledge Research
          </p>
        </motion.div>
      </header>

      {/* Search - Fixed position */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="max-w-xl mx-auto">
          <SearchInput isLoading={isResearching} onSearch={startResearch} />
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-hidden px-4">
        <div className="h-full max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {hasResults ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Query Bar */}
                <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 mb-3 bg-neutral-100/80 dark:bg-neutral-800/50 rounded-lg">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate pr-2">
                    {state.query}
                  </span>
                  {state.status === "completed" && (
                    <button
                      className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      onClick={reset}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Scrollable Results */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                  {/* Research Steps - Collapsed */}
                  <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/50">
                      <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Progress
                      </span>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/30">
                      {state.steps.map((step, index) => (
                        <ResearchStep
                          key={step.id}
                          defaultExpanded={false}
                          index={index}
                          step={step}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Response */}
                  {(state.response || isStreaming) && (
                    <ResearchResponse
                      content={state.response}
                      isStreaming={isStreaming}
                    />
                  )}

                  {/* Error */}
                  {state.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/50 dark:border-red-800/50">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {state.error}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {state.status === "completed" && (
                    <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 py-2">
                      Consult a qualified scholar for personal rulings
                    </p>
                  )}
                </div>
              </motion.div>
            ) : !isResearching ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <p className="text-neutral-400 dark:text-neutral-500 text-sm mb-6 text-center">
                  Search hadith, Quran, and scholarly rulings
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "What breaks the fast?",
                    "Rules of Zakat",
                    "Prayer while traveling",
                  ].map((example) => (
                    <button
                      key={example}
                      className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                      onClick={() => startResearch(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
