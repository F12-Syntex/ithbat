"use client";

import { ThemeSwitch } from "@/components/theme-switch";
import { ResearchContainer } from "@/components/research";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitch />
      </div>

      {/* Main Content */}
      <main className="flex-grow">
        <ResearchContainer />
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 text-center">
        <p className="text-neutral-400 dark:text-neutral-600 text-xs">
          ithbat v0.1
        </p>
      </footer>
    </div>
  );
}
