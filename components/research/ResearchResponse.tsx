"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { extractReferences, type ParsedReference } from "@/lib/references";

interface ResearchResponseProps {
  content: string;
  isStreaming?: boolean;
}

export function ResearchResponse({
  content,
  isStreaming,
}: ResearchResponseProps) {
  const [showReferences, setShowReferences] = useState(false);

  // Extract and convert references to clickable links
  const { processedContent, references } = useMemo(() => {
    if (!content) return { processedContent: "", references: [] };

    const result = extractReferences(content);

    return {
      processedContent: result.processedText,
      references: result.references,
    };
  }, [content]);

  // Group references by type
  const groupedReferences = useMemo(() => {
    const quran: ParsedReference[] = [];
    const hadith: ParsedReference[] = [];

    references.forEach((ref) => {
      if (ref.type === "quran") quran.push(ref);
      else if (ref.type === "hadith") hadith.push(ref);
    });

    return { quran, hadith };
  }, [references]);

  if (!content) return null;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
      initial={{ opacity: 0, y: 10 }}
    >
      {/* Response Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Response
        </h2>
        {isStreaming && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 animate-pulse">
            generating...
          </span>
        )}
      </div>

      {/* Response Content */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 shadow-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-neutral-800 dark:prose-headings:text-neutral-100 prose-headings:font-medium prose-headings:mt-4 prose-headings:mb-2 prose-p:text-neutral-600 dark:prose-p:text-neutral-300 prose-p:my-2 prose-strong:text-neutral-700 dark:prose-strong:text-neutral-200 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-ul:text-neutral-600 dark:prose-ul:text-neutral-300 prose-ol:text-neutral-600 dark:prose-ol:text-neutral-300 prose-li:my-1 prose-blockquote:border-emerald-500 prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400 prose-blockquote:not-italic prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:font-normal">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a
                  className="inline text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-medium"
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {children}
                </a>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mt-6 mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mt-4 mb-2">
                  {children}
                </h3>
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-emerald-500 ml-0.5 animate-pulse" />
          )}
        </div>
      </div>

      {/* Extracted References Summary */}
      {references.length > 0 && !isStreaming && (
        <div className="mt-4">
          <button
            className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            onClick={() => setShowReferences(!showReferences)}
          >
            <span
              className={`transition-transform ${showReferences ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <span>
              {references.length} reference{references.length !== 1 ? "s" : ""}{" "}
              found
            </span>
          </button>

          {showReferences && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="mt-3 space-y-3 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
            >
              {/* Quran References */}
              {groupedReferences.quran.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[10px]">
                      Q
                    </span>
                    Quran
                  </h4>
                  <div className="space-y-1">
                    {groupedReferences.quran.map((ref, i) => (
                      <a
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                        href={ref.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span className="text-sm text-neutral-700 dark:text-neutral-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {ref.details.surah}:{ref.details.ayah}
                          {ref.details.ayahEnd && `-${ref.details.ayahEnd}`}
                        </span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                          quran.com
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hadith References */}
              {groupedReferences.hadith.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 text-[10px]">
                      H
                    </span>
                    Hadith
                  </h4>
                  <div className="space-y-1">
                    {groupedReferences.hadith.map((ref, i) => (
                      <a
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                        href={ref.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span className="text-sm text-neutral-700 dark:text-neutral-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {ref.details.collection}
                          {ref.details.book && ` ${ref.details.book}`}:
                          {ref.details.hadith}
                        </span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                          sunnah.com
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
