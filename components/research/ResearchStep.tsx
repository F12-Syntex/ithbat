"use client";

import type { ResearchStep as ResearchStepType } from "@/types/research";

import { useState, useEffect, useRef } from "react";
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

export function ResearchStep({
  step,
  defaultExpanded = false,
  index = 0,
}: ResearchStepProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [elapsedTime, setElapsedTime] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

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
            ? "bg-accent-50/50 dark:bg-accent-900/10"
            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        }`}
        onClick={handleToggle}
      >
        {/* Status indicator */}
        <div className="relative flex-shrink-0">
          {isActive ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center"
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full"
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : isCompleted ? (
            <motion.div
              animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center"
              initial={{ scale: 0.8 }}
            >
              <svg
                className="w-4 h-4 text-accent-600 dark:text-accent-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>
          )}
        </div>

        {/* Title and time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium truncate ${
                isActive
                  ? "text-accent-700 dark:text-accent-300"
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
                <span className="text-xs text-accent-600 dark:text-accent-400">
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
              <path
                d="M19 9l-7 7-7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </button>

      {/* Step Content - Visual Tree */}
      <AnimatePresence initial={false}>
        {isExpanded && step.content && (
          <motion.div
            ref={contentRef}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onAnimationComplete={() => {
              // Scroll into view after animation completes
              contentRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
          >
            <div className="px-4 pb-4">
              <div className="ml-11 max-h-56 overflow-y-auto no-scrollbar">
                <StepTree
                  content={step.content}
                  isActive={isActive}
                  stepType={step.type}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Parse content into structured items
interface SearchResult {
  url: string;
  title: string;
  source: string;
}

interface ParsedContent {
  searchResults: SearchResult[];
  otherLines: {
    text: string;
    type: "action" | "success" | "info" | "error" | "header";
  }[];
  headerText: string | null;
}

function getSourceFromUrl(url: string): string {
  if (url.includes("sunnah.com")) return "Sunnah.com";
  if (url.includes("islamqa.info")) return "IslamQA";
  if (url.includes("quran.com")) return "Quran.com";
  if (url.includes("daruliftaa.com")) return "Darul Iftaa";
  if (url.includes("askimam.org")) return "Ask Imam";
  if (url.includes("islamweb.net")) return "IslamWeb";
  if (url.includes("abuaminaelias.com")) return "Abu Amina Elias";
  try {
    const hostname = new URL(url).hostname.replace("www.", "");

    return (
      hostname.split(".")[0].charAt(0).toUpperCase() +
      hostname.split(".")[0].slice(1)
    );
  } catch {
    return "Source";
  }
}

function getSourceColor(source: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    "Sunnah.com": {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
    },
    IslamQA: {
      bg: "bg-accent-50 dark:bg-accent-900/20",
      text: "text-accent-700 dark:text-accent-400",
      border: "border-accent-200 dark:border-accent-800",
    },
    "Quran.com": {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      text: "text-sky-700 dark:text-sky-400",
      border: "border-sky-200 dark:border-sky-800",
    },
    "Darul Iftaa": {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-700 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
    "Ask Imam": {
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-800",
    },
  };

  return (
    colors[source] || {
      bg: "bg-neutral-50 dark:bg-neutral-800/50",
      text: "text-neutral-600 dark:text-neutral-400",
      border: "border-neutral-200 dark:border-neutral-700",
    }
  );
}

function parseContent(content: string): ParsedContent {
  const lines = content.split("\n").filter((line) => line.trim());
  const searchResults: SearchResult[] = [];
  const otherLines: ParsedContent["otherLines"] = [];
  let headerText: string | null = null;

  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for header/searching line
    if (line.toLowerCase().startsWith("searching for")) {
      headerText = line;
      i++;
      continue;
    }

    // URL detection - group with following title
    if (line.match(/^https?:\/\//)) {
      const url = line;
      const source = getSourceFromUrl(url);
      let title = source;

      // Check if next line is a title (not a URL)
      if (i + 1 < lines.length && !lines[i + 1].trim().match(/^https?:\/\//)) {
        title = lines[i + 1].trim();
        i++; // Skip the title line
      }

      searchResults.push({ url, title, source });
      i++;
      continue;
    }

    // Success items
    if (line.startsWith("✓") || line.toLowerCase().startsWith("found:")) {
      const text = line.replace(/^[✓✔]\s*/, "").replace(/^found:\s*/i, "");

      otherLines.push({ text, type: "success" });
      i++;
      continue;
    }

    // Error items
    if (line.startsWith("✗") || line.toLowerCase().startsWith("failed:")) {
      const text = line.replace(/^[✗✘]\s*/, "").replace(/^failed:\s*/i, "");

      otherLines.push({ text, type: "error" });
      i++;
      continue;
    }

    // Action items
    if (
      line.startsWith("→") ||
      line.startsWith("Searching") ||
      line.startsWith("Exploring")
    ) {
      const text = line.replace(/^[→]\s*/, "");

      otherLines.push({ text, type: "action" });
      i++;
      continue;
    }

    // Headers
    if (line.match(/^[🔍🌐⚠━─]+/) || line.startsWith("━━━")) {
      const text = line.replace(/^━+\s*/, "").replace(/\s*━+$/, "");

      if (text) otherLines.push({ text, type: "header" });
      i++;
      continue;
    }

    // Default info
    otherLines.push({ text: line, type: "info" });
    i++;
  }

  return { searchResults, otherLines, headerText };
}

function StepTree({
  content,
  isActive,
  stepType,
}: {
  content: string;
  isActive: boolean;
  stepType: string;
}) {
  const { searchResults, otherLines, headerText } = parseContent(content);

  // For understanding step, show as readable prose with markdown
  if (stepType === "understanding") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-neutral-800 dark:prose-strong:text-neutral-200 max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            className="inline-block w-0.5 h-4 bg-accent-500"
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="font-mono text-xs">
      {/* Header text */}
      {headerText && (
        <div className="text-neutral-500 dark:text-neutral-400 mb-2">
          {headerText}
        </div>
      )}

      {/* Search Results as indented tree */}
      {searchResults.length > 0 && (
        <div className="space-y-0.5">
          {searchResults.map((result, index) => {
            const colors = getSourceColor(result.source);
            const isLast = index === searchResults.length - 1;

            return (
              <motion.div
                key={index}
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ delay: index * 0.03, duration: 0.15 }}
              >
                {/* Source line with tree connector */}
                <div className="flex items-center">
                  <span className="text-neutral-400 dark:text-neutral-600 select-none">
                    {isLast ? "└─" : "├─"}
                  </span>
                  <span className={`ml-1 ${colors.text} font-medium`}>
                    {result.source}
                  </span>
                </div>

                {/* Title indented under source */}
                <div className="flex items-start">
                  <span className="text-neutral-400 dark:text-neutral-600 select-none">
                    {isLast ? "   " : "│  "}└─
                  </span>
                  <a
                    className="ml-1 text-neutral-600 dark:text-neutral-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors truncate"
                    href={result.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={result.title}
                  >
                    {result.title}
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Other lines with indentation */}
      {otherLines.length > 0 && (
        <div
          className={`space-y-0.5 ${searchResults.length > 0 ? "mt-2" : ""}`}
        >
          {otherLines.map((line, index) => {
            const isLast = index === otherLines.length - 1;

            return (
              <motion.div
                key={index}
                animate={{ opacity: 1 }}
                className="flex items-start"
                initial={{ opacity: 0 }}
                transition={{ delay: index * 0.02, duration: 0.15 }}
              >
                <span className="text-neutral-400 dark:text-neutral-600 select-none">
                  {isLast ? "└─" : "├─"}
                </span>
                <span
                  className={`ml-1 ${
                    line.type === "success"
                      ? "text-accent-600 dark:text-accent-400"
                      : line.type === "error"
                        ? "text-red-500 dark:text-red-400"
                        : line.type === "action"
                          ? "text-blue-600 dark:text-blue-400"
                          : line.type === "header"
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {line.text}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          className="flex items-center mt-2"
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span className="text-neutral-400 dark:text-neutral-600 select-none">
            └─
          </span>
          <span className="ml-1 text-accent-600 dark:text-accent-400">
            working...
          </span>
        </motion.div>
      )}
    </div>
  );
}
