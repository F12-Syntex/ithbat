"use client";

import type { Language } from "@/lib/i18n";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clipboard,
  Copy,
  ClipboardPaste,
  Sun,
  Moon,
  RefreshCw,
  Download,
  Layers,
  Sparkles,
  Share2,
  Globe,
} from "lucide-react";

import { SearchInput } from "./SearchInput";
import { ResearchResponse } from "./ResearchResponse";
import { FollowUpInput } from "./FollowUpInput";
import { ResearchPipeline } from "./pipeline";
import { SourceCitationCard } from "./response/SourceCitationCard";
import { FatwaWarningBanner } from "./FatwaWarningBanner";

import { ContextMenu } from "@/components/ContextMenu";
import { Dock } from "@/components/Dock";
import { IntroModal } from "@/components/IntroModal";
import { HowItWorks } from "@/components/HowItWorks";
import { useResearch } from "@/hooks/useResearch";
import { useTheme } from "@/context/ThemeContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useTranslation, EXAMPLE_QUESTIONS } from "@/lib/i18n";
import { isPersonalQuestion } from "@/lib/personal-question-detector";

function getRandomQuestions(count: number, lang: Language): string[] {
  const questions = EXAMPLE_QUESTIONS[lang] || EXAMPLE_QUESTIONS.en;
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

export function ResearchContainer() {
  const {
    state,
    isAnalyzing,
    slug,
    startResearch: baseStartResearch,
    askFollowUp: baseAskFollowUp,
    diveDeeper,
    cancelResearch,
    reset,
  } = useResearch();
  const { theme, setTheme, themes } = useTheme();
  const { addEntry } = useChatHistory();
  const { t, lang } = useTranslation();
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>();
  const [linkCopied, setLinkCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    if (!state.response || !state.query) return;
    const { exportResponseAsPdf } = await import("@/lib/export-pdf");

    await exportResponseAsPdf(state.response, state.query);
  }, [state.response, state.query]);

  const handleShareLink = useCallback(async () => {
    if (!slug) return;
    const url = `${window.location.origin}/chat/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");

      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [slug]);

  const startResearch = useCallback(
    (query: string, images?: string[]) => baseStartResearch(query, images),
    [baseStartResearch],
  );
  const askFollowUp = (question: string, images?: string[]) =>
    baseAskFollowUp(question, images);

  // Handler to clear suggested query after it's been applied to the input
  const handleSuggestedQueryApplied = useCallback(
    () => setSuggestedQuery(undefined),
    [],
  );

  // Random example questions - set client-side only to avoid hydration mismatch
  const defaultQuestions = EXAMPLE_QUESTIONS[lang] || EXAMPLE_QUESTIONS.en;
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([
    defaultQuestions[0],
    defaultQuestions[1],
    defaultQuestions[2],
  ]);

  useEffect(() => {
    setExampleQuestions(getRandomQuestions(3, lang));
  }, [lang]);

  // Save to local history when research completes
  useEffect(() => {
    if (state.status === "completed" && slug && state.query) {
      const messageCount = (state.completedSessions?.length || 0) + 1;

      addEntry(slug, state.query, messageCount);
    }
  }, [
    state.status,
    slug,
    state.query,
    state.completedSessions?.length,
    addEntry,
  ]);

  const isResearching = state.status === "researching";
  const hasResults =
    state.steps.length > 0 || (state.completedSessions?.length || 0) > 0;
  const isStreaming = isResearching && state.response.length > 0;

  const toggleDarkMode = () => {
    const currentMode = theme.mode;
    const newMode = currentMode === "dark" ? "light" : "dark";
    const newTheme = themes.find(
      (t) => t.mode === newMode && t.accent === theme.accent,
    );

    if (newTheme) setTheme(newTheme);
  };

  const handlePasteAndSearch = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (text.trim()) {
        startResearch(text.trim());
      }
    } catch {
      // Clipboard access denied
    }
  };

  const contextMenuItems = [
    {
      label: t("menu.newSearch"),
      icon: <Search className="w-4 h-4" strokeWidth={2} />,
      onClick: reset,
    },
    {
      label: t("menu.pasteSearch"),
      icon: <Clipboard className="w-4 h-4" strokeWidth={2} />,
      onClick: handlePasteAndSearch,
    },
    { divider: true as const },
    {
      label: t("menu.copy"),
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        const selection = window.getSelection()?.toString();

        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      },
    },
    {
      label: t("menu.paste"),
      icon: <ClipboardPaste className="w-4 h-4" strokeWidth={2} />,
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const activeElement = document.activeElement as HTMLInputElement;

          if (
            activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA"
          ) {
            const start = activeElement.selectionStart || 0;
            const end = activeElement.selectionEnd || 0;
            const value = activeElement.value;

            activeElement.value =
              value.slice(0, start) + text + value.slice(end);
            activeElement.selectionStart = activeElement.selectionEnd =
              start + text.length;
            activeElement.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } catch {
          // Clipboard access denied
        }
      },
    },
    { divider: true as const },
    {
      label: t("menu.copyResponse"),
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        if (state.response) {
          navigator.clipboard.writeText(state.response);
        }
      },
      disabled: !state.response,
    },
    {
      label: t("menu.shareLink"),
      icon: <Share2 className="w-4 h-4" strokeWidth={2} />,
      onClick: handleShareLink,
      disabled: !slug || state.status !== "completed",
    },
    {
      label: t("menu.sharePdf"),
      icon: <Download className="w-4 h-4" strokeWidth={2} />,
      onClick: handleExportPdf,
      disabled: !state.response || state.status !== "completed",
    },
    {
      label: t("menu.copyQuery"),
      icon: <Copy className="w-4 h-4" strokeWidth={2} />,
      onClick: () => {
        if (state.query) {
          navigator.clipboard.writeText(state.query);
        }
      },
      disabled: !state.query,
    },
    { divider: true as const },
    {
      label: theme.mode === "dark" ? t("menu.lightMode") : t("menu.darkMode"),
      icon:
        theme.mode === "dark" ? (
          <Sun className="w-4 h-4" strokeWidth={2} />
        ) : (
          <Moon className="w-4 h-4" strokeWidth={2} />
        ),
      onClick: toggleDarkMode,
    },
    { divider: true as const },
    {
      label: t("menu.reload"),
      icon: <RefreshCw className="w-4 h-4" strokeWidth={2} />,
      onClick: () => window.location.reload(),
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      {/* Intro Modal for first-time visitors */}
      <IntroModal />

      <div className="relative h-screen h-[100dvh] overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex flex-col">
        {/* Floating Bottom Dock */}
        <Dock
          linkCopied={linkCopied}
          shareDisabled={!slug || state.status !== "completed"}
          onNewSearch={reset}
          onShare={handleShareLink}
        />

        {/* Main Content Area */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-24"
        >
          {/* Search Section - Centers when no results, scrolls with content when results exist */}
          <div
            className={`flex flex-col items-center justify-center px-3 sm:px-4 transition-all duration-500 ease-out ${
              hasResults ? "pt-4 sm:pt-6 pb-3 sm:pb-4" : "flex-1"
            }`}
          >
            {/* Title - Animate out when searching */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="text-center mb-6 sm:mb-8"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="relative inline-block group">
                    <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-800 dark:text-neutral-100 cursor-default">
                      إثبات
                    </h1>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                      <div className="px-2.5 py-1 bg-neutral-800 dark:bg-neutral-200 text-neutral-100 dark:text-neutral-800 text-[11px] rounded-full whitespace-nowrap">
                        {t("app.tooltip")}
                      </div>
                    </div>
                  </div>
                  <p className="text-neutral-400 dark:text-neutral-500 text-xs sm:text-sm mt-2">
                    {t("app.tagline")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Input */}
            <div className="w-full max-w-md">
              <SearchInput
                isLoading={isResearching}
                suggestedQuery={suggestedQuery}
                onCancel={cancelResearch}
                onSearch={startResearch}
                onSuggestedQueryApplied={handleSuggestedQueryApplied}
              />
            </div>

            {/* Example Buttons */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 px-2 w-full max-w-md"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {exampleQuestions.map((example, i) => (
                    <motion.button
                      key={example}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-full shadow-sm dark:shadow-none hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400 hover:shadow-md dark:hover:shadow-none transition-all active:scale-95 sm:hover:scale-105"
                      initial={{ opacity: 0, y: 10 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSuggestedQuery(example)}
                    >
                      {example}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it Works */}
            <AnimatePresence mode="popLayout">
              {!hasResults && !isResearching && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="mt-6 sm:mt-8 flex justify-center"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <HowItWorks />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Section - Part of scrollable content */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="px-3 sm:px-4"
                exit={{ opacity: 0, y: 50 }}
                initial={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="max-w-2xl mx-auto py-3 sm:py-4">
                  {/* Completed Sessions (Previous Q&A in thread) */}
                  {state.completedSessions?.map((session, sessionIndex) => (
                    <div key={sessionIndex} className="mb-6">
                      {/* Previous Query - with New conversation button on first session */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {sessionIndex + 1}
                          </span>
                        </span>
                        <span className="flex-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                          {session.query}
                        </span>
                        {sessionIndex === 0 && state.status === "completed" && (
                          <button
                            className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                            type="button"
                            onClick={reset}
                          >
                            {t("research.newConversation")}
                          </button>
                        )}
                      </div>

                      {/* Attached images */}
                      {session.images && session.images.length > 0 && (
                        <div className="flex gap-2 mb-2 ml-7">
                          {session.images.map((img, i) => (
                            <img
                              key={i}
                              alt={`Attachment ${i + 1}`}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-neutral-200/80 dark:border-neutral-700"
                              src={img}
                            />
                          ))}
                        </div>
                      )}

                      {/* Previous Pipeline */}
                      <div className="mb-3">
                        <ResearchPipeline
                          isCompact={false}
                          showDetails={true}
                          steps={session.steps}
                        />
                      </div>

                      {/* Previous Response */}
                      <div className="opacity-90">
                        <ResearchResponse
                          content={session.response}
                          isStreaming={false}
                        />
                      </div>

                      {/* Divider between sessions */}
                      <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {t("research.followUp")}
                        </span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                    </div>
                  ))}

                  {/* Current Session */}
                  {state.steps.length > 0 && (
                    <>
                      {/* Current Query Display */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {(state.completedSessions?.length || 0) + 1}
                          </span>
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                          {state.query}
                        </span>
                      </div>

                      {/* Current query images */}
                      {state.images && state.images.length > 0 && (
                        <div className="flex gap-2 mb-2 ml-7">
                          {state.images.map((img, i) => (
                            <img
                              key={i}
                              alt={`Attachment ${i + 1}`}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-neutral-200/80 dark:border-neutral-700"
                              src={img}
                            />
                          ))}
                        </div>
                      )}

                      {/* Fatwa Warning Banner — client-side or server-side detection */}
                      {(state.isPersonalQuestion || isPersonalQuestion(state.query, lang)) && (
                        <FatwaWarningBanner message={t("app.fatwaWarning")} />
                      )}

                      {/* Research Pipeline */}
                      <div className="mb-3">
                        <ResearchPipeline
                          isCompact={false}
                          showDetails={true}
                          steps={state.steps}
                        />
                      </div>

                      {/* Sources - Compact favicon circles */}
                      {state.sources.length > 0 && !state.response && (
                        <div className="mb-3">
                          <SourceCitationCard
                            sources={state.sources.map((source, index) => ({
                              number: index + 1,
                              title: source.title,
                              url: source.url,
                              domain: source.domain,
                            }))}
                          />
                        </div>
                      )}

                      {/* Current Response */}
                      {(state.response || isStreaming) && (
                        <div>
                          <ResearchResponse
                            apiSources={state.sources}
                            content={state.response}
                            isStreaming={isStreaming}
                          />
                        </div>
                      )}

                      {/* AI Translation Notice */}
                      {lang !== "en" &&
                        state.status === "completed" &&
                        state.response && (
                          <motion.div
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-1.5 mt-3"
                            initial={{ opacity: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Globe
                              className="w-3 h-3 text-neutral-400 dark:text-neutral-500"
                              strokeWidth={2}
                            />
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              {t("research.aiTranslated")}
                            </span>
                          </motion.div>
                        )}

                      {/* Dive Deeper Button */}
                      {(state.status === "completed" || isAnalyzing) &&
                        state.response && (
                          <motion.div
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-5 flex flex-col items-center gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            transition={{ delay: 0.3 }}
                          >
                            <button
                              className="group relative flex items-center gap-2.5 px-5 py-2.5 text-xs rounded-full overflow-hidden transition-all duration-300 disabled:cursor-not-allowed bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-accent-400 dark:hover:border-accent-600 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--accent-500)_15%,transparent)] active:scale-[0.97]"
                              disabled={isAnalyzing}
                              onClick={diveDeeper}
                            >
                              {/* Shimmer overlay when loading */}
                              {isAnalyzing && (
                                <motion.div
                                  animate={{ x: ["calc(-100%)", "calc(200%)"] }}
                                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-accent-400/10 dark:via-accent-400/5 to-transparent"
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                />
                              )}

                              {isAnalyzing ? (
                                <>
                                  <motion.div className="relative w-4 h-4">
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      className="absolute inset-0 rounded-full border-2 border-accent-200 dark:border-accent-800 border-t-accent-500 dark:border-t-accent-400"
                                      transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        ease: "linear",
                                      }}
                                    />
                                  </motion.div>
                                  <span className="text-accent-600 dark:text-accent-400 font-medium">
                                    {t("research.divingDeeper")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <motion.div
                                    className="relative"
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 15,
                                    }}
                                    whileHover={{ scale: 1.1, rotate: 12 }}
                                  >
                                    <Layers
                                      className="w-4 h-4 text-accent-500 dark:text-accent-400"
                                      strokeWidth={2}
                                    />
                                  </motion.div>
                                  <span className="text-neutral-600 dark:text-neutral-300 group-hover:text-accent-600 dark:group-hover:text-accent-400 font-medium transition-colors">
                                    {t("research.diveDeeper")}
                                  </span>
                                  <Sparkles
                                    className="w-3 h-3 text-neutral-300 dark:text-neutral-600 group-hover:text-accent-400 dark:group-hover:text-accent-500 transition-colors"
                                    strokeWidth={2}
                                  />
                                </>
                              )}
                            </button>

                            {/* Loading indicator below button */}
                            <AnimatePresence>
                              {isAnalyzing && (
                                <motion.div
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-1.5"
                                  exit={{ opacity: 0, y: -4 }}
                                  initial={{ opacity: 0, y: 6 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      animate={{
                                        opacity: [0.3, 1, 0.3],
                                        scale: [0.8, 1, 0.8],
                                      }}
                                      className="w-1 h-1 rounded-full bg-accent-400 dark:bg-accent-500"
                                      transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                        ease: "easeInOut",
                                      }}
                                    />
                                  ))}
                                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1">
                                    {t("research.findingMore")}
                                  </span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                    </>
                  )}

                  {/* Follow-up Input */}
                  {state.status === "completed" &&
                    state.response &&
                    !isAnalyzing && (
                      <FollowUpInput
                        isLoading={isResearching}
                        previousQuery={state.query}
                        onSubmit={askFollowUp}
                      />
                    )}

                  {/* Error */}
                  {state.error && (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-3xl mt-3 sm:mt-4"
                      initial={{ opacity: 0 }}
                    >
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {state.error}
                      </p>
                    </motion.div>
                  )}

                  {/* Disclaimer */}
                  {state.status === "completed" && (
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] text-neutral-400 pt-4 sm:pt-6 pb-2"
                      initial={{ opacity: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {t("app.disclaimer")}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ContextMenu>
  );
}
