"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface FatwaWarningBannerProps {
  message: string;
}

export function FatwaWarningBanner({ message }: FatwaWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 rounded-2xl border border-amber-300/60 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2.5 flex items-start gap-2.5"
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          initial={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <AlertTriangle
            className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <p className="flex-1 text-[11px] sm:text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
            {message}
          </p>
          <button
            className="flex-shrink-0 p-0.5 rounded-full text-amber-400 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
            type="button"
            onClick={() => setDismissed(true)}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
