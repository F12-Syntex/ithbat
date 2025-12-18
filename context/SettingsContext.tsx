"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type SearchDuration = "fast" | "standard" | "thorough" | "unlimited";

export interface EvidenceTypeFilters {
  hadith: boolean;
  quran: boolean;
  scholar: boolean;
  fatwa: boolean;
}

interface Settings {
  maxWebsiteNodes: number;
  showTimestamps: boolean;
  includeAISummary: boolean;
  searchDuration: SearchDuration;
  evidenceFilters: EvidenceTypeFilters;
}

// Map duration to timeout in ms
// Islamic research can take longer due to source verification
export const SEARCH_DURATION_MS: Record<SearchDuration, number> = {
  fast: 60000, // 1 minute - quick results, may skip verification
  standard: 180000, // 3 minutes - normal research
  thorough: 480000, // 8 minutes - thorough research with full verification
  unlimited: 0, // 0 means no timeout
};

const DEFAULT_SETTINGS: Settings = {
  maxWebsiteNodes: 8,
  showTimestamps: true,
  includeAISummary: false,
  searchDuration: "standard",
  evidenceFilters: {
    hadith: true,
    quran: true,
    scholar: true,
    fatwa: true,
  },
};

interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("app-settings");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Deep merge to ensure nested objects like evidenceFilters are properly merged
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Ensure evidenceFilters is properly merged with defaults
          evidenceFilters: {
            ...DEFAULT_SETTINGS.evidenceFilters,
            ...(parsed.evidenceFilters || {}),
          },
        });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("app-settings", JSON.stringify(settings));
  }, [settings, mounted]);

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!mounted) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
