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
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden">
        {/* Minimal Header */}
        <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Response
          </span>
          {isStreaming && (
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                className="w-1 h-1 bg-emerald-500 rounded-full"
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-[10px] text-emerald-500">Writing</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <article
            className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-medium prose-headings:tracking-tight
            prose-h2:text-sm prose-h2:text-neutral-700 dark:prose-h2:text-neutral-200 prose-h2:mt-4 prose-h2:mb-2 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-neutral-100 dark:prose-h2:border-neutral-800
            prose-h3:text-xs prose-h3:text-neutral-600 dark:prose-h3:text-neutral-300 prose-h3:mt-3 prose-h3:mb-1.5
            prose-p:text-xs prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:leading-relaxed prose-p:my-2
            prose-strong:text-neutral-700 dark:prose-strong:text-neutral-200 prose-strong:font-medium
            prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:font-normal prose-a:no-underline hover:prose-a:underline
            prose-ul:text-xs prose-ul:text-neutral-600 dark:prose-ul:text-neutral-400 prose-ul:my-1.5
            prose-ol:text-xs prose-ol:text-neutral-600 dark:prose-ol:text-neutral-400 prose-ol:my-1.5
            prose-li:my-0.5 prose-li:leading-relaxed
            prose-blockquote:border-l-2 prose-blockquote:border-emerald-400 prose-blockquote:bg-emerald-50/30 dark:prose-blockquote:bg-emerald-900/10 prose-blockquote:py-1.5 prose-blockquote:px-3 prose-blockquote:rounded-r prose-blockquote:not-italic prose-blockquote:text-xs prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400
            prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:bg-emerald-50/50 dark:prose-code:bg-emerald-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none"
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                ),
                h2: ({ children }) => (
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 mt-4 mb-2 pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                    {String(children).toLowerCase().includes("answer") && (
                      <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400"
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
                className="inline-block w-px h-4 bg-emerald-500 ml-0.5 align-middle"
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            )}
          </article>
        </div>
      </div>
    </motion.div>
  );
}
