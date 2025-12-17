"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { SourceType } from "./SourceTypeBadge";

interface Position {
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
  type?: SourceType;
}

interface SourceConnectionsProps {
  sourcePositions: Map<string, Position>;
  connections: Connection[];
  centerPosition?: Position;
  isAnimating?: boolean;
  showCenter?: boolean;
}

const colorsByType: Record<SourceType, string> = {
  quran: "#0ea5e9", // sky-500
  hadith: "#f59e0b", // amber-500
  scholarly_opinion: "#8b5cf6", // violet-500
  fatwa: "#10b981", // emerald-500
  tafsir: "#06b6d4", // cyan-500
  fiqh: "#ec4899", // pink-500
  unknown: "#6b7280", // neutral-500
};

export function SourceConnections({
  sourcePositions,
  connections,
  centerPosition,
  isAnimating = true,
  showCenter = true,
}: SourceConnectionsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();

        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Calculate center if not provided
  const center = centerPosition || {
    x: dimensions.width / 2,
    y: dimensions.height - 40,
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Gradient definitions for each source type */}
        {Object.entries(colorsByType).map(([type, color]) => (
          <linearGradient
            key={type}
            id={`gradient-${type}`}
            x1="0%"
            x2="100%"
            y1="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="50%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        ))}

        {/* Glow filter */}
        <filter height="200%" id="glow" width="200%" x="-50%" y="-50%">
          <feGaussianBlur result="blur" stdDeviation="2" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Animated dash pattern */}
        <pattern
          height="1"
          id="dash-pattern"
          patternUnits="userSpaceOnUse"
          width="12"
        >
          <line stroke="currentColor" x1="0" x2="6" y1="0" y2="0" />
        </pattern>
      </defs>

      {/* Connection lines between sources */}
      {connections.map((connection, index) => {
        const fromPos = sourcePositions.get(connection.from);
        const toPos = sourcePositions.get(connection.to);

        if (!fromPos || !toPos) return null;

        const color = colorsByType[connection.type || "unknown"];

        // Create curved path
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2 - 20; // Curve upward

        return (
          <g key={`${connection.from}-${connection.to}`}>
            {/* Background glow */}
            <motion.path
              animate={{ pathLength: 1 }}
              d={`M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`}
              fill="none"
              filter="url(#glow)"
              initial={{ pathLength: 0 }}
              stroke={color}
              strokeOpacity="0.1"
              strokeWidth="4"
              transition={{
                delay: index * 0.1,
                duration: 0.8,
                ease: "easeOut",
              }}
            />

            {/* Main line */}
            <motion.path
              animate={{ pathLength: 1 }}
              d={`M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`}
              fill="none"
              initial={{ pathLength: 0 }}
              stroke={`url(#gradient-${connection.type || "unknown"})`}
              strokeLinecap="round"
              strokeWidth="2"
              transition={{
                delay: index * 0.1,
                duration: 0.8,
                ease: "easeOut",
              }}
            />

            {/* Animated dash overlay */}
            {isAnimating && (
              <motion.path
                animate={{ strokeDashoffset: -24 }}
                d={`M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`}
                fill="none"
                initial={{ strokeDashoffset: 0 }}
                stroke={color}
                strokeDasharray="4 8"
                strokeLinecap="round"
                strokeOpacity="0.5"
                strokeWidth="2"
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                }}
              />
            )}
          </g>
        );
      })}

      {/* Lines from sources to center hub */}
      {showCenter &&
        Array.from(sourcePositions.entries()).map(([id, pos], index) => {
          // Find the source type from connections
          const connection = connections.find(
            (c) => c.from === id || c.to === id,
          );
          const color = colorsByType[connection?.type || "unknown"];

          // Create curved path to center
          const controlY = (pos.y + center.y) / 2;

          return (
            <g key={`center-${id}`}>
              {/* Background glow */}
              <motion.path
                animate={{ pathLength: 1 }}
                d={`M ${pos.x} ${pos.y + 10} Q ${pos.x} ${controlY} ${center.x} ${center.y}`}
                fill="none"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                stroke={color}
                strokeOpacity="0.1"
                strokeWidth="3"
                transition={{
                  delay: 0.3 + index * 0.1,
                  duration: 0.6,
                  ease: "easeOut",
                }}
              />

              {/* Main line */}
              <motion.path
                animate={{ pathLength: 1 }}
                d={`M ${pos.x} ${pos.y + 10} Q ${pos.x} ${controlY} ${center.x} ${center.y}`}
                fill="none"
                initial={{ pathLength: 0 }}
                stroke={color}
                strokeLinecap="round"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                transition={{
                  delay: 0.3 + index * 0.1,
                  duration: 0.6,
                  ease: "easeOut",
                }}
              />
            </g>
          );
        })}

      {/* Center hub */}
      {showCenter && (
        <g>
          {/* Outer glow ring */}
          <motion.circle
            animate={{ scale: 1, opacity: 1 }}
            cx={center.x}
            cy={center.y}
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            r="24"
            stroke="url(#gradient-unknown)"
            strokeOpacity="0.3"
            strokeWidth="1"
            transition={{ delay: 0.5, duration: 0.4 }}
          />

          {/* Inner circle */}
          <motion.circle
            animate={{ scale: 1 }}
            className="fill-white dark:fill-neutral-900 stroke-neutral-200 dark:stroke-neutral-700"
            cx={center.x}
            cy={center.y}
            initial={{ scale: 0 }}
            r="16"
            strokeWidth="2"
            transition={{ delay: 0.6, duration: 0.3, type: "spring" }}
          />

          {/* Center icon */}
          <motion.g
            animate={{ scale: 1, opacity: 1 }}
            initial={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            <path
              className="text-accent-500"
              d={`M ${center.x - 5} ${center.y - 3} l10 0 M ${center.x} ${center.y - 8} l0 10`}
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </motion.g>

          {/* Pulse animation */}
          <motion.circle
            animate={{ scale: 1.5, opacity: 0 }}
            className="stroke-accent-500"
            cx={center.x}
            cy={center.y}
            fill="none"
            initial={{ scale: 1, opacity: 0.5 }}
            r="16"
            strokeWidth="2"
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeOut",
            }}
          />
        </g>
      )}
    </svg>
  );
}
