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
    <div className="flex flex-col items-center w-full min-h-[80vh] px-4">
      {/* Header */}
      <div className="text-center mb-10 mt-8">
        <h1 className="text-4xl font-light tracking-wider mb-2 text-neutral-800 dark:text-neutral-100">
          ithbat
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          Islamic Knowledge Research
        </p>
      </div>

      {/* Search */}
      <SearchInput isLoading={isResearching} onSearch={startResearch} />

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasResults && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mt-8"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: 10 }}
          >
            {/* Query Header */}
            <div className="flex items-center justify-between px-3 py-2.5 mb-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg font-mono text-sm">
              <span className="text-neutral-600 dark:text-neutral-300">
                <span className="text-emerald-500 mr-2">$</span>
                {state.query}
              </span>
              {state.status === "completed" && (
                <button
                  className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  onClick={reset}
                >
                  clear
                </button>
              )}
            </div>

            {/* Research Steps - Collapsed by default */}
            <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-800">
              {state.steps.map((step) => (
                <ResearchStep
                  key={step.id}
                  defaultExpanded={false}
                  step={step}
                />
              ))}
            </div>

            {/* Response - Separate from steps */}
            {(state.response || isStreaming) && (
              <ResearchResponse
                content={state.response}
                isStreaming={isStreaming}
              />
            )}

            {/* Error */}
            {state.error && (
              <motion.div
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 font-mono text-sm"
                initial={{ opacity: 0 }}
              >
                <span className="text-red-600 dark:text-red-400 font-medium">
                  error:
                </span>{" "}
                <span className="text-red-600 dark:text-red-300">
                  {state.error}
                </span>
              </motion.div>
            )}

            {/* Disclaimer */}
            {state.status === "completed" && (
              <motion.p
                animate={{ opacity: 1 }}
                className="mt-8 text-center text-xs text-neutral-400 dark:text-neutral-500"
                initial={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                For personal religious rulings, please consult a qualified
                scholar.
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasResults && !isResearching && (
        <div className="mt-16 text-center">
          <p className="text-neutral-400 dark:text-neutral-500 text-sm">
            Ask about Islamic rulings, hadith, or Quranic verses
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Prayer times", "Zakat rules", "Fasting exemptions"].map(
              (example) => (
                <button
                  key={example}
                  className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => startResearch(example)}
                >
                  {example}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
