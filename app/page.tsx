"use client";

import { ThemeSwitch } from "@/components/theme-switch";
import { ResearchContainer } from "@/components/research";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen bg-background">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitch />
      </div>

      {/* Main Content */}
      <main className="flex-grow px-4 md:px-6">
        <ResearchContainer />
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 text-center">
        <p className="text-default-300 text-xs font-mono">
          ithbat v0.1
        </p>
      </footer>
    </div>
  );
}
