"use client";

import type { ResearchStep } from "@/types/research";

import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Search,
  Globe,
  FileText,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";

interface PipelineStepProps {
  step: ResearchStep;
  index: number;
  isCompact?: boolean;
  onExpand?: () => void;
}

const stepIcons: Record<string, LucideIcon> = {
  understanding: Lightbulb,
  searching: Search,
  exploring: Globe,
  synthesizing: FileText,
};

export function PipelineStep({
  step,
  index,
  isCompact = false,
  onExpand,
}: PipelineStepProps) {
  const isActive = step.status === "in_progress";
  const isCompleted = step.status === "completed";
  const isError = step.status === "error";

  // Get the icon for this step type
  const Icon = stepIcons[step.type] || stepIcons.understanding;
  const iconSize = isCompact ? 20 : 24;

  return (
    <motion.button
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex-shrink-0 flex items-center justify-center rounded-full transition-all ${
        isCompact ? "w-10 h-10 sm:w-12 sm:h-12" : "w-12 h-12 sm:w-14 sm:h-14"
      } ${
        isCompleted
          ? "bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400"
          : isActive
            ? "bg-accent-50 dark:bg-accent-900/20 text-accent-500"
            : isError
              ? "bg-red-100 dark:bg-red-900/30 text-red-500"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
      }`}
      initial={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onExpand}
    >
      {/* Spinning border for active state */}
      {isActive && (
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, var(--accent-500) 90deg, transparent 180deg)`,
            maskImage: "radial-gradient(transparent 60%, black 61%)",
            WebkitMaskImage: "radial-gradient(transparent 60%, black 61%)",
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Pulse ring for active */}
      {isActive && (
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          className="absolute inset-0 rounded-full bg-accent-500/20"
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Icon or checkmark */}
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div
            key="check"
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            initial={{ scale: 0, rotate: -180 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check size={iconSize} strokeWidth={2.5} />
          </motion.div>
        ) : isError ? (
          <motion.div
            key="error"
            animate={{ scale: 1 }}
            initial={{ scale: 0 }}
          >
            <X size={iconSize} strokeWidth={2} />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            initial={{ scale: 0.8, opacity: 0 }}
          >
            <Icon size={iconSize} strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
