import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { motion, AnimatePresence } from "framer-motion";

import { SearchInput } from "./SearchInput";
import { ResearchStep } from "./ResearchStep";

import { useResearch } from "@/hooks/useResearch";

export function ResearchContainer() {
  const { state, startResearch, reset } = useResearch();

  const isResearching = state.status === "researching";
  const hasResults = state.steps.length > 0;

  return (
    <div className="flex flex-col items-center w-full gap-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Ithbat</h1>
        <p className="text-default-500 text-lg max-w-lg">
          Search for authentic Islamic knowledge backed by Quran, Hadith, and
          scholarly sources
        </p>
      </div>

      {/* Search Input */}
      <SearchInput isLoading={isResearching} onSearch={startResearch} />

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {hasResults && (
          <motion.div
            animate={{ opacity: 1 }}
            className="w-full max-w-3xl space-y-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            {/* Query Display */}
            <div className="flex items-center justify-between">
              <p className="text-default-600">
                <span className="font-medium">Question:</span> {state.query}
              </p>
              {state.status === "completed" && (
                <Button size="sm" variant="flat" onPress={reset}>
                  New Search
                </Button>
              )}
            </div>

            <Divider />

            {/* Research Steps */}
            <div className="space-y-4">
              {state.steps.map((step) => (
                <ResearchStep key={step.id} step={step} />
              ))}
            </div>

            {/* Error Display */}
            {state.error && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800"
                initial={{ opacity: 0, y: 10 }}
              >
                <p className="text-danger font-medium">Error</p>
                <p className="text-danger-600 dark:text-danger-400 text-sm">
                  {state.error}
                </p>
              </motion.div>
            )}

            {/* Disclaimer */}
            {state.status === "completed" && (
              <motion.div
                animate={{ opacity: 1 }}
                className="mt-6 p-4 bg-default-100 dark:bg-default-50/10 rounded-lg"
                initial={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-default-500 text-sm text-center">
                  This information is for educational purposes only. For
                  personal religious rulings, please consult a qualified local
                  scholar.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasResults && !isResearching && (
        <div className="text-center text-default-400 mt-8">
          <p>Ask any question about Islamic rulings, practices, or beliefs</p>
          <p className="text-sm mt-2">
            All answers are backed by authentic sources
          </p>
        </div>
      )}
    </div>
  );
}
