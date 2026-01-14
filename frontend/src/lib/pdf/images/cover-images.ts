/**
 * Cover image resolver for document cover page
 */

import type { ValuationData } from "@/types/valuation";

/**
 * Image entry from uploads or propertyImages array.
 */
interface ImageEntry {
  type?: string;
  preview?: string;
  url?: string;
  path?: string;
  signedUrl?: string;
  fileUrl?: string;
  absoluteUrl?: string;
}

/**
 * Picks the first valid non-empty string from a value.
 */
const pickFirstValid = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Resolves cover image sources from valuation data.
 * Checks multiple locations in priority order:
 * 1. selectedImagePreview (explicitly selected)
 * 2. Direct cover fields (coverImage, coverPhoto, etc.)
 * 3. propertyImages with building_image type
 * 4. uploads with building_image type
 *
 * @param data - The valuation data
 * @returns Array of image URLs (usually 0 or 1)
 */
export const resolveCoverImageSources = (data: ValuationData): string[] => {
  // Check explicitly selected image
  const fromSelected = pickFirstValid(
    (data as ValuationData & { selectedImagePreview?: string })
      .selectedImagePreview,
  );
  if (fromSelected) {
    return [fromSelected];
  }

  // Check direct cover fields
  const extendedData = data as ValuationData & {
    coverImage?: string;
    coverPhoto?: string;
    coverPhotoUrl?: string;
    cover_image?: string;
    cover_photo?: string;
  };

  const directFields = [
    extendedData.coverImage,
    extendedData.coverPhoto,
    extendedData.coverPhotoUrl,
    extendedData.cover_image,
    extendedData.cover_photo,
  ];
  for (const field of directFields) {
    const found = pickFirstValid(field);
    if (found) {
      return [found];
    }
  }

  // Check propertyImages array (cast to ImageEntry[] since data.propertyImages is File[] but may contain image objects at runtime)
  const propertyImages = Array.isArray(data.propertyImages)
    ? (data.propertyImages as unknown as ImageEntry[])
    : [];

  const propertyPriority = [
    propertyImages.filter(
      (entry) =>
        (entry?.type || "").toString().toLowerCase() === "building_image",
    ),
    propertyImages.filter((entry) => !entry?.type),
  ];

  for (const group of propertyPriority) {
    for (const entry of group) {
      if (!entry) continue;
      const sources = [
        pickFirstValid(entry.preview),
        pickFirstValid(entry.url),
        pickFirstValid(entry.path),
        pickFirstValid(entry.signedUrl),
      ];
      const found = sources.find(Boolean);
      if (found) {
        return [found];
      }
    }
  }

  // Check uploads array
  const uploads = Array.isArray(
    (data as ValuationData & { uploads?: unknown[] }).uploads,
  )
    ? ((data as ValuationData & { uploads?: unknown[] })
        .uploads as ImageEntry[])
    : [];

  const uploadPriority = [
    uploads.filter(
      (upload) =>
        (upload?.type || "").toString().toLowerCase() === "building_image",
    ),
    uploads.filter((upload) => !upload?.type),
  ];

  for (const group of uploadPriority) {
    for (const upload of group) {
      if (!upload) continue;
      const sources = [
        pickFirstValid(upload.preview),
        pickFirstValid(upload.url),
        pickFirstValid(upload.path),
        pickFirstValid(upload.fileUrl),
        pickFirstValid(upload.absoluteUrl),
      ];
      const found = sources.find(Boolean);
      if (found) {
        return [found];
      }
    }
  }

  return [];
};
