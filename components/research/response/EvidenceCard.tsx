"use client";

import {
  Globe,
  ExternalLink,
  BookOpen,
  FileText,
  User,
  Scale,
} from "lucide-react";

type EvidenceType = "hadith" | "quran" | "scholar" | "fatwa" | "general";

interface EvidenceCardProps {
  title: string;
  quote: string;
  reference: string;
  url: string;
  type?: EvidenceType;
}

// Detect evidence type from title and reference
function detectEvidenceType(title: string, reference: string): EvidenceType {
  const combined = `${title} ${reference}`.toLowerCase();

  if (/quran|surah|ayah|verse|\d+:\d+/.test(combined)) {
    return "quran";
  }
  if (
    /bukhari|muslim|tirmidhi|abu dawud|nasai|ibn majah|hadith|sunnah|narrated/.test(
      combined,
    )
  ) {
    return "hadith";
  }
  if (
    /fatwa|islamqa|ruling|permissible|prohibited|halal|haram/.test(combined)
  ) {
    return "fatwa";
  }
  if (/sheikh|imam|scholar|ibn|al-/.test(combined)) {
    return "scholar";
  }

  return "general";
}

// Config for each type
const typeConfig: Record<
  EvidenceType,
  {
    icon: React.ReactNode;
    accentColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  quran: {
    icon: <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />,
    accentColor: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800/50",
  },
  hadith: {
    icon: <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />,
    accentColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800/50",
  },
  scholar: {
    icon: <User className="w-3.5 h-3.5" strokeWidth={1.5} />,
    accentColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800/50",
  },
  fatwa: {
    icon: <Scale className="w-3.5 h-3.5" strokeWidth={1.5} />,
    accentColor: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800/50",
  },
  general: {
    icon: <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />,
    accentColor: "text-neutral-600 dark:text-neutral-400",
    bgColor: "bg-neutral-50 dark:bg-neutral-900/30",
    borderColor: "border-neutral-200 dark:border-neutral-700/50",
  },
};

/**
 * Build a Google search URL to find the source
 */
function buildGoogleSearchUrl(quote: string, reference: string): string {
  // Take first 80 chars of quote for search
  let searchQuery = quote
    .replace(/["""'']/g, "")
    .replace(/\([^)]*\)/g, "")
    .trim();

  if (searchQuery.length > 80) {
    searchQuery = searchQuery.slice(0, 80);
  }

  // Add reference for better search
  const fullQuery = `${searchQuery} ${reference}`.trim();

  return `https://www.google.com/search?q=${encodeURIComponent(fullQuery)}`;
}

export function EvidenceCard({
  title,
  quote,
  reference,
  url,
  type,
}: EvidenceCardProps) {
  const evidenceType = type || detectEvidenceType(title, reference);
  const config = typeConfig[evidenceType];
  const googleSearchUrl = buildGoogleSearchUrl(quote, reference);

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 my-3`}
    >
      {/* Header with type icon and title */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`mt-0.5 ${config.accentColor}`}>{config.icon}</span>
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">
          {title}
        </h4>
      </div>

      {/* Quote */}
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3 pl-5">
        "{quote}"
      </p>

      {/* Footer with reference and actions */}
      <div className="flex items-center justify-between pl-5">
        {/* Reference link */}
        <a
          className={`text-xs font-medium ${config.accentColor} hover:underline flex items-center gap-1`}
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {reference}
          <ExternalLink className="w-3 h-3" strokeWidth={2} />
        </a>

        {/* Find Source button */}
        <a
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
          href={googleSearchUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Globe className="w-3 h-3" strokeWidth={2} />
          <span>Find Source</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Parse evidence paragraph in format:
 * **Title** — "Quote text" — [Reference](URL)
 */
export function parseEvidenceParagraph(text: string): {
  isEvidence: boolean;
  title?: string;
  quote?: string;
  reference?: string;
  url?: string;
} {
  // Pattern: **Title** — "Quote" — [Reference](URL)
  const pattern =
    /^\*\*([^*]+)\*\*\s*—\s*"?([^"—]+)"?\s*—\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
  const match = text.trim().match(pattern);

  if (match) {
    return {
      isEvidence: true,
      title: match[1].trim(),
      quote: match[2].trim().replace(/^[""]|[""]$/g, ""),
      reference: match[3].trim(),
      url: match[4].trim(),
    };
  }

  // Also try simpler pattern: **Title** — Quote — [Reference](URL)
  const simplePattern =
    /^\*\*([^*]+)\*\*\s*—\s*(.+?)\s*—\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
  const simpleMatch = text.trim().match(simplePattern);

  if (simpleMatch) {
    return {
      isEvidence: true,
      title: simpleMatch[1].trim(),
      quote: simpleMatch[2].trim().replace(/^[""]|[""]$/g, ""),
      reference: simpleMatch[3].trim(),
      url: simpleMatch[4].trim(),
    };
  }

  return { isEvidence: false };
}
