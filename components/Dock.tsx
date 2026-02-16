"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  Sun,
  Moon,
  Clock,
  MessageCircle,
  Trash2,
  History,
  Settings,
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

export type DockTab = "history" | "settings";

export function Dock({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
}: {
  isOpen: boolean;
  activeTab: DockTab;
  onClose: () => void;
  onTabChange: (tab: DockTab) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Desktop: Left slide panel */}
          <motion.div
            animate={{ x: 0 }}
            className="hidden sm:flex fixed left-0 top-0 bottom-0 w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl z-50 flex-col shadow-2xl"
            exit={{ x: "-100%" }}
            initial={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <DockContent
              activeTab={activeTab}
              onClose={onClose}
              onTabChange={onTabChange}
            />
          </motion.div>

          {/* Mobile: Bottom sheet */}
          <motion.div
            animate={{ y: 0 }}
            className="sm:hidden fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-neutral-900 z-50 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>
            <DockContent
              activeTab={activeTab}
              onClose={onClose}
              onTabChange={onTabChange}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DockContent({
  activeTab,
  onClose,
  onTabChange,
}: {
  activeTab: DockTab;
  onClose: () => void;
  onTabChange: (tab: DockTab) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with tabs */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-0.5">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === "history"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => onTabChange("history")}
            >
              <History className="w-3.5 h-3.5" strokeWidth={2} />
              History
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === "settings"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => onTabChange("settings")}
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={2} />
              Settings
            </button>
          </div>
          <button
            className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "history" ? <HistoryTab onClose={onClose} /> : <SettingsTab />}
      </div>
    </div>
  );
}

function HistoryTab({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { entries, removeEntry, clearAll } = useChatHistory();

  const handleNavigate = (slug: string) => {
    onClose();
    router.push(`/chat/${slug}`);
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
          <MessageCircle
            className="w-5 h-5 text-neutral-400 dark:text-neutral-500"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
          No conversations yet
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
          Your conversations will appear here
        </p>
        <p className="text-[10px] text-neutral-300 dark:text-neutral-600 mt-4">
          Stored in this browser only
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4">
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <HistoryItem
            key={entry.slug}
            entry={entry}
            onNavigate={handleNavigate}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <p className="text-[10px] text-neutral-300 dark:text-neutral-600">
          Stored in this browser only
        </p>
        <button
          className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
          onClick={clearAll}
        >
          Clear all
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
      className="group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
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
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
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

function SettingsTab() {
  const { theme, setTheme, themes } = useTheme();
  const { settings, updateSetting } = useSettings();

  const darkThemes = themes.filter((t) => t.mode === "dark");
  const lightThemes = themes.filter((t) => t.mode === "light");

  return (
    <div className="px-4 pb-5 space-y-5">
      {/* Theme Colors */}
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Theme
        </p>

        {/* Color Selection */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {(["emerald", "blue", "purple", "rose", "amber", "cyan"] as const).map(
            (accent) => (
              <button
                key={accent}
                className={`w-8 h-8 rounded-full transition-all ${
                  ACCENT_COLORS[accent].bg
                } ${
                  theme.accent === accent
                    ? `ring-4 ${ACCENT_COLORS[accent].ring} scale-110`
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

        {/* Mode Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-3xl p-1">
          <button
            className={`flex-1 py-2.5 text-xs font-medium rounded-3xl transition-all ${
              theme.mode === "light"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              const newTheme = lightThemes.find(
                (t) => t.accent === theme.accent,
              );

              if (newTheme) setTheme(newTheme);
            }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Sun className="w-4 h-4" strokeWidth={2} />
              Light
            </span>
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-medium rounded-3xl transition-all ${
              theme.mode === "dark"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
            onClick={() => {
              const newTheme = darkThemes.find(
                (t) => t.accent === theme.accent,
              );

              if (newTheme) setTheme(newTheme);
            }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Moon className="w-4 h-4" strokeWidth={2} />
              Dark
            </span>
          </button>
        </div>
      </div>

      {/* Display Settings */}
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Display
        </p>

        <label className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            Show timestamps
          </span>
          <div
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
              settings.showTimestamps
                ? "bg-accent-500"
                : "bg-neutral-300 dark:bg-neutral-600"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.showTimestamps ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
          <input
            checked={settings.showTimestamps}
            className="sr-only"
            type="checkbox"
            onChange={(e) =>
              updateSetting("showTimestamps", e.target.checked)
            }
          />
        </label>
      </div>

      {/* About */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">ithbat</span>
          <span className="text-xs text-neutral-400">v0.5</span>
        </div>
      </div>
    </div>
  );
}
