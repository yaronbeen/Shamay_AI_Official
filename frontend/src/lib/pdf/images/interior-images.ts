/**
 * Interior images collector for property photos section
 */

import type { ValuationData } from "@/types/valuation";

/**
 * Upload entry with status tracking.
 */
interface UploadEntry {
  type?: string;
  status?: string;
  url?: string;
  signedUrl?: string;
  path?: string;
  fileUrl?: string;
  absoluteUrl?: string;
  preview?: string;
}

/**
 * Validates if an image URL is valid and accessible.
 */
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  // Filter out empty strings
  if (!trimmed) return false;

  // Filter out placeholder indicators
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("[") ||
    trimmed.includes("לא זמין")
  ) {
    return false;
  }

  // Must be a valid URL or data URI
  if (
    !trimmed.startsWith("http") &&
    !trimmed.startsWith("/") &&
    !trimmed.startsWith("data:")
  ) {
    return false;
  }

  // Check if it looks like a valid image extension or blob URL
  const hasValidExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(
    trimmed,
  );
  const isBlobUrl =
    trimmed.includes("blob.vercel-storage.com") ||
    trimmed.includes("/api/files/");
  const isDataUri = trimmed.startsWith("data:image/");

  return hasValidExtension || isBlobUrl || isDataUri;
};

/**
 * Determines if a URL is base64 (large data URI).
 */
const isBase64 = (url: string): boolean => {
  return url.startsWith("data:image/");
};

/**
 * Gets the best URL from an upload entry.
 * Priority: url (blob) > signedUrl > path > fileUrl > absoluteUrl > preview (base64 - last resort)
 */
const getBestUrlFromEntry = (entry: UploadEntry): string | null => {
  if (!entry) return null;

  // Try blob URLs first (preferred - smaller, faster, persistent)
  const candidates = [
    entry.url,
    entry.signedUrl,
    entry.path,
    entry.fileUrl,
    entry.absoluteUrl,
    entry.preview, // base64 - only use as last resort
  ];

  // First pass: find non-base64 URLs
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "string" &&
      isValidImageUrl(candidate) &&
      !isBase64(candidate)
    ) {
      return candidate.trim();
    }
  }

  // Second pass: try base64 as last resort
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "string" &&
      isValidImageUrl(candidate)
    ) {
      return candidate.trim();
    }
  }

  return null;
};

/**
 * Checks if upload type is interior category.
 */
const isInteriorType = (value?: string): boolean => {
  const type = (value || "").toString().toLowerCase();
  return (
    type === "interior_image" ||
    type === "interior" ||
    type === "room" ||
    type === "living_room"
  );
};

/**
 * Collects interior images from valuation data.
 * Uses uploads array as single source of truth, with fallback to interiorImages.
 *
 * @param data - The valuation data
 * @returns Array of unique interior image URLs (max 6)
 */
export const collectInteriorImages = (data: ValuationData): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  const add = (value?: string | null): void => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed) || !isValidImageUrl(trimmed)) {
      return;
    }
    seen.add(trimmed);
    results.push(trimmed);
  };

  // SINGLE SOURCE OF TRUTH: Use uploads array (most up-to-date and has status tracking)
  const rawUploads = (data as ValuationData & { uploads?: unknown[] }).uploads;
  const uploads: UploadEntry[] = Array.isArray(rawUploads)
    ? (rawUploads as UploadEntry[])
    : [];

  const interiorUploads = uploads.filter((entry: UploadEntry) => {
    // Only include completed uploads of interior type
    return entry.status === "completed" && isInteriorType(entry?.type);
  });

  // Get the best URL for each upload (ONE URL per upload, not duplicates)
  interiorUploads.forEach((upload) => {
    const bestUrl = getBestUrlFromEntry(upload);
    if (bestUrl) {
      add(bestUrl);
    }
  });

  // FALLBACK: If no uploads found, try interiorImages array (for backward compatibility)
  if (results.length === 0) {
    const interiorArrays: Array<string[] | undefined> = [
      Array.isArray(
        (data as ValuationData & { interiorImages?: string[] }).interiorImages,
      )
        ? (data as ValuationData & { interiorImages?: string[] }).interiorImages
        : undefined,
    ];

    interiorArrays.forEach((array) => {
      if (!array) return;
      array.forEach(add);
    });
  }

  // Return only valid images (up to 6)
  return results.filter(isValidImageUrl).slice(0, 6);
};
