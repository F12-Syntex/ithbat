"use client";

import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { SourceInfoBadge } from "./response/SourceInfoBadge";
import { SourceCitationCard } from "./response/SourceCitationCard";
import { EvidenceParagraph } from "./response/VerifyEvidence";

import { extractReferences } from "@/lib/references";

interface ResearchResponseProps {
  content: string;
  isStreaming?: boolean;
  apiSources?: Array<{ id: number; title: string; url: string; domain: string }>;
}

// Helper to extract text from React children
function extractTextContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }

  if (typeof children === "object" && "props" in children) {
    return extractTextContent(
      (children as { props?: { children?: ReactNode } }).props?.children,
    );
  }

  return String(children);
}

// Helper to extract source info from URL
function extractSourceInfo(url: string): {
  domain: string;
  reference?: string;
} {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace("www.", "");

    if (domain.includes("quran.com")) {
      const pathMatch = urlObj.pathname.match(/\/(\d+)\/(\d+)/);

      if (pathMatch) {
        return { domain, reference: `${pathMatch[1]}:${pathMatch[2]}` };
      }
    }

    if (domain.includes("sunnah.com")) {
      const pathMatch = urlObj.pathname.match(/\/([^/:]+):?(\d+)?/);

      if (pathMatch) {
        return {
          domain,
          reference: pathMatch[2]
            ? `${pathMatch[1]} ${pathMatch[2]}`
            : pathMatch[1],
        };
      }
    }

    return { domain };
  } catch {
    return { domain: "source" };
  }
}

// Parse sources from content for the citation card
function parseSourcesFromContent(
  text: string,
): Array<{ number: number; title: string; url: string; domain: string }> {
  const sources: Array<{
    number: number;
    title: string;
    url: string;
    domain: string;
  }> = [];

  // Find Sources section
  const sourcesMatch = text.match(/##\s*Sources[\s\S]*$/i);

  if (!sourcesMatch) return sources;

  const sourcesSection = sourcesMatch[0];

  const patterns = [
    /\[(\d+)\]\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    /\[(\d+)\]\s*([^-\[\]\n]+?)\s*-\s*(https?:\/\/[^\s\n)]+)/g,
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(sourcesSection)) !== null) {
      const num = parseInt(match[1], 10);

      if (!sources.find((s) => s.number === num)) {
        const url = match[3].replace(/[)\].,;]+$/, "");
        const { domain } = extractSourceInfo(url);

        sources.push({
          number: num,
          title: match[2].trim() || "Source",
          url,
          domain,
        });
      }
    }
  }

  return sources.sort((a, b) => a.number - b.number);
}

