"use client";

import type { ResearchStep as ResearchStepType } from "@/types/research";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ResearchStepProps {
  step: ResearchStepType;
  defaultExpanded?: boolean;
  index?: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Icon based on step type
function StepIcon({ type, isActive }: { type: string; isActive: boolean }) {
  const baseClass = `w-4 h-4 ${isActive ? "text-emerald-500" : "text-neutral-400 dark:text-neutral-500"}`;

  if (type.includes("understand")) {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (type.includes("search")) {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }
  if (type.includes("explor")) {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    );
  }
  if (type.includes("synthes") || type.includes("prepar")) {
    return (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  // Default icon
  return (
    <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function ResearchStep({
  step,
  defaultExpanded = false,
  index = 0,
}: ResearchStepProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [elapsedTime, setElapsedTime] = useState(0);
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isPending = step.status === "pending";

  // Update elapsed time every second when step is active
  useEffect(() => {
    if (isActive && step.startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - step.startTime!);
      }, 1000);
      setElapsedTime(Date.now() - step.startTime);
      return () => clearInterval(interval);
    } else if (isCompleted && step.startTime && step.endTime) {
      setElapsedTime(step.endTime - step.startTime);
    }
  }, [isActive, isCompleted, step.startTime, step.endTime]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      {/* Step Header */}
      <button
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 ${
          isActive
            ? "bg-emerald-50/50 dark:bg-emerald-900/10"
            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status indicator */}
        <div className="relative flex-shrink-0">
          {isActive ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : isCompleted ? (
            <motion.div
              animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
              initial={{ scale: 0.8 }}
            >
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <StepIcon isActive={false} type={step.type} />
            </div>
          )}
        </div>

        {/* Title and time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium truncate ${
                isActive
                  ? "text-emerald-700 dark:text-emerald-300"
                  : isCompleted
                    ? "text-neutral-700 dark:text-neutral-200"
                    : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {step.title}
            </span>
          </div>
          {step.startTime && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                {formatDuration(elapsedTime)}
              </span>
              {isActive && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  in progress
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        {step.content && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="flex-shrink-0"
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-4 h-4 text-neutral-400 dark:text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </button>

      {/* Step Content */}
      <AnimatePresence initial={false}>
        {isExpanded && step.content && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 pt-1">
              <div className="ml-11 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
                {step.type === "understanding" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:my-1.5 prose-p:leading-relaxed">
                    <ReactMarkdown>{step.content}</ReactMarkdown>
                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5"
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </div>
                ) : (
                  <pre className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed font-mono max-h-48 overflow-y-auto scrollbar-thin">
                    {step.content}
                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        className="inline-block w-0.5 h-3 bg-emerald-500 ml-0.5"
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
