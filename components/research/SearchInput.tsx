"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Square, ImagePlus, X } from "lucide-react";

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

interface SearchInputProps {
  onSearch: (query: string, images?: string[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  suggestedQuery?: string;
  onSuggestedQueryApplied?: () => void;
  onSettings?: () => void;
}

export function SearchInput({
  onSearch,
  onCancel,
  isLoading,
  suggestedQuery,
  onSuggestedQueryApplied,
  onSettings,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const lastSubmittedQuery = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const onSearchRef = useRef(onSearch);
  const onSuggestedQueryAppliedRef = useRef(onSuggestedQueryApplied);

  useEffect(() => {
    onSearchRef.current = onSearch;
    onSuggestedQueryAppliedRef.current = onSuggestedQueryApplied;
  }, [onSearch, onSuggestedQueryApplied]);

  useEffect(() => {
    if (suggestedQuery && suggestedQuery !== lastSubmittedQuery.current) {
      lastSubmittedQuery.current = suggestedQuery;
      setQuery(suggestedQuery);
      onSearchRef.current(suggestedQuery);
      onSuggestedQueryAppliedRef.current?.();
    }
  }, [suggestedQuery]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");

  const hasContent = query.trim() || images.length > 0;

  const submitSearch = useCallback((q: string, imgs: typeof images) => {
    const base64Images = imgs.length > 0 ? imgs.map((i) => i.base64) : undefined;
    onSearch(q, base64Images);
    setQuery("");
    setImages([]);
    setImageError(null);
  }, [onSearch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasContent) return;

    if (isLoading) {
      setPendingQuery(query.trim());
      setShowConfirmDialog(true);
    } else {
      submitSearch(query.trim(), images);
    }
  };

  const handleConfirm = () => {
    onCancel?.();
    const currentImages = images;
    setTimeout(() => {
      submitSearch(pendingQuery, currentImages);
      setPendingQuery("");
      setShowConfirmDialog(false);
    }, 100);
  };

  const handleCancelDialog = () => {
    setPendingQuery("");
    setShowConfirmDialog(false);
  };

  const handleStopClick = () => {
    onCancel?.();
  };

  const addImageFiles = useCallback(async (files: File[]) => {
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
  }, [images.length]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) {
      e.preventDefault();
      await addImageFiles(imageFiles);
    }
  }, [addImageFiles]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await addImageFiles(files);
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addImageFiles]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
    setImageError(null);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none focus-within:border-neutral-300 dark:focus-within:border-neutral-700 focus-within:shadow-md dark:focus-within:shadow-none transition-all" onPaste={handlePaste}>
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
              <ImagePlus className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />
            </button>

            <input
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              multiple
              type="file"
              onChange={handleImageSelect}
            />

            <input
              className="flex-1 bg-transparent text-base sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
              placeholder={
                isLoading ? t("search.placeholderLoading") : t("search.placeholder")
              }
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {isLoading ? (
              <button
                className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors bg-red-500 hover:bg-red-600 text-white"
                title={t("search.stopResearch")}
                type="button"
                onClick={handleStopClick}
              >
                <Square className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" />
              </button>
            ) : (
              <button
                className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                  hasContent
                    ? "bg-neutral-100 dark:bg-neutral-800 text-accent-600 dark:text-accent-400"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                }`}
                disabled={!hasContent}
                type="submit"
              >
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
              </button>
            )}
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

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={handleCancelDialog}
            />

            {/* Mobile: Bottom sheet */}
            <motion.div
              animate={{ y: 0 }}
              className="sm:hidden fixed inset-x-0 bottom-0 bg-white dark:bg-neutral-900 z-50 rounded-t-3xl shadow-2xl overflow-hidden"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
              </div>

              <div className="px-5 pt-2 pb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {t("search.newSearchTitle")}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("search.newSearchDesc")}
                </p>
              </div>

              <div className="px-5 pb-8 flex flex-col gap-2">
                <button
                  className="w-full py-3.5 text-base font-medium text-white bg-red-500 hover:bg-red-600 rounded-3xl transition-colors"
                  type="button"
                  onClick={handleConfirm}
                >
                  {t("search.stopAndSearch")}
                </button>
                <button
                  className="w-full py-3.5 text-base text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-3xl transition-colors"
                  type="button"
                  onClick={handleCancelDialog}
                >
                  {t("search.cancel")}
                </button>
              </div>
            </motion.div>

            {/* Desktop: Centered dialog */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-neutral-900 z-50 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-sm w-full overflow-hidden"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="p-5">
                <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  {t("search.newSearchTitle")}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("search.newSearchDesc")}
                </p>
              </div>

              <div className="flex border-t border-neutral-200 dark:border-neutral-800">
                <button
                  className="flex-1 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  type="button"
                  onClick={handleCancelDialog}
                >
                  {t("search.cancel")}
                </button>
                <div className="w-px bg-neutral-200 dark:bg-neutral-800" />
                <button
                  className="flex-1 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  type="button"
                  onClick={handleConfirm}
                >
                  {t("search.stopAndSearch")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
