"use client";

import "@/styles/globals.css";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider } from "next-themes";

import { ResearchProvider } from "@/context/ResearchContext";
import { AppThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <title>Ithbat - Islamic Knowledge Research</title>
        <meta
          content="Search for authentic Islamic knowledge backed by Quran, Hadith, and scholarly sources"
          name="description"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider enableSystem attribute="class" defaultTheme="dark">
          <HeroUIProvider>
            <AppThemeProvider>
              <SettingsProvider>
                <ResearchProvider>{children}</ResearchProvider>
              </SettingsProvider>
            </AppThemeProvider>
          </HeroUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