// Inline tooltip for Islamic terminology
function TermTooltip({ meaning, children }: { meaning: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If too close to top of viewport, show tooltip below
      setPosition(rect.top < 60 ? "bottom" : "top");
    }
  }, [show]);

  return (
    <span
      ref={ref}
      className="relative inline-flex items-baseline gap-0.5 cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow((s) => !s)}
    >
      <span className="border-b border-dotted border-neutral-400 dark:border-neutral-500">
        {children}
      </span>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 leading-none flex-shrink-0 translate-y-[-1px]">
        i
      </span>
      {show && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 rounded-full bg-neutral-800 dark:bg-neutral-200 text-[11px] sm:text-xs font-medium text-white dark:text-neutral-900 whitespace-nowrap shadow-lg pointer-events-none ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {meaning}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800 dark:bg-neutral-200 rotate-45 ${
              position === "top" ? "top-full -mt-1" : "bottom-full -mb-1"
            }`}
          />
        </span>
      )}
    </span>
  );
}

export function ResearchResponse({
  content,
  isStreaming,
  apiSources,
}: ResearchResponseProps) {
  const { processedContent, sources } = useMemo(() => {
    if (!content) return { processedContent: "", sources: [] };

    // Strip wrapping "" from blockquote lines
    let cleaned = content.replace(/^>\s*"(.+)"$/gm, "> $1");
    // Also strip leading/trailing smart quotes
    cleaned = cleaned.replace(/^>\s*\u201c(.+)\u201d$/gm, "> $1");

    const result = extractReferences(cleaned);
    const parsedSources = parseSourcesFromContent(cleaned);

    // Merge API sources if markdown parsing didn't find a Sources section
    if (parsedSources.length === 0 && apiSources && apiSources.length > 0) {
      const merged = apiSources.map((s, i) => ({
        number: i + 1,
        title: s.title,
        url: s.url,
        domain: s.domain,
      }));
      return { processedContent: result.processedText, sources: merged };
    }

    return { processedContent: result.processedText, sources: parsedSources };
  }, [content, apiSources]);

  if (!content) return null;

  return (
    <div>
      {/* Content */}
      <article
        className="prose prose-base dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h2:text-[15px] sm:prose-h2:text-lg prose-h2:text-neutral-800 dark:prose-h2:text-neutral-100 prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2.5 prose-h2:border-b prose-h2:border-neutral-200 dark:prose-h2:border-neutral-800
          prose-h3:text-sm sm:prose-h3:text-base prose-h3:text-neutral-700 dark:prose-h3:text-neutral-200 prose-h3:mt-5 prose-h3:mb-2
          prose-p:text-[14px] sm:prose-p:text-base prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:my-3
          prose-strong:text-neutral-800 dark:prose-strong:text-neutral-100 prose-strong:font-semibold
          prose-a:text-accent-600 dark:prose-a:text-accent-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
          prose-ul:text-[14px] sm:prose-ul:text-base prose-ul:text-neutral-700 dark:prose-ul:text-neutral-300 prose-ul:my-3
          prose-ol:text-[14px] sm:prose-ol:text-base prose-ol:text-neutral-700 dark:prose-ol:text-neutral-300 prose-ol:my-3
          prose-li:my-1.5 prose-li:leading-relaxed
          prose-blockquote:border-l-0 prose-blockquote:bg-transparent prose-blockquote:p-0 prose-blockquote:not-italic prose-blockquote:my-0
          prose-code:text-accent-600 dark:prose-code:text-accent-400 prose-code:bg-accent-50 dark:prose-code:bg-accent-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
      >
        <ReactMarkdown
          components={{
            // Render links as SourceInfoBadge for source URLs
            a: ({ href, children }) => {
              const linkText =
                typeof children === "string" ? children : extractTextContent(children);
              const finalHref = href || "#";

              // Use SourceInfoBadge for http links
              if (finalHref.startsWith("http")) {
                return (
                  <SourceInfoBadge
                    href={finalHref}
                    title={linkText || "Source"}
                  />
                );
              }

              // Fallback for non-http links
              return (
                <a
                  className="text-accent-600 dark:text-accent-400 hover:underline font-medium"
                  href={finalHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {children}
                </a>
              );
            },
            // Render <u> tags as highlighted important text
            u: ({ children }) => (
              <mark className="bg-amber-100/80 dark:bg-amber-900/30 text-inherit px-0.5 rounded-sm decoration-0 font-medium">
                {children}
              </mark>
            ),
            // Render <term> tags as hoverable Islamic terminology tooltips
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({ term: ({ node, children }: { node?: { properties?: Record<string, unknown> }; children?: ReactNode }) => {
              const meaning = (node?.properties?.dataMeaning as string) || "";
              if (!meaning) return <>{children}</>;
              return <TermTooltip meaning={meaning}>{children}</TermTooltip>;
            }} as any),
            h2: ({ children }) => (
              <h2 className="flex items-center gap-2 text-[15px] sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mt-8 mb-3 pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
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
            blockquote: ({ children }) => {
              // Separate attribution line (starts with "—") from quote content
              const childArray = Array.isArray(children) ? children : [children];
              const quoteChildren: ReactNode[] = [];
              const attrChildren: ReactNode[] = [];

              for (const child of childArray) {
                const text = extractTextContent(child);
                if (text.trim().startsWith("—") || text.trim().startsWith("—")) {
                  attrChildren.push(child);
                } else {
                  quoteChildren.push(child);
                }
              }

              return (
                <blockquote className="relative my-5 ml-0 pl-4 sm:pl-5 pr-4 py-4 border-l-[3px] border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/30 rounded-r-2xl not-italic [&_.quran-arabic]:block [&_.quran-arabic]:text-right [&_.quran-arabic]:text-lg [&_.quran-arabic]:leading-loose [&_.quran-arabic]:text-neutral-800 [&_.quran-arabic]:dark:text-neutral-100 [&_.quran-arabic]:mb-2 [&_.quran-arabic]:font-normal">
                  <div className="text-[14px] sm:text-[15px] text-neutral-700 dark:text-neutral-200 leading-relaxed italic">
                    {quoteChildren}
                  </div>
                  {attrChildren.length > 0 && (
                    <div className="flex justify-end mt-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/40 not-italic">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 [&_a]:!text-xs [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1 [&_img]:w-3.5 [&_img]:h-3.5">
                        {attrChildren}
                      </span>
                    </div>
                  )}
                </blockquote>
              );
            },
            // Paragraph renderer — detects attribution lines and renders them compact
            p: ({ children }) => {
              const textContent = extractTextContent(children);

              // Attribution lines (— Source | link) — render as compact right-aligned source
              if (textContent.trim().startsWith("—") || textContent.trim().startsWith("—")) {
                return (
                  <div className="flex justify-end -mt-2 mb-4">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 [&_a]:!text-xs [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1 [&_img]:w-3.5 [&_img]:h-3.5">
                      {children}
                    </span>
                  </div>
                );
              }

              return (
                <EvidenceParagraph evidenceText={textContent}>
                  {children}
                </EvidenceParagraph>
              );
            },
          }}
          rehypePlugins={[rehypeRaw]}
        >
          {processedContent}
        </ReactMarkdown>
      </article>

      {/* Sources Citation Card - shown at the bottom when not streaming */}
      {!isStreaming && sources.length > 0 && (
        <SourceCitationCard sources={sources} />
      )}
    </div>
  );
}
