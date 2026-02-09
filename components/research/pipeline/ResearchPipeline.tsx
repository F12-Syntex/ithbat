"use client";

import type { ResearchStep } from "@/types/research";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

export function ResearchPipeline({
  steps,
}: ResearchPipelineProps) {
  if (steps.length === 0) {
    return null;
  }

  const activeStep = steps.find((s) => s.status === "in_progress");
  const completedSteps = steps.filter((s) => s.status === "completed");

  return (
    <div className="w-full">
      {/* Mobile: Simple active step display */}
      <div className="sm:hidden">
        <MobileProgressView
          activeStep={activeStep}
          completedCount={completedSteps.length}
          steps={steps}
          totalSteps={steps.length}
        />
      </div>

      {/* Desktop: Full-width rounded rows */}
      <div className="hidden sm:block">
        <DesktopStepRows steps={steps} />
      </div>
    </div>
  );
}

// Mobile: Clean single-line progress view
function MobileProgressView({
  steps,
  activeStep,
  completedCount,
  totalSteps,
}: {
  steps: ResearchStep[];
  activeStep: ResearchStep | undefined;
  completedCount: number;
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

  const Icon = activeStep ? stepIcons[activeStep.type] || Lightbulb : Check;
  const isAllComplete = completedCount === totalSteps;

  return (
    <div className="py-3 px-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-3">
        {steps.map((step) => (
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
            <Loader2 className="animate-spin" size={20} strokeWidth={2} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {isAllComplete
              ? "Research complete"
              : activeStep?.title || "Starting..."}
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

// Desktop: Full-width rounded step rows
function DesktopStepRows({ steps }: { steps: ResearchStep[] }) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <StepRow key={step.id} index={index} step={step} />
      ))}
    </div>
  );
}

// Individual full-width step row
function StepRow({ step, index }: { step: ResearchStep; index: number }) {
  const [elapsedTime, setElapsedTime] = useState(0);

  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isError = step.status === "error";

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

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-full w-full transition-colors
        ${
          isCompleted
            ? "bg-accent-50 dark:bg-accent-900/15 border border-accent-200/60 dark:border-accent-800/40"
            : isActive
              ? "bg-accent-50/80 dark:bg-accent-900/20 border border-accent-300 dark:border-accent-700"
              : isError
                ? "bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800"
                : "bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50"
        }
      `}
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
    >
      {/* Icon */}
      <div
        className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isCompleted
            ? "bg-accent-100 dark:bg-accent-800/40 text-accent-600 dark:text-accent-400"
            : isActive
              ? "bg-accent-100/80 dark:bg-accent-800/30 text-accent-500"
              : isError
                ? "bg-red-100 dark:bg-red-800/30 text-red-500"
                : "bg-neutral-100 dark:bg-neutral-700/50 text-neutral-400 dark:text-neutral-500"
        }`}
      >
        {isError ? (
          <X size={16} strokeWidth={2} />
        ) : isCompleted ? (
          <Check size={16} strokeWidth={2.5} />
        ) : isActive ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <Icon size={16} strokeWidth={1.5} />
        )}
      </div>

      {/* Title */}
      <span
        className={`flex-1 text-sm font-medium ${
          isCompleted || isActive
            ? "text-neutral-800 dark:text-neutral-100"
            : "text-neutral-400 dark:text-neutral-500"
        }`}
      >
        {step.title}
      </span>

      {/* Time badge */}
      {(isActive || isCompleted) && step.startTime && (
        <span
          className={`text-xs font-mono tabular-nums flex-shrink-0 ${
            isActive
              ? "text-accent-500"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {formatTime(elapsedTime)}
        </span>
      )}

      {/* Active pulse indicator */}
      {isActive && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0"
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
