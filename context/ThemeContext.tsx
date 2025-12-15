"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeAccent =
  | "emerald"
  | "blue"
  | "purple"
  | "rose"
  | "amber"
  | "cyan";

interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  accent: ThemeAccent;
}

export const THEMES: Theme[] = [
  { id: "light-emerald", name: "Light", mode: "light", accent: "emerald" },
  { id: "dark-emerald", name: "Dark", mode: "dark", accent: "emerald" },
  { id: "light-blue", name: "Ocean", mode: "light", accent: "blue" },
  { id: "dark-blue", name: "Midnight", mode: "dark", accent: "blue" },
  { id: "light-purple", name: "Lavender", mode: "light", accent: "purple" },
  { id: "dark-purple", name: "Violet", mode: "dark", accent: "purple" },
  { id: "light-rose", name: "Rose", mode: "light", accent: "rose" },
  { id: "dark-rose", name: "Cherry", mode: "dark", accent: "rose" },
  { id: "light-amber", name: "Warm", mode: "light", accent: "amber" },
  { id: "dark-amber", name: "Sunset", mode: "dark", accent: "amber" },
  { id: "light-cyan", name: "Aqua", mode: "light", accent: "cyan" },
  { id: "dark-cyan", name: "Deep Sea", mode: "dark", accent: "cyan" },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(THEMES[1]); // Default dark emerald
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme
    const savedThemeId = localStorage.getItem("theme-id");

    if (savedThemeId) {
      const savedTheme = THEMES.find((t) => t.id === savedThemeId);

      if (savedTheme) {
        setThemeState(savedTheme);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme mode
    const root = document.documentElement;

    if (theme.mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply accent color as CSS variable
    root.setAttribute("data-accent", theme.accent);

    // Save to localStorage
    localStorage.setItem("theme-id", theme.id);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
