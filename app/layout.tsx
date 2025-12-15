"use client";

import "@/styles/globals.css";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider } from "next-themes";

import { ResearchProvider } from "@/context/ResearchContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Ithbat - Islamic Knowledge Research</title>
        <meta
          name="description"
          content="Search for authentic Islamic knowledge backed by Quran, Hadith, and scholarly sources"
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <HeroUIProvider>
            <ResearchProvider>{children}</ResearchProvider>
          </HeroUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
