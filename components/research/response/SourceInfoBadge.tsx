"use client";

import { useState, useEffect, useRef } from "react";

interface SourceInfoBadgeProps {
  href: string;
  title: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "source";
  }
}

function getSourceColor(domain: string): string {
  if (domain.includes("quran")) return "text-sky-600 dark:text-sky-400";
  if (domain.includes("sunnah") || domain.includes("hadith"))
    return "text-amber-600 dark:text-amber-400";
  if (domain.includes("islamqa"))
    return "text-emerald-600 dark:text-emerald-400";
  if (domain.includes("seekersguidance"))
    return "text-purple-600 dark:text-purple-400";
  if (domain.includes("islamweb"))
    return "text-teal-600 dark:text-teal-400";
  return "text-neutral-500 dark:text-neutral-400";
}

function getSourceDescription(domain: string): string {
  if (domain.includes("sunnah"))
    return "Database of authenticated prophetic traditions with full chains of narration and grading.";
  if (domain.includes("islamqa"))
    return "Fatwa and Q&A portal with scholarly rulings from major Islamic scholars.";
  if (domain.includes("seekersguidance"))
    return "Islamic learning platform with answers reviewed by qualified scholars.";
  if (domain.includes("islamweb"))
    return "Comprehensive Islamic encyclopedia with fatwas, articles, and encyclopedic entries.";
  return "External reference cited in the research.";
}

function getSourceLabel(domain: string): string {
  if (domain.includes("quran")) return "Quran";
  if (domain.includes("sunnah") || domain.includes("hadith")) return "Hadith";
  if (domain.includes("islamqa")) return "Fatwa";
  if (domain.includes("seekersguidance")) return "Scholarly";
  if (domain.includes("islamweb")) return "Islamic";
  return "Source";
}

// Extract Quran surah:ayah from URL or title
function getQuranRef(
  href: string,
  title: string,
): { surah: number; ayah: number } | null {
  const urlMatch = href.match(/quran\.com\/(\d{1,3})\/(\d{1,3})/);
  if (urlMatch)
    return { surah: parseInt(urlMatch[1]), ayah: parseInt(urlMatch[2]) };

  const titleMatch = title.match(/Quran\s+(\d{1,3}):(\d{1,3})/i);
  if (titleMatch)
    return { surah: parseInt(titleMatch[1]), ayah: parseInt(titleMatch[2]) };

  return null;
}

// Verse cache
const verseCache = new Map<string, string>();

export function SourceInfoBadge({ href, title }: SourceInfoBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const badgeRef = useRef<HTMLSpanElement>(null);

  const domain = getDomain(href);
  const color = getSourceColor(domain);
  const quranRef = getQuranRef(href, title);

  // Fetch English translation on hover for Quran refs
  useEffect(() => {
    if (!showTooltip || !quranRef) return;

    const key = `${quranRef.surah}:${quranRef.ayah}`;
    if (verseCache.has(key)) {
      setVerseText(verseCache.get(key)!);
      return;
    }

    setLoading(true);
    fetch(
      `https://api.quran.com/api/v4/verses/by_key/${quranRef.surah}:${quranRef.ayah}?language=en&translations=20`,
      { signal: AbortSignal.timeout(5000) },
    )
      .then((res) => res.json())
      .then((json) => {
        const translation = json.verse?.translations?.[0]?.text;
        if (translation) {
          // Strip HTML tags (footnote sups etc)
          const clean = translation.replace(/<[^>]*>/g, "");
          verseCache.set(key, clean);
          setVerseText(clean);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showTooltip, quranRef?.surah, quranRef?.ayah]);

  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPosition(rect.top < 80 ? "bottom" : "top");
    }
  }, [showTooltip]);

  return (
    <span ref={badgeRef} className="relative inline-flex align-baseline">
      <a
        className={`inline-flex items-center gap-1 text-xs font-medium no-underline hover:opacity-70 transition-opacity ${color}`}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <img
          alt=""
          className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="truncate max-w-[120px]">{title}</span>
      </a>

      {/* Tooltip — desktop only, fixed width, consistent neutral color */}
      {showTooltip && (
        <span
          className={`hidden sm:block absolute z-50 pointer-events-none w-64 ${
            position === "top"
              ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
              : "top-full left-1/2 -translate-x-1/2 mt-1.5"
          }`}
        >
          <span className="block px-3 py-2.5 rounded-3xl shadow-lg border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
            {/* Title */}
            <span className="block text-[11px] font-semibold leading-tight">{title}</span>
            {/* Domain + type */}
            <span className="flex items-center gap-1 mt-0.5 leading-none">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{domain}</span>
              <span className="text-[10px] text-neutral-300 dark:text-neutral-600">&middot;</span>
              <span className={`text-[10px] font-medium ${color}`}>{getSourceLabel(domain)}</span>
            </span>
            {/* Quran verse translation */}
            {quranRef && (
              <span className="block mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-700">
                <span className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">
                  Sahih International Translation
                </span>
                {loading ? (
                  <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 italic">
                    Loading translation...
                  </span>
                ) : verseText ? (
                  <span className="block text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-200 italic">
                    &ldquo;{verseText}&rdquo;
                  </span>
                ) : null}
              </span>
            )}
            {/* Non-Quran: show a description for known domains */}
            {!quranRef && (
              <span className="block mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-700">
                <span className="block text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {getSourceDescription(domain)}
                </span>
              </span>
            )}
          </span>
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 ${
              position === "top" ? "top-full -mt-px" : "bottom-full -mb-px"
            }`}
          >
            <span
              className={`block border-4 border-transparent ${
                position === "top"
                  ? "border-t-white dark:border-t-neutral-800"
                  : "border-b-white dark:border-b-neutral-800"
              }`}
            />
          </span>
        </span>
      )}
    </span>
  );
}
