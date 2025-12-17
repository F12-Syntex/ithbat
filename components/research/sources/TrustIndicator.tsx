"use client";

import { motion } from "framer-motion";

export type HadithAuthenticity =
  | "sahih"
  | "hasan"
  | "daif"
  | "mawdu"
  | "unknown";

interface TrustIndicatorProps {
  trusted?: boolean;
  authenticity?: HadithAuthenticity;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const authenticityConfig: Record<
  HadithAuthenticity,
  {
    icon: React.ReactNode;
    label: string;
    fullLabel: string;
    color: string;
    bg: string;
    ring: string;
  }
> = {
  sahih: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Sahih",
    fullLabel: "Authentic",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    ring: "ring-emerald-500/30",
  },
  hasan: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Hasan",
    fullLabel: "Good",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    ring: "ring-amber-500/30",
  },
  daif: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Da'if",
    fullLabel: "Weak",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    ring: "ring-orange-500/30",
  },
  mawdu: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Mawdu'",
    fullLabel: "Fabricated",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    ring: "ring-red-500/30",
  },
  unknown: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Unknown",
    fullLabel: "Unverified",
    color: "text-neutral-500 dark:text-neutral-400",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    ring: "ring-neutral-500/30",
  },
};

const sizeClasses = {
  sm: {
    container: "h-5 px-1.5 gap-1",
    icon: "w-3 h-3",
    text: "text-[10px]",
  },
  md: {
    container: "h-6 px-2 gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs",
  },
  lg: {
    container: "h-7 px-2.5 gap-2",
    icon: "w-4 h-4",
    text: "text-sm",
  },
};

export function TrustIndicator({
  trusted = true,
  authenticity,
  showLabel = true,
  size = "md",
}: TrustIndicatorProps) {
  const sizes = sizeClasses[size];

  // If authenticity is provided, show that instead
  if (authenticity) {
    const config = authenticityConfig[authenticity];

    return (
      <motion.div
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center rounded-full ${sizes.container} ${config.bg} ${config.color} font-medium`}
        initial={{ scale: 0.9, opacity: 0 }}
        title={config.fullLabel}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
      >
        <span className={sizes.icon}>{config.icon}</span>
        {showLabel && <span className={sizes.text}>{config.label}</span>}
      </motion.div>
    );
  }

  // Show trusted/untrusted indicator
  return (
    <motion.div
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center rounded-full ${sizes.container} ${
        trusted
          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
      } font-medium`}
      initial={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className={sizes.icon}>
        {trusted ? (
          <svg
            className="w-full h-full"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            className="w-full h-full"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {showLabel && (
        <span className={sizes.text}>{trusted ? "Trusted" : "Unverified"}</span>
      )}
    </motion.div>
  );
}

// Export config for use in other components
export { authenticityConfig };
