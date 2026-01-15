"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Star,
  Loader2,
  AlertTriangle,
  Brain,
  Clock,
} from "lucide-react";
import { DataSource } from "../ui/DataSource";
import type {
  ProcessingStatus,
  ProcessingStatusType,
} from "../../lib/session-store-global";
import type { ValuationData, ExtractedData } from "../../types/valuation";

// Production-safe logger - only logs in development mode
const isDev = process.env.NODE_ENV === "development";
const devLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

interface DocumentUpload {
  id: string;
  file: File;
  type:
    | "tabu"
    | "permit"
    | "condo"
    | "planning"
    | "building_image"
    | "interior_image";
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  extractedData?: ExtractedData;
  error?: string;
  preview?: string;
  url?: string;
  path?: string;
  isSelected?: boolean;
  previewReady?: boolean;
}

interface Step2DocumentsProps {
  data: ValuationData;
  // NOTE: Using Record<string, unknown> because actual values don't match
  // ValuationData exactly (e.g., propertyImages is File[] but we pass URL objects)
  updateData: (updates: Record<string, unknown>) => void;
  onValidationChange: (isValid: boolean) => void;
  sessionId?: string;
}

const DOCUMENT_TYPES = {
  tabu: {
    label: "נסח טאבו",
    description: "נסח רישום מקרקעין",
    icon: FileText,
    color: "blue",
    required: false,
  },
  permit: {
    label: "היתר בניה",
    description: "היתר בניה ותשריט",
    icon: FileText,
    color: "blue",
    required: false,
  },
  condo: {
    label: "צו בית משותף",
    description: "צו בית משותף",
    icon: FileText,
    color: "blue",
    required: false,
  },
  planning: {
    label: "מידע תכנוני",
    description: "מידע תכנוני נוסף",
    icon: FileText,
    color: "blue",
    required: false,
  },
  building_image: {
    label: "תמונת חזית הבניין",
    description: "תמונת החזית/שער הכניסה (תוצג בראש הדוח)",
    icon: Image,
    color: "blue",
    required: false,
  },
  interior_image: {
    label: "תמונות פנים הדירה",
    description: "תמונות פנים הדירה (עד 6 תמונות)",
    icon: Image,
    color: "blue",
    required: false,
  },
};

