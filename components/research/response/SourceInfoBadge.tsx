"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

interface SourceInfoBadgeProps {
  href: string;
  title: string;
}

// Detect source type from domain for color coding
function getSourceStyle(domain: string): {
  color: string;
  bg: string;
  label: string;
  dot: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipArrow: string;
} {
  if (domain.includes("quran"))
    return {
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
      label: "Quran",
      dot: "bg-sky-400",
      tooltipBg: "bg-sky-50 dark:bg-sky-950",
      tooltipBorder: "border-sky-200 dark:border-sky-800",
      tooltipArrow: "border-t-sky-50 dark:border-t-sky-950",
    };
  if (domain.includes("sunnah") || domain.includes("hadith"))
    return {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
      label: "Hadith",
      dot: "bg-amber-400",
      tooltipBg: "bg-amber-50 dark:bg-amber-950",
      tooltipBorder: "border-amber-200 dark:border-amber-800",
      tooltipArrow: "border-t-amber-50 dark:border-t-amber-950",
    };
  if (domain.includes("islamqa"))
    return {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
      label: "Fatwa",
      dot: "bg-emerald-400",
      tooltipBg: "bg-emerald-50 dark:bg-emerald-950",
      tooltipBorder: "border-emerald-200 dark:border-emerald-800",
      tooltipArrow: "border-t-emerald-50 dark:border-t-emerald-950",
    };
  if (domain.includes("seekersguidance"))
    return {
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
      label: "Scholarly",
      dot: "bg-purple-400",
      tooltipBg: "bg-purple-50 dark:bg-purple-950",
      tooltipBorder: "border-purple-200 dark:border-purple-800",
      tooltipArrow: "border-t-purple-50 dark:border-t-purple-950",
    };
  if (domain.includes("islamweb"))
    return {
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
      label: "Islamic",
      dot: "bg-teal-400",
      tooltipBg: "bg-teal-50 dark:bg-teal-950",
      tooltipBorder: "border-teal-200 dark:border-teal-800",
      tooltipArrow: "border-t-teal-50 dark:border-t-teal-950",
    };
  return {
    color: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/40 dark:border-neutral-700/30",
    label: "Source",
    dot: "bg-neutral-400",
    tooltipBg: "bg-neutral-50 dark:bg-neutral-800",
    tooltipBorder: "border-neutral-200 dark:border-neutral-700",
    tooltipArrow: "border-t-neutral-50 dark:border-t-neutral-800",
  };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "source";
  }
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

// Verse cache to avoid refetching
const verseCache = new Map<string, string>();

export function SourceInfoBadge({ href, title }: SourceInfoBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const badgeRef = useRef<HTMLSpanElement>(null);

  const domain = getDomain(href);
  const style = getSourceStyle(domain);
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
      `https://api.alquran.cloud/v1/ayah/${quranRef.surah}:${quranRef.ayah}/en.sahih`,
      { signal: AbortSignal.timeout(5000) },
    )
      .then((res) => res.json())
      .then((json) => {
        const data = Array.isArray(json.data) ? json.data[0] : json.data;
        if (data?.text) {
          const text =
            data.text.length > 200
              ? data.text.substring(0, 200) + "..."
              : data.text;
          verseCache.set(key, text);
          setVerseText(text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showTooltip, quranRef?.surah, quranRef?.ayah]);

  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPosition(rect.top < 100 ? "bottom" : "top");
    }
  }, [showTooltip]);

  const hasQuranContent = quranRef && (loading || verseText);

  return (
    <span ref={badgeRef} className="relative inline-flex align-baseline">
      <a
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium no-underline transition-all hover:shadow-sm ${style.bg} ${style.color}`}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <img
          alt=""
          className="w-3 h-3 rounded-sm flex-shrink-0"
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="truncate max-w-[120px]">{title}</span>
        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50" strokeWidth={2} />
      </a>

      {/* Tooltip — theme colored, with Quran verse translation */}
      {showTooltip && (
        <span
          className={`absolute z-50 pointer-events-none ${
            position === "top"
              ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
              : "top-full left-1/2 -translate-x-1/2 mt-2"
          }`}
        >
          <span
            className={`block px-3 py-2 rounded-lg shadow-lg border ${style.tooltipBg} ${style.tooltipBorder} ${
              hasQuranContent ? "max-w-[280px] sm:max-w-xs" : "whitespace-nowrap"
            }`}
          >
            <span className={`block text-xs font-medium ${style.color}`}>
              {title}
            </span>
            <span className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {domain}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mx-0.5">
                ·
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {style.label}
              </span>
            </span>
            {/* Quran verse translation */}
            {quranRef && (
              <span className="block mt-1.5 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50">
                {loading ? (
                  <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 italic">
                    Loading translation...
                  </span>
                ) : verseText ? (
                  <span className="block text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300 italic">
                    &ldquo;{verseText}&rdquo;
                  </span>
                ) : null}
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
                  ? style.tooltipArrow
                  : style.tooltipArrow.replace("border-t-", "border-b-")
              }`}
            />
          </span>
        </span>
      )}
    </span>
  );
}
