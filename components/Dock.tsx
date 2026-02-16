"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Clock,
  MessageCircle,
  Trash2,
  History,
  Settings,
  Plus,
  Share2,
  Check,
  ArrowRight,
} from "lucide-react";

import { useTheme, type ThemeAccent } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import {
  useChatHistory,
  type ChatHistoryEntry,
} from "@/hooks/useChatHistory";

const ACCENT_COLORS: Record<ThemeAccent, { bg: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-500/30" },
  blue: { bg: "bg-blue-500", ring: "ring-blue-500/30" },
  purple: { bg: "bg-purple-500", ring: "ring-purple-500/30" },
  rose: { bg: "bg-rose-500", ring: "ring-rose-500/30" },
  amber: { bg: "bg-amber-500", ring: "ring-amber-500/30" },
  cyan: { bg: "bg-cyan-500", ring: "ring-cyan-500/30" },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type PanelType = "history" | "settings" | null;

interface DockProps {
  shareDisabled: boolean;
  onNewSearch: () => void;
  onShare: () => void;
  linkCopied: boolean;
}

export function Dock({
  shareDisabled,
  onNewSearch,
  onShare,
  linkCopied,
}: DockProps) {
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const togglePanel = (panel: PanelType) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const closePanel = useCallback(() => setOpenPanel(null), []);

  // Close panel on any click outside the dock
  useEffect(() => {
    if (!openPanel) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openPanel, closePanel]);

  return (
    <div ref={dockRef} className="fixed left-1/2 -translate-x-1/2 bottom-5 z-40 flex flex-col items-center">
      {/* Popover panel — floats above the dock */}
      <AnimatePresence>
        {openPanel && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative z-40 mb-3 w-[320px] max-h-[60vh] bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xl flex flex-col overflow-hidden"
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Panel header */}
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                {openPanel === "history" ? "History" : "Settings"}
              </h2>
            </div>

            {/* Panel content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {openPanel === "history" ? (
                <HistoryTab onClose={() => setOpenPanel(null)} />
              ) : (
                <SettingsTab />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock pill */}
      <motion.div
        layout
        className="flex items-center gap-1 px-1.5 py-1.5 backdrop-blur-xl shadow-lg bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50 rounded-full"
      >
        <DockButton
          active={openPanel === "history"}
          icon={<History className="w-4 h-4" strokeWidth={1.5} />}
          label="History"
          onClick={() => togglePanel("history")}
        />
        <DockButton
          icon={<Plus className="w-4 h-4" strokeWidth={1.5} />}
          label="New"
          onClick={onNewSearch}
        />
        <DockButton
          disabled={shareDisabled}
          icon={
            linkCopied ? (
              <Check className="w-4 h-4 text-green-500" strokeWidth={2} />
            ) : (
              <Share2 className="w-4 h-4" strokeWidth={1.5} />
            )
          }
          label={linkCopied ? "Copied" : "Share"}
          onClick={onShare}
        />
        <DockButton
          active={openPanel === "settings"}
          icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}
          label="Settings"
          onClick={() => togglePanel("settings")}
        />
      </motion.div>
    </div>
  );
}

function DockButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "text-accent-600 dark:text-accent-400 bg-accent-100 dark:bg-accent-900/40"
            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90"
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

// ─── History Panel Content ───────────────────────────────────────────

const MAX_PREVIEW_ENTRIES = 5;

