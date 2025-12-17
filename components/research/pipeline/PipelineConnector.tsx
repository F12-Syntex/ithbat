"use client";

import { motion } from "framer-motion";

type ConnectorStatus = "pending" | "active" | "completed";

interface PipelineConnectorProps {
  status: ConnectorStatus;
  index?: number;
}

export function PipelineConnector({
  status,
  index = 0,
}: PipelineConnectorProps) {
  const isCompleted = status === "completed";
  const isActive = status === "active";

  return (
    <div className="relative flex-shrink-0 w-10 sm:w-16 h-0.5 mx-1.5 sm:mx-2">
      {/* Background track */}
      <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 rounded-full" />

      {/* Completed fill */}
      {isCompleted && (
        <motion.div
          animate={{ scaleX: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-accent-500 to-accent-400 rounded-full"
          initial={{ scaleX: 0, originX: 0 }}
          transition={{ delay: index * 0.2, duration: 0.4, ease: "easeOut" }}
        />
      )}

      {/* Active animated dashes */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {/* Partial fill */}
          <motion.div
            animate={{ width: "50%" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-500 to-accent-400 rounded-full"
            initial={{ width: "0%" }}
            transition={{ duration: 0.3 }}
          />

          {/* Animated dashes */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <motion.line
              animate={{ strokeDashoffset: -16 }}
              className="text-accent-400"
              initial={{ strokeDashoffset: 0 }}
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeWidth="2"
              transition={{
                repeat: Infinity,
                duration: 0.6,
                ease: "linear",
              }}
              x1="50%"
              x2="100%"
              y1="50%"
              y2="50%"
            />
          </svg>
        </div>
      )}

      {/* Arrow indicator for completed */}
      {isCompleted && (
        <motion.div
          animate={{ opacity: 1, x: 4 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1"
          initial={{ opacity: 0, x: -4 }}
          transition={{ delay: index * 0.2 + 0.3 }}
        >
          <svg
            className="w-2 h-2 text-accent-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
          </svg>
        </motion.div>
      )}
    </div>
  );
}
