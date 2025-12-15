"use client";

import { FC, useState, useEffect } from "react";
import { useTheme } from "next-themes";

import { SunFilledIcon, MoonFilledIcon } from "@/components/icons";

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent Hydration Mismatch
  if (!isMounted) return <div className="w-8 h-8" />;

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${className || ""}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunFilledIcon size={18} /> : <MoonFilledIcon size={18} />}
    </button>
  );
};
