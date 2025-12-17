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
  type LucideIcon,
} from "lucide-react";

import { PipelineStep } from "./PipelineStep";
import { PipelineConnector } from "./PipelineConnector";

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
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (steps.length === 0) {
    return null;
  }

  // Get connector status based on adjacent steps
  const getConnectorStatus = (
    index: number,
  ): "pending" | "active" | "completed" => {
    const currentStep = steps[index];
    const nextStep = steps[index + 1];

    if (currentStep.status === "completed" && nextStep) {
      if (
        nextStep.status === "completed" ||
        nextStep.status === "in_progress"
      ) {
        return "completed";
      }
    }
    if (currentStep.status === "in_progress") {
      return "active";
    }

    return "pending";
  };

  const activeStep = steps.find((s) => s.status === "in_progress");

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="w-full"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mobile: Vertical list view */}
      <div className="sm:hidden">
        <MobileStepsList
          expandedStep={expandedStep}
          setExpandedStep={setExpandedStep}
          steps={steps}
        />
      </div>

      {/* Desktop: Horizontal pipeline with larger elements */}
      <div className="hidden sm:block">
        <DesktopPipeline
          expandedStep={expandedStep}
          getConnectorStatus={getConnectorStatus}
          isCompact={isCompact}
          setExpandedStep={setExpandedStep}
          steps={steps}
        />
      </div>

      {/* Expanded step details (both mobile and desktop) */}
      {showDetails && (
        <AnimatePresence mode="wait">
          {expandedStep && (
            <motion.div
              key={expandedStep}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StepDetails
                step={steps.find((s) => s.id === expandedStep)!}
                onClose={() => setExpandedStep(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Active step content (auto-shown when step is in progress) */}
      {showDetails && activeStep && !expandedStep && activeStep.content && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-3"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <StepDetails isLive step={activeStep} />
        </motion.div>
      )}
    </motion.div>
  );
}

// Mobile vertical list view
function MobileStepsList({
  steps,
  expandedStep,
  setExpandedStep,
}: {
  steps: ResearchStep[];
  expandedStep: string | null;
  setExpandedStep: (id: string | null) => void;
}) {
  return (
    <div className="py-3 px-3">
      <div className="space-y-2">
        {steps.map((step, index) => (
          <MobileStepRow
            key={step.id}
            index={index}
            isExpanded={expandedStep === step.id}
            isLast={index === steps.length - 1}
            step={step}
            onToggle={() =>
              setExpandedStep(expandedStep === step.id ? null : step.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

// Mobile step row component
function MobileStepRow({
  step,
  index,
  isLast,
  isExpanded,
  onToggle,
}: {
  step: ResearchStep;
  index: number;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isError = step.status === "error";
  const isPending = step.status === "pending";

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
    <motion.button
      animate={{ opacity: 1, x: 0 }}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        isActive
          ? "bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-200 dark:ring-accent-800"
          : isCompleted
            ? "bg-white dark:bg-neutral-800/50"
            : isError
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-neutral-50 dark:bg-neutral-800/30"
      }`}
      initial={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
    >
      {/* Step icon with status indicator */}
      <div
        className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
          isCompleted
            ? "bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400"
            : isActive
              ? "bg-accent-100 dark:bg-accent-900/30 text-accent-500"
              : isError
                ? "bg-red-100 dark:bg-red-900/40 text-red-500"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
        }`}
      >
        {/* Spinning ring for active */}
        {isActive && (
          <motion.div
            animate={{ rotate: 360 }}
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, var(--accent-500) 90deg, transparent 180deg)`,
              maskImage: "radial-gradient(transparent 55%, black 56%)",
              WebkitMaskImage: "radial-gradient(transparent 55%, black 56%)",
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Icon */}
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="check"
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              initial={{ scale: 0 }}
            >
              <Check size={24} strokeWidth={2.5} />
            </motion.div>
          ) : isActive ? (
            <motion.div
              key="loading"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 size={24} strokeWidth={2} />
            </motion.div>
          ) : isError ? (
            <X size={24} strokeWidth={2} />
          ) : (
            <Icon size={24} strokeWidth={1.5} />
          )}
        </AnimatePresence>
      </div>

      {/* Step info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium text-sm ${
              isActive || isCompleted
                ? "text-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {step.title}
          </span>
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              className="text-[10px] font-medium text-accent-600 dark:text-accent-400 bg-accent-100 dark:bg-accent-900/40 px-1.5 py-0.5 rounded"
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Active
            </motion.span>
          )}
        </div>
        {(isActive || isCompleted) && step.startTime && (
          <span
            className={`text-xs font-mono ${
              isActive
                ? "text-accent-500"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {formatTime(elapsedTime)}
          </span>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {isCompleted && (
          <div className="w-2 h-2 rounded-full bg-accent-500" />
        )}
        {isPending && (
          <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        )}
      </div>
    </motion.button>
  );
}

// Desktop horizontal pipeline
function DesktopPipeline({
  steps,
  isCompact,
  getConnectorStatus,
  expandedStep,
  setExpandedStep,
}: {
  steps: ResearchStep[];
  isCompact: boolean;
  getConnectorStatus: (index: number) => "pending" | "active" | "completed";
  expandedStep: string | null;
  setExpandedStep: (id: string | null) => void;
}) {
  return (
    <div className={`py-4 px-4 ${isCompact ? "" : ""}`}>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex flex-col min-w-full">
          {/* Steps row - circles and connectors aligned */}
          <div className="flex items-center justify-center px-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <PipelineStep
                  index={index}
                  isCompact={isCompact}
                  step={step}
                  onExpand={() =>
                    setExpandedStep(expandedStep === step.id ? null : step.id)
                  }
                />

                {/* Connector (except for last step) */}
                {index < steps.length - 1 && (
                  <PipelineConnector
                    index={index}
                    status={getConnectorStatus(index)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Labels row - below the circles */}
          {!isCompact && (
            <div className="flex items-start justify-center mt-3 px-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <DesktopStepLabel index={index} step={step} />
                  {/* Spacer matching connector width exactly */}
                  {index < steps.length - 1 && (
                    <div className="w-16 mx-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Desktop step label component
function DesktopStepLabel({ step, index }: { step: ResearchStep; index: number }) {
  const [elapsedTime, setElapsedTime] = useState(0);

  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";

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
      animate={{ opacity: 1 }}
      className="text-center w-14 flex-shrink-0"
      initial={{ opacity: 0 }}
      transition={{ delay: index * 0.1 + 0.2 }}
    >
      <span
        className={`text-[11px] font-medium block leading-tight ${
          isCompleted || isActive
            ? "text-neutral-700 dark:text-neutral-200"
            : "text-neutral-400 dark:text-neutral-500"
        }`}
      >
        {step.title}
      </span>

      {/* Time badge */}
      {(isActive || isCompleted) && step.startTime && (
        <span
          className={`text-[11px] font-mono block mt-0.5 ${
            isActive
              ? "text-accent-500"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {formatTime(elapsedTime)}
        </span>
      )}
    </motion.div>
  );
}

// Step details panel
interface StepDetailsProps {
  step: ResearchStep;
  isLive?: boolean;
  onClose?: () => void;
}

function StepDetails({ step, isLive = false, onClose }: StepDetailsProps) {
  const isUnderstanding = step.type === "understanding";
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current && isLive) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [step.content, isLive]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          {isLive && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              className="w-2 h-2 rounded-full bg-accent-500"
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {step.title}
          </span>
        </div>
        {onClose && (
          <button
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Content - auto-scrolling when live */}
      <div
        ref={contentRef}
        className="p-4 max-h-64 overflow-y-auto scroll-smooth"
      >
        {isUnderstanding ? (
          // Prose rendering for understanding step
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 max-w-none text-sm text-neutral-700 dark:text-neutral-300">
            <ReactMarkdown>{step.content}</ReactMarkdown>
          </div>
        ) : (
          // Tree-style rendering for other steps
          <div className="font-mono text-xs space-y-1">
            {step.content
              .split("\n")
              .filter(Boolean)
              .map((line, index) => (
                <motion.div
                  key={index}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <span className="text-neutral-400 dark:text-neutral-600 select-none flex-shrink-0">
                    {index ===
                    step.content.split("\n").filter(Boolean).length - 1
                      ? "└─"
                      : "├─"}
                  </span>
                  <span className={getLineColor(line)}>
                    {renderLineWithLinks(line)}
                  </span>
                </motion.div>
              ))}

            {/* Working indicator */}
            {isLive && (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                className="flex items-center gap-2"
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <span className="text-neutral-400 dark:text-neutral-600 select-none">
                  └─
                </span>
                <span className="text-accent-500">working...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
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
