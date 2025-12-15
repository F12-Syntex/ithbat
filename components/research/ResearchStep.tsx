"use client";

import { useState } from "react";
import type { ResearchStep as ResearchStepType } from "@/types/research";
import { motion, AnimatePresence } from "framer-motion";

interface ResearchStepProps {
  step: ResearchStepType;
  defaultExpanded?: boolean;
}

export function ResearchStep({ step, defaultExpanded = true }: ResearchStepProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";

  const getStatusIndicator = () => {
    if (isActive) {
      return (
        <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
      );
    }
    if (isCompleted) {
      return <span className="text-success">done</span>;
    }
    if (step.status === "error") {
      return <span className="text-danger">error</span>;
    }
    return <span className="text-default-400">pending</span>;
  };

  return (
    <div className="font-mono text-sm">
      {/* Step Header - Clickable */}
      <button
        className="w-full flex items-center gap-2 text-left hover:bg-default-100 dark:hover:bg-default-50/10 px-3 py-2 rounded transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-default-400 select-none">
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className={isActive ? "text-primary" : "text-foreground"}>
          {step.title}
        </span>
        <span className="ml-auto text-xs">{getStatusIndicator()}</span>
      </button>

      {/* Step Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isExpanded && step.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-7 pr-3 pb-3">
              <div className="border-l-2 border-default-200 dark:border-default-700 pl-4 py-2">
                <p className="text-default-600 dark:text-default-400 whitespace-pre-wrap leading-relaxed">
                  {step.content}
                  {isActive && (
                    <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
