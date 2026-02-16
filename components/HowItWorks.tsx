"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Search,
  Globe,
  FileText,
  HelpCircle,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

import { getTrustedDomainsForUI } from "@/types/sources";
import { useTranslation } from "@/lib/i18n";

const stepKeys: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: Lightbulb, titleKey: "how.step1.title", descKey: "how.step1.desc" },
  { icon: Search, titleKey: "how.step2.title", descKey: "how.step2.desc" },
  { icon: Globe, titleKey: "how.step3.title", descKey: "how.step3.desc" },
  { icon: FileText, titleKey: "how.step4.title", descKey: "how.step4.desc" },
];

const trustedSources = getTrustedDomainsForUI();

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md">
      {/* Toggle Button */}
      <button
        className="flex items-center gap-2 mx-auto text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
        <span>{t("how.toggle")}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3" strokeWidth={2} />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
              {/* Process Steps */}
              <div className="space-y-4 mb-5">
                <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                  {t("how.processTitle")}
                </h4>
                <div className="space-y-3">
                  {stepKeys.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <motion.div
                        key={step.titleKey}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 dark:text-accent-400">
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                            {t(step.titleKey)}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {t(step.descKey)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-neutral-200 dark:bg-neutral-800 mb-4" />

              {/* Trusted Sources */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider mb-3">
                  {t("how.sourcesTitle")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {trustedSources.map((source) => (
                    <span
                      key={source.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 rounded-full"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {source.name}
                      </span>
                      <span className="text-neutral-400 dark:text-neutral-500">
                        ({source.type})
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Note */}
              <p className="mt-4 text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                {t("how.note")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
