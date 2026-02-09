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
      `https://api.alquran.cloud/v1/ayah/${quranRef.surah}:${quranRef.ayah}/en.sahih`,
      { signal: AbortSignal.timeout(5000) },
    )
      .then((res) => res.json())
      .then((json) => {
        const data = Array.isArray(json.data) ? json.data[0] : json.data;
        if (data?.text) {
          const text =
            data.text.length > 180
              ? data.text.substring(0, 180) + "..."
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
      setPosition(rect.top < 80 ? "bottom" : "top");
    }
  }, [showTooltip]);

  return (
    <span ref={badgeRef} className="relative inline-flex align-baseline">
      <a
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium no-underline hover:opacity-70 transition-opacity ${color}`}
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
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="truncate max-w-[100px]">{title}</span>
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
          <span className="block px-2.5 py-2 rounded-lg shadow-lg border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
            <span className="flex items-center gap-1.5">
              <img
                alt=""
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-[11px] font-medium truncate">{title}</span>
              <span className="text-[10px] opacity-40 flex-shrink-0">{getSourceLabel(domain)}</span>
            </span>
            {/* Quran verse translation */}
            {quranRef && (
              <span className="block mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                {loading ? (
                  <span className="block text-[10px] opacity-40 italic">
                    Loading translation...
                  </span>
                ) : verseText ? (
                  <span className="block text-[11px] leading-relaxed opacity-80 italic">
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