export function Step2Documents({
  data,
  updateData,
  onValidationChange,
  sessionId,
}: Step2DocumentsProps) {
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // AI Extraction state
  const [existingAIExtraction, setExistingAIExtraction] = useState<any>(null);
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false);
  const [selectiveReprocess, setSelectiveReprocess] = useState({
    tabu: false,
    permit: false,
    condo: false,
    images: false,
  });

  // Background processing status (per document type)
  const [backgroundProcessing, setBackgroundProcessing] =
    useState<ProcessingStatus>({
      tabu: "pending",
      condo: "pending",
      permit: "pending",
    });

  // Keep a ref to track Object URLs for cleanup on unmount
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup all Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Load uploads from session on mount
  useEffect(() => {
    const loadUploadsFromSession = async () => {
      if (sessionId) {
        try {
          const response = await fetch(`/api/session/${sessionId}`);
          if (response.ok) {
            const sessionData = await response.json();
            devLog("📁 Session data received:", sessionData);

            // The uploads are nested under sessionData.data.uploads
            const uploads =
              sessionData.data?.uploads || sessionData.uploads || [];
            if (Array.isArray(uploads) && uploads.length > 0) {
              devLog("📁 Loading uploads from session:", uploads);

              // Convert session uploads to DocumentUpload format
              const sessionUploads: DocumentUpload[] = await Promise.all(
                uploads.map(async (upload: any) => {
                  // Handle incomplete upload data (from before the fix)
                  const fileName =
                    upload.fileName ||
                    upload.extractedData?.fileName ||
                    "unknown_file";
                  let fileSize = upload.size || 0;
                  const mimeType =
                    upload.mimeType || "application/octet-stream";
                  const uploadName = upload.name || fileName;
                  const uploadPath =
                    upload.path || upload.extractedData?.filePath || "";
                  const uploadDate =
                    upload.uploadedAt || new Date().toISOString();
                  const uploadUrl = upload.url || upload.preview || "";

                  // If file size is not in database, try to get it from the file
                  if (fileSize === 0 && uploadUrl) {
                    try {
                      const response = await fetch(uploadUrl, {
                        method: "HEAD",
                      });
                      if (response.ok) {
                        const contentLength =
                          response.headers.get("content-length");
                        if (contentLength) {
                          fileSize = parseInt(contentLength);
                          devLog(
                            `📁 Got file size from HTTP headers: ${fileSize} bytes`,
                          );
                        }
                      }
                    } catch (error) {
                      console.warn(
                        "⚠️ Could not get file size from HTTP headers:",
                        error,
                      );
                    }
                  }

                  // Create a file object with the correct size from the database
                  const fileBlob = new Blob([], { type: mimeType });
                  const file = new File([fileBlob], uploadName, {
                    type: mimeType,
                    lastModified: new Date(uploadDate).getTime(),
                  });

                  // Override the size property to use the database value
                  Object.defineProperty(file, "size", {
                    value: fileSize,
                    writable: false,
                  });

                  // CRITICAL FIX: For images, set preview and previewReady from URL
                  // This ensures images show up after page refresh
                  const isImageType =
                    upload.type === "building_image" ||
                    upload.type === "interior_image";
                  const hasValidUrl =
                    uploadUrl &&
                    uploadUrl.trim().length > 0 &&
                    uploadUrl !== "data:,";

                  devLog(
                    `📁 Loading upload ${upload.id}: type=${upload.type}, hasValidUrl=${hasValidUrl}, url=${uploadUrl?.substring(0, 50)}...`,
                  );

                  return {
                    id: upload.id,
                    file: file,
                    type: upload.type as any,
                    status: upload.status || ("completed" as const), // Use status from DB, fallback to 'completed'
                    progress:
                      upload.status === "processing"
                        ? 50
                        : upload.status === "uploading"
                          ? 25
                          : 100,
                    url: uploadUrl,
                    // CRITICAL: Set preview and previewReady for images so they display after refresh
                    preview: isImageType && hasValidUrl ? uploadUrl : undefined,
                    previewReady: isImageType && hasValidUrl ? true : false,
                    extractedData: upload.extractedData || {},
                    error: upload.error,
                    isSelected: upload.isSelected || false,
                    // Preserve original upload data (with fallbacks)
                    name: uploadName,
                    fileName: fileName,
                    path: uploadPath,
                    size: fileSize,
                    mimeType: mimeType,
                    uploadedAt: uploadDate,
                  };
                }),
              );

              devLog(`📁 Loaded ${sessionUploads.length} uploads from session`);
              devLog(
                `📁 Image uploads:`,
                sessionUploads
                  .filter(
                    (u) =>
                      u.type === "building_image" ||
                      u.type === "interior_image",
                  )
                  .map((u) => ({
                    id: u.id,
                    type: u.type,
                    hasPreview: !!u.preview,
                    previewReady: u.previewReady,
                    url: u.url?.substring(0, 50),
                  })),
              );

              setUploads(sessionUploads);

              // CRITICAL: Initialize image data after loading from session
              // Use setTimeout to ensure state is updated before calling updateImageData
              setTimeout(() => {
                devLog("📁 Initializing image data from session uploads...");
                updateImageData(sessionUploads);
              }, 100);
            } else {
              devLog("📁 No uploads found in session data");
            }
          }
        } catch (error) {
          console.error("❌ Error loading uploads from session:", error);
        }
      }
    };

    loadUploadsFromSession();
  }, [sessionId, updateData]);

  // Load existing AI extractions
  useEffect(() => {
    const checkExistingAIExtraction = async () => {
      if (!sessionId) return;

      try {
        const response = await fetch(
          `/api/session/${sessionId}/ai-extractions?type=combined`,
        );
        if (response.ok) {
          const { extractions } = await response.json();
          if (extractions && extractions.length > 0) {
            const latestExtraction = extractions[0];
            setExistingAIExtraction(latestExtraction);
            devLog("📚 Found existing AI extraction:", latestExtraction);
          }
        }
      } catch (error) {
        console.error("❌ Error checking for existing AI extractions:", error);
      }
    };

    checkExistingAIExtraction();
  }, [sessionId]);

  const getUploadsByType = (type: string) => {
    return uploads.filter((upload) => upload.type === type);
  };

  // Trigger background processing for a document type (fire-and-forget)
  const triggerBackgroundProcessing = async (
    docType: "tabu" | "condo" | "permit",
  ) => {
    if (!sessionId) return;

    // Guard: Don't trigger if already processing this doc type
    if (backgroundProcessing[docType] === "processing") {
      devLog(`⚠️ ${docType} already processing, skipping duplicate trigger`);
      return;
    }

    devLog(`🚀 Triggering background processing for ${docType}`);

    // Update local status
    setBackgroundProcessing((prev) => ({
      ...prev,
      [docType]: "processing" as ProcessingStatusType,
    }));

    try {
      // Fire-and-forget - don't await the processing, just trigger it
      fetch(`/api/session/${sessionId}/process-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType }),
      })
        .then((response) => {
          if (!response.ok) {
            console.error(`❌ Failed to trigger processing for ${docType}`);
            setBackgroundProcessing((prev) => ({
              ...prev,
              [docType]: "error" as ProcessingStatusType,
            }));
          }
        })
        .catch((error) => {
          console.error(
            `❌ Error triggering processing for ${docType}:`,
            error,
          );
          setBackgroundProcessing((prev) => ({
            ...prev,
            [docType]: "error" as ProcessingStatusType,
          }));
        });

      devLog(`✅ Background processing triggered for ${docType}`);
    } catch (error) {
      console.error(
        `❌ Error triggering background processing for ${docType}:`,
        error,
      );
    }
  };

  // Poll for processing status updates with exponential backoff
  useEffect(() => {
    if (!sessionId) return;

    // Check if any document is processing
    const hasProcessing = Object.values(backgroundProcessing).some(
      (s) => s === "processing",
    );
    if (!hasProcessing) return;

    devLog("🔄 Starting processing status polling...");

    let pollDelay = 1000; // Start at 1s
    const maxDelay = 5000; // Max 5s between polls
    let timeoutId: NodeJS.Timeout;
    const abortController = new AbortController();

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/session/${sessionId}/processing-status`,
          { signal: abortController.signal },
        );
        if (response.ok) {
          const {
            processingStatus,
            allComplete,
            extractedData: newData,
          } = await response.json();

          // Update local status
          setBackgroundProcessing(processingStatus);

          // If we have new extracted data, update it
          if (newData && Object.keys(newData).length > 0) {
            devLog(
              "📦 Received extracted data from background processing:",
              Object.keys(newData),
            );
            // Use functional update to avoid stale closure issue
            setExtractedData((prev: any) => {
              const merged = { ...prev, ...newData };
              updateData({ extractedData: merged });
              return merged;
            });
          }

          // Stop polling if all complete
          if (allComplete) {
            devLog("✅ All background processing complete");
            return; // Don't schedule next poll
          }

          // Reset delay on success
          pollDelay = 1000;
        } else if (response.status === 429) {
          // Rate limited - back off more aggressively
          pollDelay = Math.min(pollDelay * 2, maxDelay);
        }
      } catch (error) {
        // Ignore abort errors - they're expected on cleanup
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("❌ Error polling processing status:", error);
        // Exponential backoff on error
        pollDelay = Math.min(pollDelay * 1.5, maxDelay);
      }

      // Schedule next poll
      timeoutId = setTimeout(poll, pollDelay);
    };

    // Start polling
    poll();

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
    // Note: extractedData removed from deps - the functional update pattern handles stale closures
    // and having it here causes the effect to restart on every data update, creating a tight polling loop
  }, [sessionId, backgroundProcessing, updateData]);

  // Process documents using AI services
  const processDocuments = async (
    reprocessSelection?: typeof selectiveReprocess,
  ) => {
    if (!sessionId) return;

    setIsProcessing(true);
    setProcessingProgress(8);
    setProcessingStage("מכין את המסמכים לעיבוד");
    setShowReprocessConfirm(false);

    try {
      // Check which document types were uploaded
      const uploadedTypes = new Set(
        data.uploads?.map((upload: any) => upload.type) || [],
      );
      devLog("📋 Uploaded document types:", Array.from(uploadedTypes));

      // If reprocessSelection is provided, only process selected types
      // Otherwise, process all uploaded types
      const shouldProcess = reprocessSelection || {
        tabu: uploadedTypes.has("tabu"),
        permit: uploadedTypes.has("permit"),
        condo: uploadedTypes.has("condo"),
        images:
          uploadedTypes.has("building_image") ||
          uploadedTypes.has("interior_image"),
      };

      devLog("🔄 Reprocessing selection:", shouldProcess);

      // Only call APIs for selected document types
      type ProcessingTask = {
        type: "tabu" | "permit" | "condo" | "images";
        label: string;
        run: () => Promise<any>;
      };

      const tasks: ProcessingTask[] = [];

      if (uploadedTypes.has("tabu") && shouldProcess.tabu) {
        devLog("🏛️ Enqueue land registry analysis task");
        tasks.push({
          type: "tabu",
          label: "חילוץ נתוני טאבו",
          run: extractLandRegistryData,
        });
      }

      if (uploadedTypes.has("permit") && shouldProcess.permit) {
        devLog("🏗️ Enqueue building permit analysis task");
        tasks.push({
          type: "permit",
          label: "חילוץ נתוני היתר בנייה",
          run: extractBuildingPermitData,
        });
      }

      if (uploadedTypes.has("condo") && shouldProcess.condo) {
        devLog("🏢 Enqueue shared building analysis task");
        tasks.push({
          type: "condo",
          label: "חילוץ נתוני צו בית משותף",
          run: extractSharedBuildingData,
        });
      }

      if (
        (uploadedTypes.has("building_image") ||
          uploadedTypes.has("interior_image")) &&
        shouldProcess.images
      ) {
        devLog("📸 Enqueue image analysis task");
        tasks.push({
          type: "images",
          label: "ניתוח חזית ותמונות פנים",
          run: extractImageAnalysisData,
        });
      }

      // If no relevant documents selected for processing, show message
      if (tasks.length === 0) {
        devLog("⚠️ No documents selected for AI analysis");
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStage(null);
        return;
      }

      devLog(`🚀 Processing ${tasks.length} document types with AI...`);
      setProcessingStage("שולח מסמכים לניתוח AI");
      setProcessingProgress(12);

      // If reprocessing selectively, fetch latest data from database first
      let baseData = {};
      if (reprocessSelection) {
        devLog(
          "🔄 Selective reprocess - fetching latest data from database first...",
        );
        try {
          const sessionResponse = await fetch(`/api/session/${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            baseData =
              sessionData.data?.extractedData ||
              sessionData.extractedData ||
              {};
            devLog("✅ Loaded base data from database:", Object.keys(baseData));
          }
        } catch (error) {
          console.error(
            "❌ Failed to load base data, using local state:",
            error,
          );
          baseData = { ...extractedData };
        }
      }

      // Execute ALL tasks in PARALLEL for faster processing
      devLog(
        `🚀 Starting PARALLEL processing of ${tasks.length} document types...`,
      );
      setProcessingStage("מעבד את כל המסמכים במקביל...");
      setProcessingProgress(20);

      // Create promises that run in parallel
      const taskPromises = tasks.map(async (task) => {
        try {
          devLog(`🚀 Starting parallel task: ${task.type}`);
          const value = await task.run();
          devLog(`✅ Task ${task.type} completed successfully`);
          return { type: task.type, status: "fulfilled" as const, value };
        } catch (error) {
          console.error(`❌ Task ${task.type} failed:`, error);
          return {
            type: task.type,
            status: "rejected" as const,
            reason: error,
          };
        }
      });

      // Wait for ALL tasks to complete in parallel
      const promiseResults = await Promise.allSettled(taskPromises);

      // Extract results from Promise.allSettled
      const results: Array<{
        type: ProcessingTask["type"];
        status: "fulfilled" | "rejected";
        value?: any;
        reason?: any;
      }> = promiseResults.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            type: tasks[index].type,
            status: "rejected",
            reason: result.reason,
          };
        }
      });

      devLog(`✅ All ${tasks.length} tasks completed in parallel`);
      setProcessingProgress(80);

      // Start with base data (from DB if selective, empty if full reprocess)
      const combinedData: any = { ...baseData };

      devLog(
        "🔄 Starting with base data:",
        reprocessSelection
          ? "FROM DATABASE (selective)"
          : "EMPTY (full process)",
      );
      devLog("🔄 Base data keys:", Object.keys(combinedData));

      setProcessingStage("מאחד תוצאות מהמקורות השונים");
      setProcessingProgress((prev) => Math.max(prev, 82));

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          devLog(`📦 Merging result for ${result.type}:`, result.value);
          Object.assign(combinedData, result.value);
        } else if (result.status === "rejected") {
          console.error(`❌ Task ${result.type} failed:`, result.reason);
        }
      });

      devLog("📦 Final combined data after merging all results:", combinedData);
      devLog("📦 Combined data keys:", Object.keys(combinedData));

      setExtractedData(combinedData);

      // Update parent data - only update extractedData to avoid overwriting other data
      devLog(
        "📊 About to update parent data with extracted data:",
        JSON.stringify(combinedData, null, 2),
      );
      updateData({
        extractedData: combinedData,
      });
      devLog("📊 Updated parent data with extracted data");
      devLog(
        "📊 Extracted data keys in combinedData:",
        Object.keys(combinedData),
      );

      setProcessingStage("שומר נתונים לסשן");
      setProcessingProgress((prev) => Math.max(prev, 90));

      // Save extracted data to session AND save original AI extractions separately
      if (sessionId) {
        try {
          const savePayload = {
            data: {
              extractedData: combinedData,
            },
          };
          devLog(
            "💾 Saving to session API. Payload:",
            JSON.stringify(savePayload, null, 2),
          );

          const response = await fetch(`/api/session/${sessionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(savePayload),
          });

          if (response.ok) {
            const savedData = await response.json();
            devLog("✅ Extracted data saved to session successfully");
            devLog("✅ Server response:", savedData);
            devLog("✅ Keys that were saved:", Object.keys(combinedData));
          } else {
            const errorText = await response.text();
            console.error(
              "❌ Failed to save extracted data to session:",
              response.status,
              errorText,
            );
          }

          // Also save original AI extractions for potential revert
          devLog("💾 Saving original AI extractions for future revert...");
          await fetch(`/api/session/${sessionId}/ai-extractions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              extractionType: "combined",
              extractedFields: combinedData,
              metadata: {
                extractionDate: new Date().toISOString(),
                documentTypes: Array.from(uploadedTypes),
              },
            }),
          });
          devLog("✅ Original AI extractions saved for revert capability");
        } catch (error) {
          console.error("❌ Error saving extracted data to session:", error);
        }
      }

      setProcessingStage("העיבוד הושלם בהצלחה");
      setProcessingProgress(100);
      toast.success("העיבוד הושלם בהצלחה! הנתונים נשמרו.");
    } catch (error) {
      console.error("Error processing documents:", error);
      setProcessingStage("אירעה שגיאה במהלך עיבוד המסמכים");
      toast.error("אירעה שגיאה במהלך עיבוד המסמכים");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProcessingProgress(0);
        setProcessingStage(null);
      }, 800);

      // Add a small delay to ensure extracted data is saved before uploads useEffect runs
      setTimeout(() => {
        devLog("✅ Processing complete, extracted data should be saved");
      }, 1000);
    }
  };

  const extractLandRegistryData = async (): Promise<any> => {
    try {
      // Get ALL tabu document file URLs
      const tabuUploads = getUploadsByType("tabu").filter(
        (u: any) => u.status === "completed",
      );
      if (tabuUploads.length === 0) {
        console.warn("⚠️ No tabu document found for extraction");
        throw new Error("No tabu document available");
      }

      devLog(`📄 Found ${tabuUploads.length} tabu documents to process`);

      // Process ALL tabu documents and merge results
      const allResults: any[] = [];

      for (const upload of tabuUploads) {
        const fileUrl = upload.url;
        devLog(`📄 Extracting from tabu file: ${fileUrl}`);

        const response = await fetch(
          `/api/session/${sessionId}/land-registry-analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl, sessionId }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          devLog("🏛️ Land registry API response:", result);

          if (result.success) {
            allResults.push(result);
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error("No successful extractions from tabu documents");
      }

      // Merge all results - prefer non-null values from later documents
      const mergedData: any = {};
      for (const result of allResults) {
        const data = result.extractedData || result;
        Object.entries(data).forEach(([key, value]) => {
          // Keep existing value if new value is null/undefined/empty
          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            value !== "לא נמצא"
          ) {
            // For arrays, merge them
            if (Array.isArray(value) && Array.isArray(mergedData[key])) {
              mergedData[key] = [...mergedData[key], ...value];
            } else {
              mergedData[key] = value;
            }
          } else if (mergedData[key] === undefined) {
            mergedData[key] = value;
          }
        });
      }

      devLog(`📦 Merged data from ${allResults.length} tabu documents`);

      // Return ALL fields from merged data - both structured and flat
      return {
        land_registry: mergedData,
        // Flat fields for UI compatibility
        registrationOffice:
          mergedData.registration_office ||
          mergedData.registrationOffice ||
          "לא נמצא",
        gush: mergedData.gush || "לא נמצא",
        parcel: mergedData.chelka || mergedData.parcel || "לא נמצא",
        subParcel:
          mergedData.subParcel ||
          mergedData.sub_parcel ||
          mergedData.sub_chelka ||
          null,
        ownershipType:
          mergedData.ownership_type || mergedData.ownershipType || "לא נמצא",
        attachments:
          mergedData.attachments_description ||
          (Array.isArray(mergedData.attachments)
            ? mergedData.attachments
                .map((a: any) => a.description || a.type)
                .join(", ")
            : mergedData.attachments) ||
          "לא נמצא",
        balconyArea: mergedData.balcony_area || mergedData.balconyArea || 0,
        buildingNumber:
          mergedData.building_number || mergedData.buildingNumber || "",
        registeredArea:
          mergedData.registered_area ||
          mergedData.apartment_registered_area ||
          mergedData.registeredArea ||
          mergedData.apartmentArea ||
          0,
        builtArea: mergedData.built_area || mergedData.builtArea || "לא נמצא",
        finishLevel:
          mergedData.finish_standard || mergedData.finishStandard || "לא נמצא",
        sharedAreas:
          mergedData.shared_areas ||
          mergedData.shared_property ||
          mergedData.sharedAreas ||
          mergedData.sharedProperty ||
          "לא נמצא",
        constructionYear:
          mergedData.construction_year ||
          mergedData.constructionYear ||
          "לא נמצא",
        propertyCondition:
          mergedData.property_condition ||
          mergedData.propertyCondition ||
          "לא נמצא",
        floor: mergedData.floor || null,
        unitDescription:
          mergedData.unit_description || mergedData.unitDescription || null,
        owners: mergedData.owners || [],
        mortgages: mergedData.mortgages || [],
        easementsEssence:
          mergedData.easements_essence || mergedData.easementsEssence || null,
        easementsDescription:
          mergedData.easements_description ||
          mergedData.easementsDescription ||
          null,
      };
    } catch (error) {
      console.error("Land registry extraction failed:", error);
    }

    return {
      land_registry: null,
      registrationOffice: "לא נמצא",
      gush: "לא נמצא",
      parcel: "לא נמצא",
      ownershipType: "לא נמצא",
      attachments: "לא נמצא",
      balconyArea: 0,
      buildingNumber: "",
      registeredArea: 0,
      builtArea: "לא נמצא",
      finishLevel: "לא נמצא",
      sharedAreas: "לא נמצא",
      constructionYear: "לא נמצא",
      propertyCondition: "לא נמצא",
    };
  };

  const extractBuildingPermitData = async (): Promise<any> => {
    try {
      // Get ALL building permit document file URLs
      const permitUploads = getUploadsByType("permit").filter(
        (u: any) => u.status === "completed",
      );
      if (permitUploads.length === 0) {
        console.warn("⚠️ No building permit document found for extraction");
        throw new Error("No building permit document available");
      }

      devLog(
        `📄 Found ${permitUploads.length} building permit documents to process`,
      );

      // Process ALL permit documents and merge results
      const allResults: any[] = [];

      for (const upload of permitUploads) {
        const fileUrl = upload.url;
        devLog(`📄 Extracting from building permit file: ${fileUrl}`);

        const response = await fetch(
          `/api/session/${sessionId}/building-permit-analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl, sessionId }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          devLog("🏗️ Building permit API response:", result);

          if (result.success) {
            allResults.push(result);
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error(
          "No successful extractions from building permit documents",
        );
      }

      // Merge all results - prefer non-null values from later documents
      const mergedData: any = {};
      for (const result of allResults) {
        const data = result.extractedData || result;
        Object.entries(data).forEach(([key, value]) => {
          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            value !== "לא נמצא"
          ) {
            if (Array.isArray(value) && Array.isArray(mergedData[key])) {
              mergedData[key] = [...mergedData[key], ...value];
            } else {
              mergedData[key] = value;
            }
          } else if (mergedData[key] === undefined) {
            mergedData[key] = value;
          }
        });
      }

      devLog(
        `📦 Merged data from ${allResults.length} building permit documents`,
      );

      // Extract year from permit date if available
      let buildingYear = "לא נמצא";
      if (mergedData.permit_date) {
        const dateMatch = mergedData.permit_date.match(/(\d{4})/);
        if (dateMatch) {
          buildingYear = dateMatch[1];
        }
      }

      // Return ALL fields from merged data - both structured and flat
      return {
        building_permit: mergedData,
        // Flat fields for UI compatibility
        buildingYear:
          buildingYear !== "לא נמצא"
            ? buildingYear
            : mergedData.building_year || "לא נמצא",
        buildingRights:
          mergedData.permitted_usage ||
          mergedData.permitted_description ||
          mergedData.building_description ||
          mergedData.permittedUsage ||
          mergedData.permittedDescription ||
          "לא נמצא",
        permittedUse:
          mergedData.permitted_usage ||
          mergedData.permitted_description ||
          mergedData.permittedUsage ||
          mergedData.permittedDescription ||
          "לא נמצא",
        buildingDescription:
          mergedData.building_description ||
          mergedData.buildingDescription ||
          "לא נמצא",
        buildingPermitNumber:
          mergedData.permit_number || mergedData.permitNumber || "לא נמצא",
        buildingPermitDate:
          mergedData.permit_date || mergedData.permitDate || "לא נמצא",
        permitIssueDate:
          mergedData.permit_issue_date || mergedData.permitIssueDate || null,
        localCommitteeName:
          mergedData.local_committee_name ||
          mergedData.localCommitteeName ||
          null,
        propertyAddress:
          mergedData.property_address || mergedData.propertyAddress || null,
        gush: mergedData.gush || null,
        chelka: mergedData.chelka || null,
        subParcel:
          mergedData.subParcel ||
          mergedData.sub_parcel ||
          mergedData.sub_chelka ||
          null,
        buildingType: "לא מזוהה", // Not in permit - will be filled from exterior analysis
      };
    } catch (error) {
      console.error("Building permit extraction failed:", error);
    }

    return {
      building_permit: null,
      buildingYear: "לא נמצא",
      buildingRights: "לא נמצא",
      permittedUse: "לא נמצא",
      buildingDescription: "לא נמצא",
      buildingPermitNumber: "לא נמצא",
      buildingPermitDate: "לא נמצא",
      buildingType: "לא מזוהה",
    };
  };

  const extractSharedBuildingData = async (): Promise<any> => {
    try {
      // Get ALL condo document file URLs
      const condoUploads = getUploadsByType("condo").filter(
        (u: any) => u.status === "completed",
      );
      if (condoUploads.length === 0) {
        console.warn("⚠️ No condo document found for extraction");
        throw new Error("No condo document available");
      }

      devLog(`📄 Found ${condoUploads.length} condo documents to process`);

      // Process ALL condo documents and merge results
      const allResults: any[] = [];

      for (const upload of condoUploads) {
        const fileUrl = upload.url;
        devLog(`📄 Extracting from condo file: ${fileUrl}`);

        const response = await fetch(
          `/api/session/${sessionId}/shared-building-analysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl, sessionId }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          devLog("🏢 Shared building API response:", result);

          if (result.success) {
            allResults.push(result);
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error("No successful extractions from condo documents");
      }

      // Merge all results - prefer non-null values from later documents
      const mergedData: any = {};
      for (const result of allResults) {
        const data = result.extractedData || result;
        Object.entries(data).forEach(([key, value]) => {
          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            value !== "לא נמצא"
          ) {
            if (Array.isArray(value) && Array.isArray(mergedData[key])) {
              mergedData[key] = [...mergedData[key], ...value];
            } else {
              mergedData[key] = value;
            }
          } else if (mergedData[key] === undefined) {
            mergedData[key] = value;
          }
        });
      }

      devLog(`📦 Merged data from ${allResults.length} condo documents`);

      // Return ALL fields from merged data - both structured and flat
      return {
        shared_building: mergedData,
        // Flat fields for UI compatibility
        buildingDescription:
          mergedData.building_description ||
          mergedData.buildingDescription ||
          "לא נמצא",
        buildingFloors:
          mergedData.building_floors || mergedData.buildingFloors || "לא נמצא",
        buildingUnits:
          mergedData.building_sub_plots_count ||
          mergedData.total_sub_plots ||
          mergedData.buildingSubPlotsCount ||
          mergedData.totalSubPlots ||
          "לא נמצא",
        buildingAddress:
          mergedData.building_address || mergedData.buildingAddress || null,
        orderIssueDate:
          mergedData.order_issue_date || mergedData.orderIssueDate || null,
        totalSubPlots:
          mergedData.total_sub_plots || mergedData.totalSubPlots || null,
        buildingsInfo:
          mergedData.buildings_info || mergedData.buildingsInfo || [],
        subPlots: mergedData.sub_plots || mergedData.subPlots || [],
      };
    } catch (error) {
      console.error("Shared building extraction failed:", error);
    }

    return {
      shared_building: null,
      buildingDescription: "לא נמצא",
      buildingFloors: "לא נמצא",
      buildingUnits: "לא נמצא",
    };
  };

  const extractImageAnalysisData = async (): Promise<any> => {
    try {
      // Get interior and exterior images
      const interiorImages = getUploadsByType("interior_image")
        .filter((u: any) => u.status === "completed")
        .map((u: any) => ({ url: u.url }));
      const exteriorImages = getUploadsByType("building_image")
        .filter((u: any) => u.status === "completed")
        .map((u: any) => ({ url: u.url }));

      devLog(
        "📸 Interior images:",
        interiorImages.length,
        "Exterior images:",
        exteriorImages.length,
      );

      // Call both interior and exterior analysis APIs
      const [interiorResponse, exteriorResponse] = await Promise.allSettled([
        fetch(`/api/session/${sessionId}/interior-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: interiorImages, sessionId }),
        }),
        fetch(`/api/session/${sessionId}/exterior-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: exteriorImages, sessionId }),
        }),
      ]);

      const result: any = {};

      // Process interior analysis results
      if (
        interiorResponse.status === "fulfilled" &&
        interiorResponse.value.ok &&
        "json" in interiorResponse.value
      ) {
        const interiorData = await interiorResponse.value.json();
        devLog("📸 Interior API response:", interiorData);

        if (interiorData.success) {
          // Handle both nested and flat extractedData structure
          const extracted = interiorData.extractedData || interiorData;

          // Store structured data for Step 3
          result.interior_analysis = {
            description: extracted.description,
            property_layout_description: extracted.property_layout_description,
            room_analysis: extracted.room_analysis || [],
            condition_assessment: extracted.condition_assessment,
            interior_features: extracted.interior_features,
            finish_level: extracted.finish_level,
          };

          // Also include flat fields for backward compatibility
          result.propertyLayoutDescription =
            extracted.description ||
            extracted.property_layout_description ||
            "לא נמצא";
          result.roomAnalysis = extracted.room_analysis || [];
          result.conditionAssessment =
            extracted.condition_assessment || "לא נמצא";
          result.interiorFeatures = extracted.interior_features || "לא נמצא";
          result.finishLevel = extracted.finish_level || "לא נמצא";
        }
      }

      // Process exterior analysis results
      if (
        exteriorResponse.status === "fulfilled" &&
        exteriorResponse.value.ok &&
        "json" in exteriorResponse.value
      ) {
        const exteriorData = await exteriorResponse.value.json();
        devLog("📸 Exterior API response:", exteriorData);

        if (exteriorData.success) {
          // Handle both nested and flat extractedData structure
          const extracted = exteriorData.extractedData || exteriorData;
          result.buildingCondition = extracted.building_condition || "לא נמצא";
          result.buildingFeatures = extracted.building_features || "לא נמצא";
          result.buildingType = extracted.building_type || "לא נמצא";
          result.overallAssessment =
            extracted.overall_assessment ||
            extracted.exterior_assessment ||
            "לא נמצא";
          result.buildingYear = extracted.building_year || "לא נמצא";
        }
      }

      devLog("📸 Combined image analysis result:", result);
      return result;
    } catch (error) {
      console.error("Image analysis failed:", error);
    }

    return {
      propertyLayoutDescription: "לא נמצא",
      roomAnalysis: [],
      conditionAssessment: "לא נמצא",
      buildingCondition: "לא נמצא",
      buildingFeatures: "לא נמצא",
      buildingType: "לא נמצא",
      overallAssessment: "לא נמצא",
    };
  };

  const handleFileSelect = async (type: string, files: FileList | null) => {
    if (!files) return;

    // Limit interior images to 3
    if (type === "interior_image") {
      const currentInteriorCount = getUploadsByType("interior_image").length;
      const maxFiles = Math.min(files.length, 6 - currentInteriorCount);
      if (maxFiles <= 0) {
        toast.error("ניתן להעלות עד 6 תמונות פנים בלבד");
        return;
      }
      // Create a new FileList with limited files
      const limitedFiles = Array.from(files).slice(0, maxFiles);
      files = limitedFiles as any;
    }

    const newUploads: DocumentUpload[] = [];

    for (let i = 0; i < files!.length; i++) {
      const file = files![i];
      const uploadId = `${type}_${Date.now()}_${i}`;

      const upload: DocumentUpload = {
        id: uploadId,
        file,
        type: type as
          | "tabu"
          | "permit"
          | "condo"
          | "planning"
          | "building_image"
          | "interior_image",
        status: "uploading" as const,
        progress: 0,
        previewReady: false,
      };

      // Create preview for images immediately using Object URL (much lighter than base64)
      if (
        (type === "building_image" || type === "interior_image") &&
        file.type.startsWith("image/")
      ) {
        const objectUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(objectUrl); // Track for cleanup on unmount
        setUploads((prev) => {
          const updated = prev.map((u) =>
            u.id === uploadId
              ? { ...u, preview: objectUrl, previewReady: true }
              : u,
          );
          const processed = updateImageData(updated);
          if (type === "building_image" && i === 0) {
            updateData({ selectedImagePreview: objectUrl });
          }
          return processed || updated;
        });
      }

      newUploads.push(upload);
    }

    setUploads((prev) => [...prev, ...newUploads]);

    // Upload ALL files in PARALLEL (not sequential)
    // Pass skipProcessing=true to avoid triggering background processing per-file
    await Promise.allSettled(
      newUploads.map((upload) =>
        simulateUpload(upload, { skipProcessing: true }),
      ),
    );

    // NOTE: Background processing removed - user clicks "עבד מסמכים" to start AI extraction
    // This separates upload phase from processing phase for better UX
    if (type === "tabu" || type === "condo" || type === "permit") {
      devLog(
        `✅ All ${type} uploads complete - ready for processing when user clicks button`,
      );
    }
  };

  const simulateUpload = async (
    upload: DocumentUpload,
    options?: { skipProcessing?: boolean },
  ) => {
    if (!sessionId) {
      console.error("❌ No session ID for upload");
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: "error" as const, error: "No session ID" }
            : u,
        ),
      );
      return;
    }

    try {
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, progress } : u)),
        );
      }

      // Actually upload the file
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("type", upload.type);

      devLog(`🚀 Uploading ${upload.type} file: ${upload.file.name}`);

      const response = await fetch(`/api/files/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      devLog(`✅ Upload successful:`, result);

      // Use the complete upload entry from the API response (it has the correct URL)
      const uploadEntry = result.uploadEntry || {};

      // Mark as completed with all metadata from API - no need to generate URL ourselves
      setUploads((prev) => {
        const updated = prev.map((u) => {
          if (u.id === upload.id) {
            const actualUrl = uploadEntry.url;
            const isImageType =
              upload.type === "building_image" ||
              upload.type === "interior_image";

            devLog(`✅ Marking upload as completed:`, {
              id: u.id,
              type: upload.type,
              isImageType,
              uploadEntryUrl: uploadEntry.url,
              actualUrl,
              previousPreview: u.preview?.substring(0, 50),
            });

            return {
              ...u,
              status: uploadEntry.status || ("completed" as const),
              url: actualUrl,
              // CRITICAL: For images, update preview to use the real URL (not base64)
              preview: isImageType ? actualUrl : u.preview,
              previewReady: isImageType ? true : u.previewReady,
              // Add all metadata from the API response
              name: uploadEntry.name || u.file.name,
              fileName: uploadEntry.fileName || u.file.name,
              path: uploadEntry.path || "",
              size: uploadEntry.size || u.file.size,
              mimeType: uploadEntry.mimeType || u.file.type,
              uploadedAt: uploadEntry.uploadedAt || new Date().toISOString(),
              extractedData: uploadEntry.extractedData ||
                result.extractedData || { extracted: true },
            };
          }
          return u;
        });

        // Update image data after completion
        if (
          upload.type === "building_image" ||
          upload.type === "interior_image"
        ) {
          devLog("🖼️ Calling updateImageData after upload completion");
          const processedUploads = updateImageData(updated);
          if (processedUploads) {
            devLog("🖼️ updateImageData returned processed uploads");
            return processedUploads;
          } else {
            devLog("🖼️ updateImageData returned nothing, using updated");
          }
        }

        return updated;
      });

      // Show success toast for upload
      toast.success(`הקובץ "${upload.file.name}" הועלה בהצלחה`);

      // NOTE: Background processing removed - user clicks "עבד מסמכים" to start AI extraction
      // This separates upload phase from processing phase for better UX
      if (
        upload.type === "tabu" ||
        upload.type === "condo" ||
        upload.type === "permit"
      ) {
        devLog(`✅ Upload complete for ${upload.type} - ready for processing`);
      }
    } catch (error) {
      console.error("❌ Upload failed:", error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : u,
        ),
      );
    }
  };

  const updateImageData = (
    currentUploads?: DocumentUpload[],
  ): DocumentUpload[] | undefined => {
    const uploadsToUse = currentUploads || uploads;

    devLog("🖼️ updateImageData called with", uploadsToUse.length, "uploads");
    const imageUploads = uploadsToUse.filter(
      (u) => u.type === "building_image" || u.type === "interior_image",
    );
    devLog(
      "🖼️ Found",
      imageUploads.length,
      "image uploads:",
      imageUploads.map((u) => ({
        id: u.id,
        type: u.type,
        status: u.status,
        previewReady: u.previewReady,
        hasPreview: !!u.preview,
        previewIsData: u.preview?.startsWith("data:"),
        previewStart: u.preview?.substring(0, 50),
      })),
    );

    // STRICT FILTER: Only include images with valid previews AND completed status
    const completedImages = uploadsToUse.filter((u) => {
      const isImageType =
        u.type === "building_image" || u.type === "interior_image";
      const hasPreviewReady = u.previewReady === true;
      const hasValidPreview =
        typeof u.preview === "string" && u.preview.trim().length > 0;
      const isCompleted = u.status === "completed";

      return isImageType && hasPreviewReady && hasValidPreview && isCompleted;
    });

    devLog("🖼️ After filter:", completedImages.length, "completed images");

    if (completedImages.length === 0) {
      devLog("🖼️ No completed images, clearing image data");
      updateData({
        propertyImages: [],
        selectedImagePreview: null,
        interiorImages: [],
      });
      return currentUploads;
    }

    // Double-check: filter again to ensure no empty strings or base64-only slip through
    const validUploads = completedImages.filter(
      (u) =>
        typeof u.preview === "string" &&
        u.preview.trim().length > 0 &&
        u.preview !== "data:,",
    );

    devLog("🖼️ After validation:", validUploads.length, "valid uploads");

    if (validUploads.length === 0) {
      devLog("🖼️ No valid uploads after validation");
      updateData({
        propertyImages: [],
        selectedImagePreview: null,
        interiorImages: [],
      });
      return currentUploads;
    }

    const nextUploads = currentUploads
      ? currentUploads.map((upload) => ({ ...upload }))
      : undefined;

    // Construct image data with strict validation
    let imageData = validUploads
      .map((u) => {
        const preview = (u.preview as string).trim();
        // Skip if preview is empty or invalid
        if (!preview || preview === "data:,") {
          return null;
        }
        return {
          name: u.file.name,
          preview: preview,
          isSelected: u.isSelected || false,
          type: u.type,
          url: u.url,
          path: u.path,
        };
      })
      .filter((img): img is NonNullable<typeof img> => img !== null);

    const hasSelectedBuilding = imageData.some(
      (img) => img.type === "building_image" && img.isSelected,
    );

    let primaryUpload = validUploads.find(
      (u) => u.type === "building_image" && u.isSelected,
    );

    if (!primaryUpload) {
      primaryUpload = validUploads.find((u) => u.type === "building_image");
    }

    if (
      primaryUpload &&
      primaryUpload.type === "building_image" &&
      !hasSelectedBuilding
    ) {
      const primaryPreview = (primaryUpload.preview as string).trim();
      imageData = imageData.map((img) =>
        img.type === "building_image"
          ? { ...img, isSelected: img.preview === primaryPreview }
          : img,
      );

      if (nextUploads) {
        for (let i = 0; i < nextUploads.length; i += 1) {
          const upload = nextUploads[i];
          if (
            upload.type === "building_image" &&
            upload.status === "completed"
          ) {
            nextUploads[i] = {
              ...upload,
              isSelected: upload.id === primaryUpload.id,
            };
          }
        }
      }
    }

    const selectedBuilding = imageData.find(
      (img) => img.type === "building_image" && img.isSelected,
    );

    const fallbackBuilding =
      selectedBuilding ||
      imageData.find((img) => img.type === "building_image");
    const selectedPreview = fallbackBuilding?.preview?.trim();

    // STRICT VALIDATION: Ensure selected preview is not empty
    const validSelectedPreview =
      selectedPreview && selectedPreview !== "data:," ? selectedPreview : null;

    // STRICT VALIDATION: Filter interior photos more aggressively
    const interiorPhotos = validUploads
      .filter((u) => u.type === "interior_image")
      .map((u) => (u.preview as string).trim())
      .filter((preview) => {
        // Ensure preview is valid, not empty, and not a blank data URL
        return preview && preview.length > 0 && preview !== "data:,";
      })
      .slice(0, 6);

    updateData({
      propertyImages: imageData,
      selectedImagePreview: validSelectedPreview,
      interiorImages: interiorPhotos,
    });

    return nextUploads || currentUploads;
  };

  const handleRemoveUpload = async (uploadId: string) => {
    const upload = uploads.find((u) => u.id === uploadId);

    if (!upload) return;

    devLog(`🗑️ Removing upload ${uploadId} (${upload.type})`);

    // Revoke Object URL to free memory (only for blob: URLs, not server URLs)
    if (upload.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(upload.preview);
      objectUrlsRef.current.delete(upload.preview);
    }

    // Call the API to delete from DB, blob storage, and images table in parallel
    try {
      const response = await fetch(
        `/api/session/${sessionId}/upload/${uploadId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Failed to delete upload:`, errorData);
        throw new Error(errorData.error || "Failed to delete upload");
      }

      const result = await response.json();
      devLog(`✅ Upload deleted successfully:`, result);
      toast.success("הקובץ נמחק בהצלחה");

      // Update local state after successful deletion
      setUploads((prev) => {
        const remaining = prev.filter((u) => u.id !== uploadId);

        // Handle image types
        if (
          upload.type === "building_image" ||
          upload.type === "interior_image"
        ) {
          // STRICT FILTER: Only keep images with valid previews and completed status
          const remainingImages = remaining.filter((u) => {
            const isImageType =
              u.type === "building_image" || u.type === "interior_image";
            const hasPreviewReady = u.previewReady === true;
            const hasValidPreview =
              typeof u.preview === "string" &&
              u.preview.trim().length > 0 &&
              u.preview !== "data:,";
            const isCompleted = u.status === "completed";

            return (
              isImageType && hasPreviewReady && hasValidPreview && isCompleted
            );
          });
          const validRemainingImages = remainingImages;

          // Handle interior images - remove from interiorImages array
          if (upload.type === "interior_image") {
            const remainingInteriorImages = remaining
              .filter((u) => {
                return (
                  u.type === "interior_image" &&
                  u.previewReady === true &&
                  u.status === "completed" &&
                  typeof u.preview === "string" &&
                  u.preview.trim().length > 0 &&
                  u.preview !== "data:,"
                );
              })
              .map((u) => (u.preview as string).trim())
              .slice(0, 6);

            devLog("🖼️ Updating interior images:", {
              removed: upload.preview,
              remaining: remainingInteriorImages.length,
            });

            updateData({
              interiorImages: remainingInteriorImages,
              propertyImages: validRemainingImages
                .map((u) => {
                  const preview = (u.preview as string).trim();
                  // Skip if preview is invalid
                  if (!preview || preview === "data:,") return null;

                  return {
                    name: u.file.name,
                    preview: preview,
                    isSelected: u.isSelected || false,
                    type: u.type,
                    url: u.url,
                    path: u.path,
                  };
                })
                .filter((img): img is NonNullable<typeof img> => img !== null),
            });
          } else if (upload.type === "building_image") {
            // Handle building images - update selectedImagePreview
            const buildingImages = validRemainingImages.filter(
              (u) => u.type === "building_image",
            );
            const selectedBuildingImage =
              buildingImages.find((u) => u.isSelected) || buildingImages[0];
            const selectedPreview = selectedBuildingImage?.preview?.trim();
            const validSelectedPreview =
              selectedPreview && selectedPreview !== "data:,"
                ? selectedPreview
                : null;

            devLog("🏢 Updating building images:", {
              removed: upload.preview,
              remaining: buildingImages.length,
              newSelected: validSelectedPreview,
            });

            updateData({
              propertyImages: validRemainingImages
                .map((u) => {
                  const preview = (u.preview as string).trim();
                  // Skip if preview is invalid
                  if (!preview || preview === "data:,") return null;

                  return {
                    name: u.file.name,
                    preview: preview,
                    isSelected: u.isSelected || false,
                    type: u.type,
                    url: u.url,
                    path: u.path,
                  };
                })
                .filter((img): img is NonNullable<typeof img> => img !== null),
              selectedImagePreview: validSelectedPreview,
            });
          }
        }

        return remaining;
      });
    } catch (error) {
      console.error(`❌ Error deleting upload:`, error);
      toast.error(
        `שגיאה במחיקת הקובץ: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
      );
    }
  };

  const handleSelectImage = (uploadId: string) => {
    setUploads((prev) => {
      const updated = prev.map((upload) => ({
        ...upload,
        isSelected:
          upload.id === uploadId &&
          (upload.type === "building_image" ||
            upload.type === "interior_image"),
      }));

      // STRICT FILTER: Only use completed images with valid previews
      const imageUploads = updated.filter((u) => {
        const isImageType =
          u.type === "building_image" || u.type === "interior_image";
        const isCompleted = u.status === "completed";
        const hasValidPreview =
          typeof u.preview === "string" &&
          u.preview.trim().length > 0 &&
          u.preview !== "data:,";

        return isImageType && isCompleted && hasValidPreview;
      });

      const buildingImages = imageUploads.filter(
        (u) => u.type === "building_image",
      );
      const selectedBuildingImage =
        buildingImages.find((u) => u.isSelected) || buildingImages[0];
      const selectedPreview = selectedBuildingImage?.preview?.trim();
      const validSelectedPreview =
        selectedPreview && selectedPreview !== "data:,"
          ? selectedPreview
          : null;

      devLog("Selecting image:", {
        uploadId,
        selectedBuildingImage,
        preview: validSelectedPreview,
      });

      updateData({
        propertyImages: imageUploads
          .map((u) => {
            const preview = (u.preview as string).trim();
            // Skip if preview is invalid
            if (!preview || preview === "data:,") return null;

            return {
              name: u.file.name,
              preview: preview,
              isSelected: u.isSelected || false,
              type: u.type,
              url: u.url,
              path: u.path,
            };
          })
          .filter((img): img is NonNullable<typeof img> => img !== null),
        selectedImagePreview: validSelectedPreview,
      });

      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(type, e.dataTransfer.files);
  };

  const validation = useCallback(() => {
    // Step 2 is optional - allow proceeding unless AI processing is in progress
    // Block navigation during processing to prevent users from losing context
    const isValid = !isProcessing;
    devLog(
      "Step 2 validation:",
      isValid ? "Valid" : "Blocked (processing in progress)",
    );
    return isValid;
  }, [isProcessing]);

  // Track previous processing state and whether validation has been called
  const prevProcessingRef = useRef<boolean | null>(null);
  const validationCalledRef = useRef(false);

  // Consolidated validation effect - handles both mount and state changes
  useEffect(() => {
    const shouldBeValid = !isProcessing;

    // Update on mount OR when processing state actually changes
    if (
      !validationCalledRef.current ||
      prevProcessingRef.current !== isProcessing
    ) {
      devLog(
        `🔄 Validation update: processing=${isProcessing}, valid=${shouldBeValid}, initial=${!validationCalledRef.current}`,
      );
      onValidationChange(shouldBeValid);
      prevProcessingRef.current = isProcessing;
      validationCalledRef.current = true;
    }
  }, [isProcessing, onValidationChange]);

  // Save uploads to session data whenever uploads change
  useEffect(() => {
    devLog(
      "🔄 Uploads useEffect triggered, isProcessing:",
      isProcessing,
      "uploads.length:",
      uploads.length,
    );

    // Don't save uploads during processing to avoid overwriting extracted data
    if (isProcessing) {
      devLog(
        "⏸️ Skipping upload save during processing to preserve extracted data",
      );
      return;
    }

    if (uploads.length > 0) {
      devLog("💾 Saving uploads to session:", uploads.length, "uploads");

      // Filter out UI-only fields before saving to database
      const uploadsForDB = uploads.map((upload) => {
        // CRITICAL: Get the real URL, not base64 preview
        const uploadUrl = (upload as any).url;
        const uploadPreview = upload.preview;

        // NEVER save base64 previews to database - they're huge and temporary
        let finalUrl = uploadUrl;
        if (!finalUrl && uploadPreview && !uploadPreview.startsWith("data:")) {
          // Only use preview if it's a real URL, not a base64 string
          finalUrl = uploadPreview;
        }

        devLog(`💾 Saving upload ${upload.id}:`, {
          type: upload.type,
          hasUrl: !!uploadUrl,
          hasPreview: !!uploadPreview,
          previewIsBase64: uploadPreview?.startsWith("data:"),
          finalUrl: finalUrl?.substring(0, 80),
        });

        return {
          id: upload.id,
          type: upload.type,
          name: upload.file?.name || (upload as any).name,
          fileName: (upload as any).fileName || upload.file?.name,
          path: (upload as any).path || "",
          size: (upload as any).size || upload.file?.size || 0,
          mimeType: (upload as any).mimeType || upload.file?.type,
          status: upload.status,
          error: upload.error,
          url: finalUrl, // CRITICAL: Only save real URLs, never base64
          uploadedAt: (upload as any).uploadedAt || new Date().toISOString(),
          extractedData: upload.extractedData,
          isSelected: upload.isSelected || false,
        };
      });

      // Only update uploads, preserve other data like extractedData
      devLog(
        "💾 Updating parent data with uploads only, preserving extractedData",
      );
      devLog(
        "💾 Uploads being saved (with status field):",
        JSON.stringify(
          uploadsForDB.map((u) => ({
            id: u.id,
            type: u.type,
            status: u.status,
          })),
        ),
      );
      updateData({ uploads: uploadsForDB });
    } else {
      // Clear uploads from parent data when no uploads remain
      updateData({ uploads: [] });
    }
  }, [uploads, updateData, isProcessing]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-right truncate">
          העלאת מסמכים
        </h2>
        <p className="text-sm sm:text-base text-gray-600 text-right break-words">
          העלה את המסמכים הנדרשים לשומה. המערכת תעבד ותחלץ נתונים אוטומטית
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const Icon = config.icon;
          const typeUploads = getUploadsByType(type);
          const isDragOver = dragOver === type;
          const hasUploads = typeUploads.length > 0;

          return (
            <div
              key={type}
              className={`
                border-2 border-dashed rounded-lg p-4 sm:p-6 transition-all overflow-hidden
                ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}
                ${config.required && !hasUploads ? "border-red-300 bg-red-50" : ""}
              `}
              onDragOver={(e) => handleDragOver(e, type)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, type)}
            >
              <div className="text-center">
                <Icon
                  className={`w-12 h-12 mx-auto mb-4 text-${config.color}-600`}
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {config.label}
                  {config.required && (
                    <span className="text-red-500 mr-1">*</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {config.description}
                </p>

                {/* Upload Area */}
                <div className="space-y-4">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[type] = el;
                    }}
                    type="file"
                    accept={
                      type === "building_image" || type === "interior_image"
                        ? "image/*"
                        : ".pdf,.doc,.docx"
                    }
                    multiple={true}
                    onChange={(e) => handleFileSelect(type, e.target.files)}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRefs.current[type]?.click()}
                    className={`
                      w-full px-4 py-3 rounded-lg font-medium transition-all
                      bg-${config.color}-600 text-white hover:bg-${config.color}-700
                    `}
                  >
                    בחר קבצים
                  </button>

                  <p className="text-xs text-gray-500">גרור ושחרר קבצים כאן</p>
                </div>

                {/* Upload List */}
                {typeUploads.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {typeUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between p-3 bg-white rounded border gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getStatusIcon(upload.status)}
                          <div className="text-right min-w-0 flex-1">
                            <div
                              className="text-sm font-medium text-gray-900 truncate max-w-full"
                              title={upload.file.name}
                            >
                              {upload.file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {upload.preview && (
                            <button
                              onClick={() =>
                                window.open(upload.preview, "_blank")
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Image Selection Button */}
                          {(type === "building_image" ||
                            type === "interior_image") &&
                            upload.status === "completed" && (
                              <button
                                onClick={() => handleSelectImage(upload.id)}
                                className={`p-1 rounded ${
                                  upload.isSelected
                                    ? "text-yellow-500 bg-yellow-100"
                                    : "text-gray-400 hover:text-yellow-500"
                                }`}
                                title={
                                  upload.isSelected
                                    ? "תמונה נבחרת"
                                    : "בחר כתמונה ראשית"
                                }
                              >
                                <Star
                                  className={`w-4 h-4 ${upload.isSelected ? "fill-current" : ""}`}
                                />
                              </button>
                            )}

                          <button
                            onClick={() => handleRemoveUpload(upload.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        {upload.status === "uploading" && (
                          <div className="w-full mt-2">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${upload.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {upload.status === "error" && upload.error && (
                          <div
                            className="w-full mt-2 text-xs text-red-600 truncate"
                            title={upload.error}
                          >
                            {upload.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Source Info */}
                {typeUploads.some((u) => u.status === "completed") && (
                  <div className="mt-4">
                    <DataSource
                      source={type as any}
                      details="נשלף אוטומטית מהמסמך"
                    />
                  </div>
                )}

                {/* Background Processing Status Indicator */}
                {(type === "tabu" || type === "condo" || type === "permit") &&
                  typeUploads.some((u) => u.status === "completed") && (
                    <div className="mt-3 p-2 rounded-lg bg-gray-50 border">
                      {backgroundProcessing[
                        type as "tabu" | "condo" | "permit"
                      ] === "processing" && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">מעבד ברקע...</span>
                        </div>
                      )}
                      {backgroundProcessing[
                        type as "tabu" | "condo" | "permit"
                      ] === "completed" && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">העיבוד הושלם</span>
                        </div>
                      )}
                      {backgroundProcessing[
                        type as "tabu" | "condo" | "permit"
                      ] === "error" && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">שגיאה בעיבוד</span>
                        </div>
                      )}
                      {backgroundProcessing[
                        type as "tabu" | "condo" | "permit"
                      ] === "pending" && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">ממתין לעיבוד</span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Background Processing Summary Banner */}
      {Object.values(backgroundProcessing).some((s) => s === "processing") && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Brain className="w-4 h-4 text-blue-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  מעבד מסמכים ברקע
                </h3>
                <p className="text-blue-700 text-xs">
                  ניתן להמשיך לשלב הבא - הנתונים יתעדכנו אוטומטית
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(["tabu", "condo", "permit"] as const).map((docType) => {
                const status = backgroundProcessing[docType];
                if (status === "pending") return null;
                return (
                  <div
                    key={docType}
                    className={`px-2 py-1 rounded text-xs ${
                      status === "processing"
                        ? "bg-blue-100 text-blue-700"
                        : status === "completed"
                          ? "bg-green-100 text-green-700"
                          : status === "error"
                            ? "bg-red-100 text-red-700"
                            : ""
                    }`}
                  >
                    {docType === "tabu"
                      ? "טאבו"
                      : docType === "condo"
                        ? "צו בית משותף"
                        : "היתר"}
                    {status === "processing" && (
                      <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                    )}
                    {status === "completed" && (
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                    )}
                    {status === "error" && (
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Process Documents Section */}
      {uploads.some((u) => u.status === "completed") && (
        <div className="mt-8">
          {/* Show existing AI extraction info */}
          {existingAIExtraction && !isProcessing && (
            <div
              className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6"
              dir="rtl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">
                      נתונים כבר חולצו באמצעות AI
                    </h3>
                    <p className="text-green-700 text-sm">
                      תאריך חילוץ:{" "}
                      {new Date(
                        existingAIExtraction.extraction_date,
                      ).toLocaleString("he-IL")}
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      {
                        Object.keys(existingAIExtraction.extracted_fields || {})
                          .length
                      }{" "}
                      שדות חולצו
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReprocessConfirm(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  עבד מחדש
                </button>
              </div>
            </div>
          )}

          {/* Reprocess confirmation dialog */}
          {showReprocessConfirm && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              dir="rtl"
            >
              <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  עיבוד מחדש של המסמכים?
                </h3>
                <p className="text-gray-700 text-sm mb-4">
                  בחר אילו מסמכים לעבד מחדש. נתונים ממסמכים שלא נבחרו יישמרו כפי
                  שהם.
                </p>

                {/* Selective reprocess checkboxes */}
                <div className="space-y-3 mb-4 bg-gray-50 rounded-lg p-4">
                  {data.uploads?.some((u: any) => u.type === "tabu") && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.tabu}
                        onChange={(e) =>
                          setSelectiveReprocess((prev) => ({
                            ...prev,
                            tabu: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          טאבו (לשכת רישום מקרקעין)
                        </p>
                        <p className="text-xs text-gray-600">
                          גוש, חלקה, בעלים, שטח רשום
                        </p>
                      </div>
                    </label>
                  )}

                  {data.uploads?.some((u: any) => u.type === "permit") && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.permit}
                        onChange={(e) =>
                          setSelectiveReprocess((prev) => ({
                            ...prev,
                            permit: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">היתר בנייה</p>
                        <p className="text-xs text-gray-600">
                          שנת בנייה, שימוש מותר, שטח בנוי
                        </p>
                      </div>
                    </label>
                  )}

                  {data.uploads?.some((u: any) => u.type === "condo") && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.condo}
                        onChange={(e) =>
                          setSelectiveReprocess((prev) => ({
                            ...prev,
                            condo: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          תקנון בית משותף
                        </p>
                        <p className="text-xs text-gray-600">
                          קומות, יחידות, שטחים משותפים
                        </p>
                      </div>
                    </label>
                  )}

                  {data.uploads?.some(
                    (u: any) =>
                      u.type === "building_image" ||
                      u.type === "interior_image",
                  ) && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveReprocess.images}
                        onChange={(e) =>
                          setSelectiveReprocess((prev) => ({
                            ...prev,
                            images: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">תמונות</p>
                        <p className="text-xs text-gray-600">
                          ניתוח חזית ופנים הנכס
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-xs">
                    ℹ️ נתונים ממסמכים שלא נבחרו יישמרו
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowReprocessConfirm(false);
                      setSelectiveReprocess({
                        tabu: false,
                        permit: false,
                        condo: false,
                        images: false,
                      });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      const hasSelection = Object.values(
                        selectiveReprocess,
                      ).some((v) => v);
                      if (!hasSelection) {
                        toast.error("אנא בחר לפחות מסמך אחד לעיבוד");
                        return;
                      }
                      processDocuments(selectiveReprocess);
                      setSelectiveReprocess({
                        tabu: false,
                        permit: false,
                        condo: false,
                        images: false,
                      });
                    }}
                    disabled={!Object.values(selectiveReprocess).some((v) => v)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    עבד מחדש מסמכים נבחרים
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isProcessing &&
            !existingAIExtraction &&
            Object.keys(extractedData).length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-900">
                        עיבוד מסמכים נדרש
                      </h3>
                      <p className="text-yellow-700 text-sm">
                        לחץ על "עבד מסמכים" כדי לחלץ נתונים מהמסמכים שהועלו
                        באמצעות AI
                      </p>
                      <div className="mt-2 text-xs text-yellow-600">
                        {(() => {
                          const uploadedTypes = new Set(
                            data.uploads?.map((upload: any) => upload.type) ||
                              [],
                          );
                          const processableTypes = [];
                          if (uploadedTypes.has("tabu"))
                            processableTypes.push("תעודת בעלות");
                          if (uploadedTypes.has("permit"))
                            processableTypes.push("היתר בנייה");
                          if (uploadedTypes.has("condo"))
                            processableTypes.push("תקנון בית משותף");
                          if (
                            uploadedTypes.has("building_image") ||
                            uploadedTypes.has("interior_image")
                          )
                            processableTypes.push("תמונות");

                          return processableTypes.length > 0 ? (
                            <p className="mt-1">
                              📋 יועברו לעיבוד: {processableTypes.join(", ")}
                            </p>
                          ) : (
                            <p className="mt-1 text-red-600">
                              ⚠️ לא נמצאו מסמכים רלוונטיים לעיבוד
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => processDocuments()}
                    disabled={!sessionId}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Loader2 className="w-4 h-4" />
                    עבד מסמכים
                  </button>
                </div>
              </div>
            )}

          {/* Processing State - Compact Overlay Modal with Accessibility */}
          {isProcessing && (
            <div
              className="fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="processing-title"
              aria-describedby="processing-status"
            >
              {/* Semi-transparent backdrop */}
              <div className="absolute inset-0 bg-black/20 pointer-events-auto" />

              {/* Compact modal */}
              <div className="relative bg-white border border-blue-200 rounded-xl p-5 shadow-2xl max-w-md w-full mx-4 pointer-events-auto">
                <div className="flex items-center gap-4">
                  {/* Smaller spinner */}
                  <div className="relative flex-shrink-0" aria-hidden="true">
                    <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      id="processing-title"
                      className="text-base font-bold text-blue-900 mb-1"
                    >
                      מעבד מסמכים עם AI...
                    </h3>
                    <p
                      id="processing-status"
                      className="text-blue-700 text-sm truncate"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {processingStage || "מנתח מסמכים ומחלץ נתונים"}
                    </p>
                  </div>

                  {/* Progress percentage with progressbar role */}
                  <div
                    className="flex-shrink-0 text-lg font-bold text-blue-600"
                    role="progressbar"
                    aria-valuenow={Math.round(processingProgress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`התקדמות עיבוד: ${Math.round(processingProgress)} אחוז`}
                  >
                    {Math.min(100, Math.max(0, Math.round(processingProgress)))}
                    %
                  </div>
                </div>

                {/* Progress bar with continuous shimmer animation */}
                <div
                  className="mt-3 w-full bg-blue-100 h-2 rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out relative"
                    style={{
                      width: `${Math.min(100, Math.max(5, processingProgress))}%`,
                    }}
                  >
                    {/* Continuous shimmer effect - always animating */}
                    <div
                      className="absolute inset-0 w-full h-full animate-shimmer"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Complete Success */}
          {!isProcessing && Object.keys(extractedData).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900">
                    עיבוד הושלם בהצלחה
                  </h3>
                  <p className="text-green-700 text-xs">
                    הנתונים נחלצו מהמסמכים. ניתן לעבור לשלב הבא כדי לערוך ולאמת
                    את הנתונים.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Summary */}
      <div className="mt-8">
        {/* Show processing-in-progress message when navigation is blocked */}
        {isProcessing && (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <span className="text-amber-800 font-medium">
                עיבוד AI בתהליך - יש להמתין לסיום לפני המעבר לשלב הבא
              </span>
            </div>
          </div>
        )}
        {/* Note: Required documents validation removed - all document types are optional */}
      </div>
    </div>
  );
}
