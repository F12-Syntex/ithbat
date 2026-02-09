"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type MenuItem =
  | {
      label: string;
      icon?: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      divider?: false;
    }
  | {
      divider: true;
      label?: never;
      icon?: never;
      onClick?: never;
      disabled?: never;
    };

interface ContextMenuProps {
  items: MenuItem[];
  children: ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // Track the last focused input before the context menu steals focus
  const lastFocusedInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Capture the currently focused input before the menu opens
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      lastFocusedInput.current = active;
    }

    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 300);

    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Expose the last focused input ref via a data attribute on the container
  // so paste handlers can find the right input
  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (item.divider || item.disabled) return;

      // Before running the click handler, restore focus to the last input
      // so paste operations target the right element
      if (lastFocusedInput.current) {
        lastFocusedInput.current.focus();
      }

      // Small delay to let focus settle before the handler reads activeElement
      setTimeout(() => {
        item.onClick?.();
        handleClose();
      }, 10);
    },
    [handleClose],
  );

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-50"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            style={{ left: position.x, top: position.y }}
            transition={{ duration: 0.1 }}
          >
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden min-w-[180px]">
              {items.map((item, index) =>
                item.divider ? (
                  <div
                    key={index}
                    className="h-px bg-neutral-100 dark:bg-neutral-800 my-1"
                  />
                ) : (
                  <button
                    key={index}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                      item.disabled
                        ? "text-neutral-400 cursor-not-allowed"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    disabled={item.disabled}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
