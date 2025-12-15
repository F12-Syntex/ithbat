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
  // Extract and convert references to clickable links
  const { processedContent } = useMemo(() => {
    if (!content) return { processedContent: "" };

    const result = extractReferences(content);
    return { processedContent: result.processedText };
  }, [content]);

  if (!content) return null;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
      initial={{ opacity: 0, y: 10 }}
    >
      {/* Response Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/50 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Research Findings
            </h2>
            {isStreaming && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                Generating response...
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <article className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold
            prose-h2:text-base prose-h2:text-neutral-800 dark:prose-h2:text-neutral-100 prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-neutral-200 dark:prose-h2:border-neutral-700
            prose-h3:text-sm prose-h3:text-neutral-700 dark:prose-h3:text-neutral-200 prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-neutral-600 dark:prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:my-2.5
            prose-strong:text-neutral-700 dark:prose-strong:text-neutral-200 prose-strong:font-semibold
            prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
            prose-ul:text-neutral-600 dark:prose-ul:text-neutral-300 prose-ul:my-2
            prose-ol:text-neutral-600 dark:prose-ol:text-neutral-300 prose-ol:my-2
            prose-li:my-1 prose-li:leading-relaxed
            prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-50/50 dark:prose-blockquote:bg-emerald-900/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400
            prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:bg-emerald-50 dark:prose-code:bg-emerald-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:font-medium"
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a
                    className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-medium"
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {children}
                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ),
                h2: ({ children }) => (
                  <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-800 dark:text-neutral-100 mt-6 mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                    {String(children).toLowerCase().includes('answer') && (
                      <span className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {String(children).toLowerCase().includes('evidence') && (
                      <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </span>
                    )}
                    {String(children).toLowerCase().includes('source') && (
                      <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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
                className="inline-block w-0.5 h-5 bg-emerald-500 ml-0.5 align-middle"
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </article>
        </div>
      </div>
    </motion.div>
  );
}
