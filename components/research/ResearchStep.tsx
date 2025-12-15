"use client";

import type { ResearchStep as ResearchStepType } from "@/types/research";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ResearchStepProps {
  step: ResearchStepType;
  defaultExpanded?: boolean;
}

export function ResearchStep({
  step,
  defaultExpanded = false,
}: ResearchStepProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";

  const getStatusIndicator = () => {
    if (isActive) {
      return (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-600 dark:text-emerald-400">
            running
          </span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="text-emerald-600 dark:text-emerald-400">done</span>
      );
    }
    if (step.status === "error") {
      return <span className="text-red-500 dark:text-red-400">error</span>;
    }

    return (
      <span className="text-neutral-400 dark:text-neutral-500">pending</span>
    );
  };

  return (
    <div className="font-mono text-sm">
      {/* Step Header - Clickable */}
      <button
        className="w-full flex items-center gap-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 px-3 py-2.5 rounded-md transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-neutral-400 dark:text-neutral-500 select-none text-xs">
          {isExpanded ? "▼" : "▶"}
        </span>
        <span
          className={`${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-200"}`}
        >
          {step.title}
        </span>
        <span className="ml-auto text-xs">{getStatusIndicator()}</span>
      </button>

      {/* Step Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isExpanded && step.content && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pl-7 pr-3 pb-3">
              <div className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 py-2">
                {step.type === "understanding" ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:my-1 prose-strong:text-neutral-700 dark:prose-strong:text-neutral-200 prose-ul:text-neutral-600 dark:prose-ul:text-neutral-400 prose-li:my-0.5">
                    <ReactMarkdown>{step.content}</ReactMarkdown>
                    {isActive && (
                      <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse" />
                    )}
                  </div>
                ) : (
                  <pre className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed text-xs font-mono overflow-x-auto">
                    {step.content}
                    {isActive && (
                      <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse" />
                    )}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