function HistoryTab({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { entries, removeEntry } = useChatHistory();

  const handleNavigate = (slug: string) => {
    onClose();
    router.push(`/chat/${slug}`);
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <MessageCircle
          className="w-5 h-5 text-neutral-300 dark:text-neutral-600 mb-2"
          strokeWidth={1.5}
        />
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          No conversations yet
        </p>
      </div>
    );
  }

  const preview = entries.slice(0, MAX_PREVIEW_ENTRIES);
  const hasMore = entries.length > MAX_PREVIEW_ENTRIES;

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto max-h-[240px] py-1">
        {preview.map((entry) => (
          <HistoryItem
            key={entry.slug}
            entry={entry}
            onNavigate={handleNavigate}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-neutral-100 dark:border-neutral-800">
        <button
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          onClick={() => {
            onClose();
            router.push("/history");
          }}
        >
          {hasMore ? `Show all (${entries.length})` : "Show all"}
          <ArrowRight className="w-3 h-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function HistoryItem({
  entry,
  onNavigate,
  onRemove,
}: {
  entry: ChatHistoryEntry;
  onNavigate: (slug: string) => void;
  onRemove: (slug: string) => void;
}) {
  return (
    <div
      className="group flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      onClick={() => onNavigate(entry.slug)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
          {entry.query}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.messageCount > 1 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-600 dark:text-accent-400">
              <MessageCircle className="w-2.5 h-2.5" strokeWidth={2} />
              {entry.messageCount}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
            <Clock className="w-2.5 h-2.5" strokeWidth={2} />
            {formatRelativeTime(entry.updatedAt)}
          </span>
        </div>
      </div>
      <button
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry.slug);
        }}
      >
        <Trash2 className="w-3 h-3" strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Settings Panel Content ──────────────────────────────────────────

function SettingsTab() {
  const router = useRouter();
  const { theme, setTheme, themes } = useTheme();
  const { settings, updateSetting } = useSettings();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const darkThemes = themes.filter((t) => t.mode === "dark");
  const lightThemes = themes.filter((t) => t.mode === "light");

  const handleVersionTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);

    if (tapCount.current >= 5) {
      tapCount.current = 0;
      router.push("/logs");
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);
  };

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Accent color */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Color</span>
        <div className="flex items-center gap-2">
          {(["emerald", "blue", "purple", "rose", "amber", "cyan"] as const).map(
            (accent) => (
              <button
                key={accent}
                className={`w-6 h-6 rounded-full transition-all ${
                  ACCENT_COLORS[accent].bg
                } ${
                  theme.accent === accent
                    ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${ACCENT_COLORS[accent].ring} scale-110`
                    : "hover:scale-110"
                }`}
                onClick={() => {
                  const newTheme = themes.find(
                    (t) => t.accent === accent && t.mode === theme.mode,
                  );
                  if (newTheme) setTheme(newTheme);
                }}
              />
            ),
          )}
        </div>
      </div>

      {/* Light / Dark toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Mode</span>
        <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-full p-0.5">
          <button
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
              theme.mode === "light"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              const newTheme = lightThemes.find((t) => t.accent === theme.accent);
              if (newTheme) setTheme(newTheme);
            }}
          >
            <Sun className="w-3.5 h-3.5 inline-block mr-1 -mt-px" strokeWidth={2} />
            Light
          </button>
          <button
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
              theme.mode === "dark"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              const newTheme = darkThemes.find((t) => t.accent === theme.accent);
              if (newTheme) setTheme(newTheme);
            }}
          >
            <Moon className="w-3.5 h-3.5 inline-block mr-1 -mt-px" strokeWidth={2} />
            Dark
          </button>
        </div>
      </div>

      {/* Show timestamps */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Timestamps
        </span>
        <div
          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
            settings.showTimestamps
              ? "bg-accent-500"
              : "bg-neutral-300 dark:bg-neutral-600"
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.showTimestamps ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <input
          checked={settings.showTimestamps}
          className="sr-only"
          type="checkbox"
          onChange={(e) => updateSetting("showTimestamps", e.target.checked)}
        />
      </label>

      {/* Version — tap 5 times to open /logs */}
      <div
        className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between cursor-default select-none"
        onClick={handleVersionTap}
      >
        <span className="text-[10px] text-neutral-300 dark:text-neutral-600">ithbat</span>
        <span className="text-[10px] text-neutral-300 dark:text-neutral-600">v0.5</span>
      </div>
    </div>
  );
}

// Re-export for context menu usage
export type { PanelType as DockSheet };
