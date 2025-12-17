"use client";

import type { ResearchStep } from "@/types/research";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ResearchLogProps {
  steps: ResearchStep[];
  maxHeight?: string;
}

export function ResearchLog({
  steps,
  maxHeight = "max-h-48",
}: ResearchLogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Find the active step or the last completed step with content
  const activeStep = steps.find((s) => s.status === "in_progress");
  const displayStep = activeStep || [...steps].reverse().find((s) => s.content);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current && activeStep) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayStep?.content, activeStep]);

  if (!displayStep?.content) {
    return null;
  }

  const isLive = activeStep?.id === displayStep.id;
  const isUnderstanding = displayStep.type === "understanding";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2">
          {isLive && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              className="w-2 h-2 rounded-full bg-accent-500"
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <StepIcon type={displayStep.type} />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {displayStep.title}
          </span>
        </div>
        {isLive && (
          <span className="text-[10px] text-accent-500 uppercase tracking-wider font-medium">
            Live
          </span>
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className={`${maxHeight} overflow-y-auto scroll-smooth`}
      >
        <AnimatePresence mode="wait">
          {isUnderstanding ? (
            <motion.div
              key="understanding"
              animate={{ opacity: 1 }}
              className="p-4"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 max-w-none text-sm text-neutral-700 dark:text-neutral-300">
                <ReactMarkdown>{displayStep.content}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="log"
              animate={{ opacity: 1 }}
              className="p-4"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <div className="space-y-1">
                {displayStep.content
                  .split("\n")
                  .filter(Boolean)
                  .map((line, index, arr) => (
                    <LogLine
                      key={index}
                      index={index}
                      isLast={index === arr.length - 1}
                      line={line}
                    />
                  ))}

                {/* Working indicator */}
                {isLive && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    className="flex items-center gap-2 pl-4 pt-1"
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <span className="text-accent-500 text-xs">
                      Processing...
                    </span>
                    <motion.div
                      animate={{ width: ["0%", "100%", "0%"] }}
                      className="h-0.5 bg-accent-500/30 rounded-full"
                      style={{ maxWidth: 60 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Log line component with better formatting
function LogLine({
  line,
  index,
  isLast,
}: {
  line: string;
  index: number;
  isLast: boolean;
}) {
  const { icon, color, text } = parseLogLine(line);

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 text-xs"
      initial={{ opacity: 0, x: -5 }}
      transition={{ delay: index * 0.02 }}
    >
      <span className={`flex-shrink-0 mt-0.5 ${color}`}>{icon}</span>
      <span className={`${color} break-words`}>
        {renderTextWithLinks(text)}
      </span>
    </motion.div>
  );
}

// Parse log line to extract icon and color
function parseLogLine(line: string): {
  icon: React.ReactNode;
  color: string;
  text: string;
} {
  // Success indicators
  if (line.startsWith("✓") || line.toLowerCase().includes("found")) {
    return {
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            fillRule="evenodd"
          />
        </svg>
      ),
      color: "text-emerald-600 dark:text-emerald-400",
      text: line.replace(/^✓\s*/, ""),
    };
  }

  // Error indicators
  if (
    line.startsWith("✗") ||
    line.toLowerCase().includes("error") ||
    line.toLowerCase().includes("failed")
  ) {
    return {
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            fillRule="evenodd"
          />
        </svg>
      ),
      color: "text-red-500 dark:text-red-400",
      text: line.replace(/^✗\s*/, ""),
    };
  }

  // Action indicators
  if (
    line.startsWith("→") ||
    line.toLowerCase().includes("searching") ||
    line.toLowerCase().includes("exploring") ||
    line.toLowerCase().includes("analyzing")
  ) {
    return {
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            fillRule="evenodd"
          />
        </svg>
      ),
      color: "text-blue-600 dark:text-blue-400",
      text: line.replace(/^→\s*/, ""),
    };
  }

  // URL indicators
  if (line.match(/^https?:\/\//)) {
    return {
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
            fillRule="evenodd"
          />
        </svg>
      ),
      color: "text-accent-600 dark:text-accent-400",
      text: line,
    };
  }

  // Default
  return {
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="3" />
      </svg>
    ),
    color: "text-neutral-500 dark:text-neutral-400",
    text: line,
  };
}

// Render text with clickable URLs
function renderTextWithLinks(text: string): React.ReactNode {
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

// Step icon based on type
function StepIcon({ type }: { type: string }) {
  const iconClass = "w-4 h-4 text-neutral-500 dark:text-neutral-400";

  switch (type) {
    case "understanding":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "searching":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "exploring":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "synthesizing":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
