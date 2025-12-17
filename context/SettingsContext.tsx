"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type SearchDuration = "low" | "medium" | "unlimited";

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

// Map duration to timeout in ms (30s, 60s, unlimited)
export const SEARCH_DURATION_MS: Record<SearchDuration, number> = {
  low: 30000,
  medium: 60000,
  unlimited: 0, // 0 means no timeout
};

const DEFAULT_SETTINGS: Settings = {
  maxWebsiteNodes: 8,
  showTimestamps: true,
  includeAISummary: false,
  searchDuration: "medium",
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

        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
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
