"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { extractReferences } from "@/lib/references";

interface ResearchResponseProps {
  content: string;
  isStreaming?: boolean;
}

export function ResearchResponse({
  content,
  isStreaming,
}: ResearchResponseProps) {
  const { processedContent } = useMemo(() => {
    if (!content) return { processedContent: "" };
    const result = extractReferences(content);

    return { processedContent: result.processedText };
  }, [content]);

  if (!content) return null;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-1.5 mb-3">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            className="w-1.5 h-1.5 bg-accent-500 rounded-full"
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] text-accent-500 font-medium">Writing response...</span>
        </div>
      )}

      {/* Content */}
      <article
        className="prose prose-base dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h2:text-base sm:prose-h2:text-lg prose-h2:text-neutral-800 dark:prose-h2:text-neutral-100 prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-neutral-200 dark:prose-h2:border-neutral-800
          prose-h3:text-sm sm:prose-h3:text-base prose-h3:text-neutral-700 dark:prose-h3:text-neutral-200 prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-sm sm:prose-p:text-base prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:my-3
          prose-strong:text-neutral-800 dark:prose-strong:text-neutral-100 prose-strong:font-semibold
          prose-a:text-accent-600 dark:prose-a:text-accent-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
          prose-ul:text-sm sm:prose-ul:text-base prose-ul:text-neutral-700 dark:prose-ul:text-neutral-300 prose-ul:my-3
          prose-ol:text-sm sm:prose-ol:text-base prose-ol:text-neutral-700 dark:prose-ol:text-neutral-300 prose-ol:my-3
          prose-li:my-1 prose-li:leading-relaxed
          prose-blockquote:border-l-3 prose-blockquote:border-accent-500 prose-blockquote:bg-accent-50/50 dark:prose-blockquote:bg-accent-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-sm sm:prose-blockquote:text-base prose-blockquote:text-neutral-700 dark:prose-blockquote:text-neutral-300
          prose-code:text-accent-600 dark:prose-code:text-accent-400 prose-code:bg-accent-50 dark:prose-code:bg-accent-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
      >
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                className="text-accent-600 dark:text-accent-400 hover:underline font-medium"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {children}
              </a>
            ),
            h2: ({ children }) => (
              <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mt-6 mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                {String(children).toLowerCase().includes("answer") && (
                  <span className="w-4 h-4 rounded bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-accent-600 dark:text-accent-400"
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
                  </span>
                )}
                {String(children).toLowerCase().includes("evidence") && (
                  <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {String(children).toLowerCase().includes("source") && (
                  <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {children}
              </h2>
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            className="inline-block w-px h-4 bg-accent-500 ml-0.5 align-middle"
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </article>
    </motion.div>
  );
}
