"use client";

import type { ResearchStep } from "@/types/research";

import { useState, useEffect, useRef } from "react";
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
  exploring: Globe,
  synthesizing: FileText,
};

export function ResearchPipeline({
  steps,
  isCompact = false,
  showDetails = true,
}: ResearchPipelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  if (steps.length === 0) {
    return null;
  }

  const activeStep = steps.find((s) => s.status === "in_progress");
  const completedSteps = steps.filter((s) => s.status === "completed");

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="w-full"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mobile: Simple active step display */}
      <div className="sm:hidden">
        <MobileProgressView
          activeStep={activeStep}
          completedCount={completedSteps.length}
          pendingCount={0}
          steps={steps}
          totalSteps={steps.length}
        />
      </div>

      {/* Desktop: Vertical expandable list */}
      <div className="hidden sm:block">
        <DesktopVerticalPipeline
          expandedSteps={expandedSteps}
          showDetails={showDetails}
          steps={steps}
          toggleStep={toggleStep}
        />
      </div>
    </motion.div>
  );
}

// Mobile: Clean single-line progress view
function MobileProgressView({
  steps,
  activeStep,
  completedCount,
  pendingCount,
  totalSteps,
}: {
  steps: ResearchStep[];
  activeStep: ResearchStep | undefined;
  completedCount: number;
  pendingCount: number;
  totalSteps: number;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (activeStep?.startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - activeStep.startTime!);
      }, 1000);
      setElapsedTime(Date.now() - activeStep.startTime);
      return () => clearInterval(interval);
    }
  }, [activeStep]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const Icon = activeStep ? (stepIcons[activeStep.type] || Lightbulb) : Check;
  const isAllComplete = completedCount === totalSteps;

  return (
    <div className="py-3 px-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              step.status === "completed"
                ? "bg-accent-500"
                : step.status === "in_progress"
                  ? "bg-accent-300 dark:bg-accent-700"
                  : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          />
        ))}
      </div>

      {/* Current status */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isAllComplete
              ? "bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400"
              : "bg-accent-50 dark:bg-accent-900/20 text-accent-500"
          }`}
        >
          {activeStep && (
            <motion.div
              animate={{ rotate: 360 }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, var(--accent-500) 90deg, transparent 180deg)`,
                maskImage: "radial-gradient(transparent 60%, black 61%)",
                WebkitMaskImage: "radial-gradient(transparent 60%, black 61%)",
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
          {isAllComplete ? (
            <Check size={20} strokeWidth={2.5} />
          ) : activeStep ? (
            <Icon size={20} strokeWidth={1.5} />
          ) : (
            <Loader2 size={20} strokeWidth={2} className="animate-spin" />
          )}
        </div>

        {/* Status text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {isAllComplete ? "Research complete" : activeStep?.title || "Starting..."}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isAllComplete
              ? `${completedCount} steps completed`
              : `Step ${completedCount + 1} of ${totalSteps}`}
            {activeStep && !isAllComplete && (
              <span className="ml-2 font-mono text-accent-500">
                {formatTime(elapsedTime)}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Desktop vertical pipeline with expandable rows
function DesktopVerticalPipeline({
  steps,
  expandedSteps,
  toggleStep,
  showDetails,
}: {
  steps: ResearchStep[];
  expandedSteps: Set<string>;
  toggleStep: (stepId: string) => void;
  showDetails: boolean;
}) {
  return (
    <div className="py-3 px-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
        {steps.map((step, index) => (
          <VerticalStepRow
            key={step.id}
            index={index}
            isExpanded={expandedSteps.has(step.id)}
            showDetails={showDetails}
            step={step}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual step row with expandable content
function VerticalStepRow({
  step,
  index,
  isExpanded,
  onToggle,
  showDetails,
}: {
  step: ResearchStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  showDetails: boolean;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isError = step.status === "error";
  const isPending = step.status === "pending";
  const hasContent = step.content && step.content.length > 0;
  const isUnderstanding = step.type === "understanding";

  const Icon = stepIcons[step.type] || Lightbulb;

  // Auto-expand active steps
  const shouldShowContent = showDetails && (isExpanded || isActive) && hasContent;

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

  // Auto-scroll when content updates
  useEffect(() => {
    if (contentRef.current && isActive) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [step.content, isActive]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Header row */}
      <button
        className={`w-full flex items-center gap-4 px-4 py-3 transition-colors text-left ${
          hasContent ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50" : "cursor-default"
        }`}
        disabled={!hasContent}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasContent) {
            onToggle();
          }
        }}
      >
        {/* Status icon - always shows type icon with status indicators */}
        <div
          className={`relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isCompleted
              ? "bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400"
              : isActive
                ? "bg-accent-50 dark:bg-accent-900/20 text-accent-500"
                : isError
                  ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {/* Spinning ring for active */}
          {isActive && (
            <motion.div
              animate={{ rotate: 360 }}
              className="absolute inset-0 rounded-xl"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, var(--accent-500) 90deg, transparent 180deg)`,
                maskImage: "radial-gradient(transparent 55%, black 56%)",
                WebkitMaskImage: "radial-gradient(transparent 55%, black 56%)",
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Always show type icon */}
          {isError ? (
            <X size={20} strokeWidth={2} />
          ) : (
            <Icon size={20} strokeWidth={1.5} />
          )}

          {/* Checkmark badge for completed */}
          {isCompleted && (
            <motion.div
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center shadow-sm"
              initial={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <Check className="text-white" size={12} strokeWidth={3} />
            </motion.div>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 text-left min-w-0">
          <span
            className={`text-base font-medium ${
              isCompleted || isActive
                ? "text-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {step.title}
          </span>
        </div>

        {/* Time / Status badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {(isActive || isCompleted) && step.startTime && (
            <span
              className={`text-sm font-mono tabular-nums ${
                isActive
                  ? "text-accent-500"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {formatTime(elapsedTime)}
            </span>
          )}
          {isPending && (
            <span className="text-sm text-neutral-400 dark:text-neutral-500">
              Pending
            </span>
          )}
          {isError && (
            <span className="text-sm text-red-500">
              Error
            </span>
          )}

          {/* Expand chevron */}
          {hasContent && (
            <motion.div
              animate={{ rotate: shouldShowContent ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown
                className="w-5 h-5 text-neutral-400 dark:text-neutral-500"
                strokeWidth={1.5}
              />
            </motion.div>
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {shouldShowContent && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={contentRef}
              className="px-4 pb-4 pt-0 pl-18 max-h-48 overflow-y-auto scroll-smooth"
              style={{ paddingLeft: "4.5rem" }}
            >
              {isUnderstanding ? (
                <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 max-w-none text-sm text-neutral-600 dark:text-neutral-300">
                  <ReactMarkdown>{step.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="font-mono text-xs space-y-0.5 text-neutral-600 dark:text-neutral-400">
                  {step.content
                    .split("\n")
                    .filter(Boolean)
                    .map((line, lineIndex) => (
                      <div key={lineIndex} className="flex items-start gap-2">
                        <span className="text-neutral-300 dark:text-neutral-600 select-none">
                          {lineIndex === step.content.split("\n").filter(Boolean).length - 1 && !isActive
                            ? "└─"
                            : "├─"}
                        </span>
                        <span className={getLineColor(line)}>
                          {renderLineWithLinks(line)}
                        </span>
                      </div>
                    ))}
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      className="flex items-center gap-2"
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <span className="text-neutral-300 dark:text-neutral-600 select-none">
                        └─
                      </span>
                      <span className="text-accent-500">working...</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper to determine line color
function getLineColor(line: string): string {
  if (line.startsWith("✓") || line.toLowerCase().includes("found")) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (
    line.startsWith("✗") ||
    line.toLowerCase().includes("error") ||
    line.toLowerCase().includes("failed")
  ) {
    return "text-red-500 dark:text-red-400";
  }
  if (
    line.startsWith("→") ||
    line.toLowerCase().includes("searching") ||
    line.toLowerCase().includes("exploring")
  ) {
    return "text-blue-600 dark:text-blue-400";
  }
  if (line.match(/^https?:\/\//)) {
    return "text-accent-600 dark:text-accent-400";
  }

  return "text-neutral-600 dark:text-neutral-400";
}

// Helper to render line with clickable URLs
function renderLineWithLinks(text: string): React.ReactNode {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  if (parts.length === 1) {
    return text;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlPattern)) {
          return (
            <a
              key={i}
              className="text-accent-600 dark:text-accent-400 hover:underline break-all"
              href={part}
              rel="noopener noreferrer"
              target="_blank"
            >
              {part}
            </a>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
