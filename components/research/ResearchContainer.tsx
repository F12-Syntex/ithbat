"use client";

import { motion, AnimatePresence } from "framer-motion";

import { SearchInput } from "./SearchInput";
import { ResearchStep } from "./ResearchStep";

import { useResearch } from "@/hooks/useResearch";

export function ResearchContainer() {
  const { state, startResearch, reset } = useResearch();

  const isResearching = state.status === "researching";
  const hasResults = state.steps.length > 0;

  return (
    <div className="flex flex-col items-center w-full min-h-[80vh]">
      {/* Header */}
      <div className="text-center mb-12 mt-8">
        <h1 className="text-3xl font-light tracking-wide mb-2">ithbat</h1>
        <p className="text-default-500 text-sm font-mono">
          islamic knowledge research
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
            {/* Query */}
            <div className="flex items-center justify-between px-3 py-2 mb-4 bg-default-100 dark:bg-default-50/10 rounded font-mono text-sm">
              <span className="text-default-500">
                <span className="text-primary">$</span> {state.query}
              </span>
              {state.status === "completed" && (
                <button
                  className="text-xs text-default-400 hover:text-foreground transition-colors"
                  onClick={reset}
                >
                  clear
                </button>
              )}
            </div>

            {/* Steps */}
            <div className="border border-default-200 dark:border-default-700 rounded-lg overflow-hidden divide-y divide-default-200 dark:divide-default-700">
              {state.steps.map((step, index) => (
                <ResearchStep
                  key={step.id}
                  step={step}
                  defaultExpanded={index === state.steps.length - 1}
                />
              ))}
            </div>

            {/* Error */}
            {state.error && (
              <motion.div
                animate={{ opacity: 1 }}
                className="mt-4 px-4 py-3 bg-danger-50 dark:bg-danger-900/20 rounded border border-danger-200 dark:border-danger-800 font-mono text-sm"
                initial={{ opacity: 0 }}
              >
                <span className="text-danger">error:</span>{" "}
                <span className="text-danger-600 dark:text-danger-400">
                  {state.error}
                </span>
              </motion.div>
            )}

            {/* Disclaimer */}
            {state.status === "completed" && (
              <motion.p
                animate={{ opacity: 1 }}
                className="mt-6 text-center text-xs text-default-400"
                initial={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                For personal religious rulings, consult a qualified scholar.
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasResults && !isResearching && (
        <div className="mt-12 text-center text-default-400 text-sm font-mono">
          <p>ask about islamic rulings, hadith, or quranic verses</p>
        </div>
      )}
    </div>
  );
}
