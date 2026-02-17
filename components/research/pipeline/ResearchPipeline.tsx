"use client";

import type { ResearchStep } from "@/types/research";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Lightbulb,
  Search,
  Globe,
  FileText,
  Check,
  X,
  Loader2,
  FlaskConical,
  Sparkles,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

interface ResearchPipelineProps {
  steps: ResearchStep[];
  isCompact?: boolean;
  showDetails?: boolean;
}

const stepIcons: Record<string, LucideIcon> = {
  understanding: Lightbulb,
  searching: Search,
  extracting: FlaskConical,
  exploring: Globe,
  synthesizing: FileText,
  formatting: Sparkles,
};

export function ResearchPipeline({ steps }: ResearchPipelineProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      {steps.map((step, index) => (
        <StepRow key={step.id} index={index} step={step} />
      ))}
    </div>
  );
}

// Unified step row — responsive, clickable for details
function StepRow({ step, index }: { step: ResearchStep; index: number }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isError = step.status === "error";
  // Only show expandable content if there's meaningful text (not just "Searching the web...")
  const trimmedContent = step.content?.trim() || "";
  const hasContent =
    trimmedContent.length > 0 &&
    !trimmedContent.startsWith("Searching the web") &&
    !trimmedContent.match(/^Found \d+ source links?\s*$/);

  const Icon = stepIcons[step.type] || Lightbulb;

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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);

    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const canExpand = hasContent && (isCompleted || isError);

  return (
    <div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={`
          flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full w-full transition-colors
          ${canExpand ? "cursor-pointer" : ""}
          ${
            isError
              ? "bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800"
              : "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none"
          }
          ${canExpand && !expanded ? "hover:border-neutral-300 dark:hover:border-neutral-700" : ""}
        `}
        initial={{ opacity: 0, y: 8 }}
        transition={{ delay: index * 0.06, duration: 0.25 }}
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        {/* Icon */}
        <div
          className={`relative flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
            isError
              ? "bg-red-100 dark:bg-red-800/30 text-red-500"
              : isCompleted
                ? "bg-neutral-100 dark:bg-neutral-800 text-accent-600 dark:text-accent-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {isError ? (
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
          ) : isCompleted ? (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
          ) : isActive ? (
            <Loader2
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-neutral-500 dark:text-neutral-400"
              strokeWidth={2}
            />
          ) : (
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
          )}
        </div>

        {/* Title */}
        <span
          className={`flex-1 text-xs sm:text-sm font-medium truncate ${
            isCompleted || isActive
              ? "text-neutral-800 dark:text-neutral-100"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {step.title}
        </span>

        {/* Time badge */}
        {(isActive || isCompleted) && step.startTime && (
          <span className="text-[11px] sm:text-xs font-mono tabular-nums flex-shrink-0 text-accent-500 dark:text-accent-400">
            {formatTime(elapsedTime)}
          </span>
        )}

        {/* Expand chevron for completed steps with content */}
        {canExpand && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDown
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0"
              strokeWidth={2}
            />
          </motion.div>
        )}

        {/* Active pulse indicator */}
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 flex-shrink-0"
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && hasContent && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mt-1.5 sm:mt-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none">
              <div className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed prose prose-xs dark:prose-invert max-w-none prose-p:my-1 prose-p:text-[11px] sm:prose-p:text-xs prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:leading-relaxed prose-headings:text-[11px] sm:prose-headings:text-xs prose-headings:font-semibold prose-headings:text-neutral-700 dark:prose-headings:text-neutral-300 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-neutral-700 dark:prose-strong:text-neutral-300">
                <ReactMarkdown>{trimmedContent}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
