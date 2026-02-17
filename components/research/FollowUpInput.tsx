"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ImagePlus, X } from "lucide-react";

import { useTranslation } from "@/lib/i18n";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface FollowUpInputProps {
  onSubmit: (question: string, images?: string[]) => void;
  isLoading?: boolean;
  previousQuery: string;
}

// Generate contextual follow-up suggestion keys based on the query
function getSuggestionKeys(query: string): string[] {
  const q = query.toLowerCase();
  const keys: string[] = [];

  if (
    q.includes("halal") ||
    q.includes("haram") ||
    q.includes("permissible") ||
    q.includes("allowed")
  ) {
    keys.push(
      "suggest.conditions",
      "suggest.differences",
      "suggest.quranEvidence",
    );
  } else if (
    q.includes("prayer") ||
    q.includes("salah") ||
    q.includes("salat")
  ) {
    keys.push("suggest.validity", "suggest.invalidates", "suggest.sunnah");
  } else if (q.includes("hadith")) {
    keys.push(
      "suggest.authentic",
      "suggest.scholarsHadith",
      "suggest.relatedHadith",
    );
  } else if (
    q.includes("quran") ||
    q.includes("surah") ||
    q.includes("ayah") ||
    q.includes("verse")
  ) {
    keys.push("suggest.tafsir", "suggest.revelation", "suggest.relatedVerses");
  } else if (q.includes("zakat") || q.includes("charity")) {
    keys.push("suggest.calculated", "suggest.eligible", "suggest.whenPaid");
  } else if (
    q.includes("fasting") ||
    q.includes("ramadan") ||
    q.includes("sawm")
  ) {
    keys.push("suggest.breaksFast", "suggest.exemptions", "suggest.fidyah");
  } else if (
    q.includes("marriage") ||
    q.includes("nikah") ||
    q.includes("spouse") ||
    q.includes("husband") ||
    q.includes("wife")
  ) {
    keys.push("suggest.rights", "suggest.scholarsSay", "suggest.quranSunnah");
  } else {
    keys.push(
      "suggest.hadithEvidence",
      "suggest.differentOpinions",
      "suggest.moreDetail",
    );
  }

  return keys.slice(0, 3);
}

export function FollowUpInput({
  onSubmit,
  isLoading,
  previousQuery,
}: FollowUpInputProps) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<
    { file: File; preview: string; base64: string }[]
  >([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const suggestionKeys = useMemo(
    () => getSuggestionKeys(previousQuery),
    [previousQuery],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const hasContent = value.trim() || images.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContent || isLoading) return;
    const base64Images =
      images.length > 0 ? images.map((i) => i.base64) : undefined;

    onSubmit(value.trim(), base64Images);
    setValue("");
    setImages([]);
    setImageError(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSubmit(suggestion);
    }
  };

  const addImageFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setImageError(null);
      const remaining = MAX_IMAGES - images.length;
      const toAdd = files.slice(0, remaining);

      if (files.length > remaining) {
        setImageError(`Max ${MAX_IMAGES} images`);
      }
      for (const file of toAdd) {
        if (file.size > MAX_IMAGE_SIZE) {
          setImageError(`${file.name} exceeds 4MB limit`);
          continue;
        }
        try {
          const base64 = await fileToBase64(file);
          const preview = URL.createObjectURL(file);

          setImages((prev) => [...prev, { file, preview, base64 }]);
        } catch {
          setImageError(`Failed to read ${file.name}`);
        }
      }
    },
    [images.length],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (imageFiles.length > 0) {
        e.preventDefault();
        await addImageFiles(imageFiles);
      }
    },
    [addImageFiles],
  );

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      await addImageFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addImageFiles],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);

      return prev.filter((_, i) => i !== index);
    });
    setImageError(null);
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 sm:mt-6"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-3.5 h-3.5 text-accent-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {t("research.askFollowUp")}
        </span>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {suggestionKeys.map((key, i) => {
          const text = t(key);

          return (
            <motion.button
              key={key}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-accent-300 dark:hover:border-accent-700 hover:text-accent-600 dark:hover:text-accent-400 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
              disabled={isLoading}
              initial={{ opacity: 0, y: 6 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              type="button"
              onClick={() => handleSuggestionClick(text)}
            >
              {text}
            </motion.button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none focus-within:border-neutral-300 dark:focus-within:border-neutral-700 focus-within:shadow-md dark:focus-within:shadow-none transition-all"
          onPaste={handlePaste}
        >
          {/* Image previews */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="flex gap-2 px-3 sm:px-4 pt-2.5 sm:pt-3 overflow-x-auto"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                {images.map((img, i) => (
                  <motion.div
                    key={img.preview}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex-shrink-0 group/img"
                    exit={{ opacity: 0, scale: 0.8 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                  >
                    <img
                      alt={`Upload ${i + 1}`}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-neutral-200/80 dark:border-neutral-700"
                      src={img.preview}
                    />
                    <button
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      type="button"
                      onClick={() => removeImage(i)}
                    >
                      <X className="w-2.5 h-2.5" strokeWidth={3} />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
            {/* Image upload button */}
            <button
              className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                images.length >= MAX_IMAGES
                  ? "text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                  : "text-neutral-400 hover:text-accent-500 dark:hover:text-accent-400"
              }`}
              disabled={images.length >= MAX_IMAGES || isLoading}
              title="Add image"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus
                className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                strokeWidth={1.5}
              />
            </button>

            <input
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              type="file"
              onChange={handleImageSelect}
            />

            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-base sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
              disabled={isLoading}
              placeholder={`${t("research.followUp")} "${previousQuery.slice(0, 30)}${previousQuery.length > 30 ? "..." : ""}"...`}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />

            <button
              className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                hasContent
                  ? "bg-neutral-100 dark:bg-neutral-800 text-accent-600 dark:text-accent-400"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
              }`}
              disabled={!hasContent || isLoading}
              type="submit"
            >
              <ArrowRight
                className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Image error */}
        <AnimatePresence>
          {imageError && (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-500 mt-1.5 ml-3"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: -4 }}
            >
              {imageError}
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
