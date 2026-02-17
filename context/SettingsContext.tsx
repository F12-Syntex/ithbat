"use client";

import type { Language } from "@/lib/i18n";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface Settings {
  showTimestamps: boolean;
  language: Language;
}

const DEFAULT_SETTINGS: Settings = {
  showTimestamps: true,
  language: "en",
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

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
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
