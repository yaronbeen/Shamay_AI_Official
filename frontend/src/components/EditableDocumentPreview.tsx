"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import DOMPurify from "dompurify";

import { ValuationData, CustomTable } from "@/types/valuation";
import {
  generateDocumentHTML,
  CompanySettings,
} from "../lib/document-template";
import { CSVUploadDialog } from "./ui/CSVUploadDialog";
import {
  useFootnotes,
  useImageEditor,
  useTableEditor,
  useExport,
} from "./EditableDocumentPreview/hooks";
import { FloatingToolbar } from "./EditableDocumentPreview/FloatingToolbar";

// Type helper for PropertyAnalysis with potential __customDocumentEdits
type PropertyAnalysisWithEdits = ValuationData["propertyAnalysis"] & {
  __customDocumentEdits?: Record<string, string>;
};

// Security: Allowed MIME types for image uploads
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Security: DOMPurify configuration for sanitizing HTML
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "b",
    "i",
    "u",
    "strong",
    "em",
    "p",
    "br",
    "span",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "sup",
    "sub",
    "div",
    "img",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: [
    "class",
    "style",
    "data-row",
    "data-col",
    "data-edit-selector",
    "src",
    "alt",
    "width",
    "height",
  ],
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "select",
    "button",
  ],
  FORBID_ATTR: [
    "onclick",
    "onerror",
    "onload",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
  ],
};

type ToolbarMode = "text" | "image" | "table";

interface ToolbarState {
  visible: boolean;
  mode: ToolbarMode;
  targetSelector?: string;
}

interface EditableDocumentPreviewProps {
  data: ValuationData;
  onDataChange: (updates: Partial<ValuationData>) => void;
}

export function EditableDocumentPreview({
  data,
  onDataChange,
}: EditableDocumentPreviewProps) {
  const [companySettings, setCompanySettings] = useState<
    CompanySettings | undefined
  >(undefined);
  const [htmlContent, setHtmlContent] = useState<string>("");
  // Note: pageCount, currentPage, and viewMode were removed as unused dead code
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customHtmlOverrides, setCustomHtmlOverrides] = useState<
    Record<string, string>
  >({});
  const [debouncedOverrides, setDebouncedOverrides] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCSVUploadDialog, setShowCSVUploadDialog] = useState(false);
  // Track current table cell for table operations
  const [currentTableCell, setCurrentTableCell] = useState<{
    tableId: string;
    row: number;
    col: number;
  } | null>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    visible: false,
    mode: "text",
    targetSelector: undefined,
  });
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const toolbarStateRef = useRef<ToolbarState>(toolbarState);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bindingsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const previousImageDataRef = useRef<{
    propertyImages: any[];
    selectedImagePreview: string | null;
    interiorImages: string[];
  }>({
    propertyImages: [],
    selectedImagePreview: null,
    interiorImages: [],
  });
  // Use the extracted footnotes hook
  const {
    handleAddFootnote,
    handleEditFootnote,
    handleDeleteFootnote,
    handleEditFootnoteRef,
    handleDeleteFootnoteRef,
  } = useFootnotes({
    data,
    onDataChange,
    previewFrameRef,
    setCustomHtmlOverrides,
  });

  // Use the extracted export hook
  const { isExporting, handleExportPDF, handleExportDOCX } = useExport({
    data,
    customHtmlOverrides,
  });

  const updateIframeHeight = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) {
      return;
    }

    const measure = () => {
      const contentDocument =
        frame.contentDocument || frame.contentWindow?.document;
      if (!contentDocument) {
        return;
      }
      const docEl = contentDocument.documentElement;
      const bodyEl = contentDocument.body;
      const scrollTargets = [
        docEl?.scrollHeight,
        bodyEl?.scrollHeight,
        docEl?.offsetHeight,
        bodyEl?.offsetHeight,
      ].filter((value): value is number => typeof value === "number");
      const scrollHeight =
        scrollTargets.length > 0 ? Math.max(...scrollTargets) : 0;
      frame.style.height = `${Math.max(scrollHeight, 1122)}px`;
    };

    measure();
    window.setTimeout(measure, 200);
  }, []);

  useEffect(() => {
    toolbarStateRef.current = toolbarState;
  }, [toolbarState]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedOverrides(customHtmlOverrides);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [customHtmlOverrides]);

  const getFrameDocument = useCallback((): Document | null => {
    const frame = previewFrameRef.current;
    if (!frame) {
      return null;
    }
    return frame.contentDocument || frame.contentWindow?.document || null;
  }, []);

  const getUniqueSelector = useCallback(
    (element: HTMLElement): string | null => {
      const doc = getFrameDocument();
      if (!doc) {
        return null;
      }
      const segments: string[] = [];
      let el: HTMLElement | null = element;
      while (el && el !== doc.body) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
          selector += `#${el.id}`;
          segments.unshift(selector);
          break;
        }
        const parent = el.parentElement as HTMLElement | null;
        if (!parent) {
          break;
        }
        const siblings = Array.from(parent.children).filter((child) => {
          const childElement = child as HTMLElement;
          return childElement.tagName === el!.tagName;
        });
        if (siblings.length > 1) {
          const index = siblings.indexOf(el) + 1;
          selector += `:nth-of-type(${index})`;
        }
        segments.unshift(selector);
        el = parent;
      }
      return segments.length ? segments.join(" > ") : null;
    },
    [getFrameDocument],
  );

  const saveOverrideForElement = useCallback((element: HTMLElement) => {
    const selector = element.getAttribute("data-edit-selector");
    if (!selector) {
      return;
    }
    setCustomHtmlOverrides((prev) => ({
      ...prev,
      [selector]: element.innerHTML,
    }));
  }, []);

  const applyOverridesToDocument = useCallback(() => {
    const doc = getFrameDocument();
    if (!doc) {
      return;
    }

    const mergedEdits = {
      ...(data.customDocumentEdits ||
        (
          data.propertyAnalysis as
            | (typeof data.propertyAnalysis & {
                __customDocumentEdits?: Record<string, string>;
              })
            | undefined
        )?.__customDocumentEdits ||
        {}),
      ...customHtmlOverrides,
    };

    Object.entries(mergedEdits).forEach(([selector, html]) => {
      if (typeof selector !== "string" || typeof html !== "string") {
        return;
      }
      try {
        const elements = doc.querySelectorAll(selector);
        if (!elements.length) {
          return;
        }
        // Security: Sanitize HTML before injection to prevent XSS
        const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
        elements.forEach((element) => {
          element.innerHTML = sanitizedHtml;
        });
      } catch (error) {
        console.warn("Failed to apply custom edit selector:", selector, error);
      }
    });

    const frameWindow = doc.defaultView as any;
    if (frameWindow?.__applyAutoPagination) {
      frameWindow.__applyAutoPagination(true);
    }
    if (frameWindow?.__applyPageNumbers) {
      frameWindow.__applyPageNumbers(true);
    }
  }, [customHtmlOverrides, data, getFrameDocument]);

  useEffect(() => {
    applyOverridesToDocument();
  }, [applyOverridesToDocument]);

  const showToolbarForElement = useCallback(
    (element: HTMLElement, mode: ToolbarMode) => {
      const selector = element.getAttribute("data-edit-selector");
      if (!selector) {
        return;
      }
      setToolbarState({
        visible: true,
        mode,
        targetSelector: selector,
      });
    },
    [],
  );

  const handleDomFocus = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      target.dataset.prevBackground = target.style.backgroundColor || "";
      target.dataset.prevOutline = target.style.outline || "";
      target.style.backgroundColor = "rgba(191, 219, 254, 0.45)";
      target.style.outline = "2px solid rgba(37, 99, 235, 0.65)";

      // Check if this is a custom table cell
      const customTableContainer = target.closest(".custom-table-container");
      if (
        customTableContainer &&
        (target.tagName === "TD" || target.tagName === "TH")
      ) {
        const tableId = customTableContainer.getAttribute(
          "data-custom-table-id",
        );
        const row = parseInt(target.getAttribute("data-row") || "-1", 10);
        const col = parseInt(target.getAttribute("data-col") || "-1", 10);

        if (tableId) {
          setCurrentTableCell({ tableId, row, col });
          showToolbarForElement(target, "table");
          return;
        }
      }

      // Not a custom table cell - clear table state and show text toolbar
      setCurrentTableCell(null);
      showToolbarForElement(target, "text");
    },
    [showToolbarForElement],
  );

  const handleDomBlur = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      target.style.backgroundColor = target.dataset.prevBackground || "";
      target.style.outline = target.dataset.prevOutline || "";
      delete target.dataset.prevBackground;
      delete target.dataset.prevOutline;

      if (target.classList.contains("address")) {
        const newText = target.innerText;
        const parts = newText.split(",");
        if (parts.length >= 2) {
          const streetAndNum = parts[0].trim().split(" ");
          const buildingNumber = streetAndNum.pop() || "";
          const street = streetAndNum.join(" ");
          const city = parts[parts.length - 1].trim();
          onDataChange({ street, buildingNumber, city });
        }
      }

      saveOverrideForElement(target);
    },
    [onDataChange, saveOverrideForElement],
  );

  const clearToolbarTarget = useCallback(() => {
    setToolbarState((prev) => ({
      visible: prev.visible,
      mode: prev.mode === "image" ? "text" : prev.mode,
      targetSelector: undefined,
    }));
  }, []);

  const hideToolbar = useCallback(() => {
    setToolbarState((prev) => ({
      visible: false,
      mode: prev.mode,
      targetSelector: undefined,
    }));
  }, []);

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      const frameWindow = previewFrameRef.current?.contentWindow;
      const doc = getFrameDocument();
      const selector = toolbarStateRef.current.targetSelector;
      if (!frameWindow || !doc || !selector) {
        return;
      }
      const target = doc.querySelector(selector) as HTMLElement | null;
      if (target) {
        target.focus();
      }
      frameWindow.focus();
      const executed = frameWindow.document.execCommand(command, false, value);
      if (!executed && command === "hiliteColor") {
        frameWindow.document.execCommand(
          "backColor",
          false,
          value || "#fff3bf",
        );
      }
      if (selector) {
        const target = doc.querySelector(selector) as HTMLElement | null;
        if (target) {
          saveOverrideForElement(target);
        }
      }
    },
    [getFrameDocument, saveOverrideForElement],
  );

  const adjustFontSize = useCallback(
    (direction: "up" | "down") => {
      const doc = getFrameDocument();
      if (!doc || toolbarStateRef.current.mode !== "text") {
        return;
      }
      const selector = toolbarStateRef.current.targetSelector;
      if (!selector) {
        return;
      }
      const selection = doc.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }
      const range = selection.getRangeAt(0);
      const wrapper = doc.createElement("span");
      wrapper.style.display = "inline";
      wrapper.style.fontSize = direction === "up" ? "115%" : "90%";
      try {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        selection.removeAllRanges();
        const newRange = doc.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
        const container = wrapper.closest(
          "[data-edit-selector]",
        ) as HTMLElement | null;
        if (container) {
          saveOverrideForElement(container);
        }
      } catch {
        // Ignore wrapping errors
      }
    },
    [getFrameDocument, saveOverrideForElement],
  );

  const handleImageResize = useCallback(
    (mode: "full" | "half" | "third") => {
      const doc = getFrameDocument();
      const selector = toolbarStateRef.current.targetSelector;
      if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
        return;
      }
      const container = doc.querySelector(selector) as HTMLElement | null;
      if (!container) {
        return;
      }
      const img = container.querySelector("img") as HTMLImageElement | null;
      if (!img) {
        return;
      }
      const width = mode === "full" ? "100%" : mode === "half" ? "50%" : "33%";
      img.style.width = width;
      img.style.height = "auto";
      saveOverrideForElement(container);
    },
    [getFrameDocument, saveOverrideForElement],
  );

  const handleImageReplace = useCallback(() => {
    const doc = getFrameDocument();
    const selector = toolbarStateRef.current.targetSelector;
    if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
      return;
    }
    const container = doc.querySelector(selector) as HTMLElement | null;
    if (!container) {
      return;
    }
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      // Security: Validate file type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        alert("סוג קובץ לא נתמך. יש להעלות JPG, PNG, GIF או WebP");
        return;
      }

      // Security: Validate file size
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        alert("הקובץ גדול מדי. הגודל המרבי הוא 10MB");
        return;
      }

      // Security: Validate image can be loaded (prevents polyglot attacks)
      const isValidImage = await new Promise<boolean>((resolve) => {
        const testImg = new Image();
        const objectUrl = URL.createObjectURL(file);
        testImg.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
        testImg.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        };
        testImg.src = objectUrl;
      });

      if (!isValidImage) {
        alert("הקובץ אינו תמונה תקינה");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;
        if (result) {
          img.src = result;
          saveOverrideForElement(container);
          if (container.classList.contains("cover-image-frame")) {
            onDataChange({ selectedImagePreview: result });
          }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [getFrameDocument, onDataChange, saveOverrideForElement]);

  const handleImageReset = useCallback(() => {
    const doc = getFrameDocument();
    const selector = toolbarStateRef.current.targetSelector;
    if (!doc || !selector || toolbarStateRef.current.mode !== "image") {
      return;
    }
    const container = doc.querySelector(selector) as HTMLElement | null;
    if (!container) {
      return;
    }
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      return;
    }
    img.style.removeProperty("width");
    img.style.removeProperty("height");
    saveOverrideForElement(container);
  }, [getFrameDocument, saveOverrideForElement]);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const settings: CompanySettings = await response.json();
          setCompanySettings(settings);
        }
      } catch (error) {
        console.warn("⚠️ Could not load user settings for preview:", error);
      }
    };

    fetchCompanySettings();
  }, []);

  // Memoize image-related data to detect changes
  const imageData = useMemo(
    () => ({
      propertyImages: data.propertyImages || [],
      selectedImagePreview: data.selectedImagePreview,
      interiorImages: data.interiorImages || [],
    }),
    [data.propertyImages, data.selectedImagePreview, data.interiorImages],
  );

  // Performance: Shallow array comparison (much faster than JSON.stringify for large image arrays)
  const arraysShallowEqual = useCallback((a: any[], b: any[]): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }, []);

  // Check if image data actually changed (pure computation - no side effects)
  const imageDataChanged = useMemo(() => {
    const prev = previousImageDataRef.current;
    const current = imageData;

    const imagesChanged = !arraysShallowEqual(
      prev.propertyImages,
      current.propertyImages,
    );
    const previewChanged =
      prev.selectedImagePreview !== current.selectedImagePreview;
    const interiorChanged = !arraysShallowEqual(
      prev.interiorImages,
      current.interiorImages,
    );

    return imagesChanged || previewChanged || interiorChanged;
  }, [imageData, arraysShallowEqual]);

  // Update the previous image data ref when images change (side effect in useEffect, not useMemo)
  useEffect(() => {
    if (imageDataChanged) {
      previousImageDataRef.current = {
        propertyImages: [...imageData.propertyImages],
        selectedImagePreview: imageData.selectedImagePreview,
        interiorImages: [...imageData.interiorImages],
      };
    }
  }, [imageDataChanged, imageData]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    // Clear any pending HTML update
    if (htmlUpdateTimerRef.current) {
      clearTimeout(htmlUpdateTimerRef.current);
    }

    // If images changed, update immediately (no debounce)
    if (imageDataChanged) {
      const mergedEdits = {
        ...(data.customDocumentEdits || {}),
        ...debouncedOverrides,
      };

      const mergedData = {
        ...data,
        customDocumentEdits: mergedEdits,
      };

      const html = generateDocumentHTML(
        mergedData as ValuationData,
        true,
        companySettings,
      );
      setHtmlContent(html);
      return;
    }

    // For text field changes, debounce the HTML update to prevent image reloads
    // This allows the user to type without reloading images on every keystroke
    htmlUpdateTimerRef.current = setTimeout(() => {
      const mergedEdits = {
        ...(data.customDocumentEdits || {}),
        ...debouncedOverrides,
      };

      const mergedData = {
        ...data,
        customDocumentEdits: mergedEdits,
      };

      const html = generateDocumentHTML(
        mergedData as ValuationData,
        true,
        companySettings,
      );
      setHtmlContent(html);
    }, 1000); // 1 second debounce for text field changes

    return () => {
      if (htmlUpdateTimerRef.current) {
        clearTimeout(htmlUpdateTimerRef.current);
      }
    };
  }, [data, companySettings, debouncedOverrides, isEditMode, imageDataChanged]);

  useEffect(() => {
    if (!isEditMode) {
      const existing =
        data.customDocumentEdits ||
        (
          data.propertyAnalysis as
            | (typeof data.propertyAnalysis & {
                __customDocumentEdits?: Record<string, string>;
              })
            | undefined
        )?.__customDocumentEdits ||
        {};
      setCustomHtmlOverrides(existing);
      setDebouncedOverrides(existing);
    }
  }, [data, isEditMode]);

  const toggleEditMode = useCallback(() => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    if (newEditMode) {
      setToolbarState({
        visible: true,
        mode: "text",
        targetSelector: undefined,
      });
    } else {
      hideToolbar();
    }

    // If disabling edit mode, remove contenteditable from all elements
    if (!newEditMode && previewFrameRef.current) {
      const iframe = previewFrameRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const editableElements = doc.querySelectorAll(
          '[contenteditable="true"]',
        );
        editableElements.forEach((el: Element) => {
          (el as HTMLElement).removeAttribute("contenteditable");
          (el as HTMLElement).style.cursor = "";
          (el as HTMLElement).style.backgroundColor = "";
          (el as HTMLElement).style.border = "";
        });
      }
    }
  }, [hideToolbar, isEditMode]);

  const applyEditableBindings = useCallback(() => {
    if (!isEditMode) {
      return;
    }
    const doc = getFrameDocument();
    if (!doc) {
      return;
    }

    const textSelectors = [
      "img",
      ".title-primary",
      ".title-secondary",
      ".address",
      ".sub-title",
      ".chapter-title",
      ".section-title",
      ".page-body p",
      ".page-note",
      ".info-grid p",
      ".valuation-card p",
      ".bullet-list li",
      "table td",
      "table th",
      ".custom-table-container td",
      ".custom-table-container th",
      ".custom-table-container .sub-title",
      ".rich-text",
    ];

    textSelectors.forEach((selector) => {
      const nodes = Array.from(doc.querySelectorAll(selector));
      nodes.forEach((node) => {
        const element = node as HTMLElement;
        if (!element || element.dataset.editBound === "true") {
          return;
        }
        if (
          element.closest(".page-header-brand") ||
          element.closest(".cover-footer")
        ) {
          return;
        }
        const selectorPath = getUniqueSelector(element);
        if (!selectorPath) {
          return;
        }
        element.dataset.editBound = "true";
        element.dataset.editSelector = selectorPath;
        element.setAttribute("contenteditable", "true");
        element.style.cursor = "text";
        element.addEventListener("focus", handleDomFocus);
        element.addEventListener("blur", handleDomBlur);
      });
    });

    const imageContainers = [
      ".cover-image-frame",
      ".media-card",
      ".media-gallery figure",
      ".valuation-card figure",
      ".section-block figure",
    ];

    const nodes = Array.from(doc.querySelectorAll(imageContainers.join(",")));
    nodes.forEach((node) => {
      const container = node as HTMLElement;
      if (!container) {
        return;
      }
      const selectorPath =
        container.getAttribute("data-edit-selector") ||
        getUniqueSelector(container);
      if (!selectorPath) {
        return;
      }
      container.dataset.editSelector = selectorPath;
      container.dataset.editBound = "true";
      const img = container.querySelector("img");
      if (img && !(img as HTMLElement).dataset.imageBound) {
        const htmlImg = img as HTMLImageElement;
        htmlImg.dataset.imageBound = "true";
        htmlImg.style.cursor = "pointer";
        htmlImg.style.pointerEvents = "auto";
        htmlImg.tabIndex = 0;
        htmlImg.setAttribute("role", "button");
        htmlImg.addEventListener("click", (event) => {
          if (!isEditMode) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const containerWithSelector = container.matches(
            "[data-edit-selector]",
          )
            ? container
            : (container.closest("[data-edit-selector]") as HTMLElement | null);
          const elementForToolbar = containerWithSelector || container;
          showToolbarForElement(elementForToolbar, "image");
        });
      }
    });

    // Bind click handlers to user-added footnotes for edit/delete
    const footnoteItems = doc.querySelectorAll(".page-footnotes p");
    footnoteItems.forEach((footnoteP) => {
      const element = footnoteP as HTMLElement;
      if (element.dataset.footnoteBound === "true") {
        return;
      }
      element.dataset.footnoteBound = "true";
      element.style.cursor = "pointer";

      element.addEventListener("click", (event) => {
        if (!isEditMode) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();

        // Find page number by traversing up to .page element
        const pageElement = element.closest(".page");
        if (!pageElement) return;

        const allPages = doc.querySelectorAll(".page");
        let pageNumber = 0;
        allPages.forEach((page, index) => {
          if (page === pageElement) {
            pageNumber = index + 1;
          }
        });
        if (!pageNumber) return;

        // Show edit/delete menu
        const action = prompt(
          "בחר פעולה:\n1 - עריכה\n2 - מחיקה\n\nהקלד 1 או 2:",
        );
        if (action === "1") {
          handleEditFootnoteRef.current?.(element, pageNumber);
        } else if (action === "2") {
          handleDeleteFootnoteRef.current?.(element, pageNumber);
        }
      });
    });
  }, [
    getFrameDocument,
    getUniqueSelector,
    handleDomBlur,
    handleDomFocus,
    isEditMode,
    showToolbarForElement,
  ]);

  const handleSelectionChange = useCallback(() => {
    if (!isEditMode) {
      return;
    }
    const doc = getFrameDocument();
    const frame = previewFrameRef.current;
    if (!doc || !frame) {
      return;
    }
    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbarState((prev) => ({ ...prev, visible: false }));
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return;
    }
    const containerNode =
      ((range.commonAncestorContainer as Element).closest?.(
        "[data-edit-selector]",
      ) as HTMLElement | null) ||
      (range.commonAncestorContainer.parentElement?.closest(
        "[data-edit-selector]",
      ) as HTMLElement | null);
    if (!containerNode) {
      return;
    }
    showToolbarForElement(containerNode, "text");
  }, [getFrameDocument, isEditMode, showToolbarForElement]);

  const handleDocumentClick = useCallback(
    (event: Event) => {
      if (!isEditMode) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        clearToolbarTarget();
        return;
      }
      if (target.closest('[data-edit-toolbar="true"]')) {
        return;
      }
      if (target.closest("img") && target.closest("[data-edit-selector]")) {
        return;
      }
      if (!target.closest("[data-edit-selector]")) {
        clearToolbarTarget();
      }
    },
    [clearToolbarTarget, isEditMode],
  );

  useEffect(() => {
    updateIframeHeight(previewFrameRef.current);

    if (!isEditMode) {
      hideToolbar();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    applyEditableBindings();

    const doc = getFrameDocument();
    if (!doc) {
      return;
    }

    const selectionHandler = () => handleSelectionChange();
    const clickHandler = (event: Event) => handleDocumentClick(event);
    doc.addEventListener("selectionchange", selectionHandler);
    doc.addEventListener("click", clickHandler, true);

    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    // Performance: Debounce MutationObserver to avoid excessive re-binding loops
    observerRef.current = new MutationObserver((mutations) => {
      // Skip if mutations are only attribute changes from our own bindings
      const hasRelevantMutation = mutations.some(
        (m) =>
          m.type === "childList" ||
          (m.type === "attributes" &&
            m.attributeName !== "data-edit-bound" &&
            m.attributeName !== "contenteditable"),
      );
      if (!hasRelevantMutation) return;

      // Debounce binding application
      if (bindingsDebounceRef.current) {
        clearTimeout(bindingsDebounceRef.current);
      }
      bindingsDebounceRef.current = setTimeout(() => {
        applyEditableBindings();
      }, 100);
    });
    observerRef.current.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    const delayed = window.setTimeout(() => {
      applyEditableBindings();
    }, 400);

    return () => {
      window.clearTimeout(delayed);
      // Clean up bindings debounce timer
      if (bindingsDebounceRef.current) {
        clearTimeout(bindingsDebounceRef.current);
        bindingsDebounceRef.current = null;
      }
      doc.removeEventListener("selectionchange", selectionHandler);
      doc.removeEventListener("click", clickHandler, true);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [
    applyEditableBindings,
    getFrameDocument,
    handleDocumentClick,
    handleSelectionChange,
    hideToolbar,
    htmlContent,
    isEditMode,
    updateIframeHeight,
  ]);

  const handleSave = useCallback(async () => {
    const sessionId = data.sessionId;
    if (!sessionId) {
      alert("לא ניתן לשמור - חסר מזהה סשן");
      return;
    }

    setIsSaving(true);
    try {
      // Merge custom edits with existing data
      const updatedData = {
        ...data,
        customDocumentEdits: customHtmlOverrides,
        propertyAnalysis: {
          ...data.propertyAnalysis,
          __customDocumentEdits: customHtmlOverrides,
        },
      };

      const response = await fetch(`/api/session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updatedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      // Update data with saved edits
      onDataChange({ customDocumentEdits: customHtmlOverrides });

      alert("✅ השינויים נשמרו בהצלחה!");
      setLastRefreshTime(new Date());

      // Exit edit mode after successful save
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("❌ שגיאה בשמירת השינויים");
    } finally {
      setIsSaving(false);
    }
  }, [customHtmlOverrides, data, onDataChange]);

  const handleRevert = useCallback(async () => {
    const sessionId = data.sessionId;
    if (!sessionId) {
      alert("לא ניתן לבטל - חסר מזהה סשן");
      return;
    }

    const hasLocalChanges = Object.keys(customHtmlOverrides).length > 0;
    const hasSavedChanges =
      !!data.customDocumentEdits ||
      !!(data.propertyAnalysis as PropertyAnalysisWithEdits | undefined)
        ?.__customDocumentEdits;

    if (!hasLocalChanges && !hasSavedChanges) {
      alert("אין שינויים לביטול");
      return;
    }

    const confirmed = window.confirm(
      "האם אתה בטוח שברצונך לבטל את כל השינויים? פעולה זו תמחק את כל השינויים מהמסד נתונים ולא ניתנת לביטול.",
    );
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      // Remove customDocumentEdits from the session data
      const updatedData = {
        ...data,
        customDocumentEdits: {},
        propertyAnalysis: {
          ...data.propertyAnalysis,
          __customDocumentEdits: {},
        },
      };

      const response = await fetch(`/api/session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updatedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to revert changes");
      }

      // Clear local state
      setCustomHtmlOverrides({});
      setDebouncedOverrides({});

      // Update parent component data
      onDataChange({ customDocumentEdits: {} });

      // Reload document without overrides
      setLastRefreshTime(new Date());

      // Exit edit mode
      setIsEditMode(false);

      alert("✅ כל השינויים בוטלו ונמחקו מהמסד נתונים");
    } catch (error) {
      console.error("Error reverting:", error);
      alert("❌ שגיאה בביטול השינויים");
    } finally {
      setIsSaving(false);
    }
  }, [customHtmlOverrides, data, onDataChange]);

  // Footnotes are handled by useFootnotes hook (imported above)

  // Handle inserting a custom table from CSV
  const handleInsertCustomTable = useCallback(
    (table: CustomTable) => {
      const existingTables = data.customTables || [];
      const updatedTables = [...existingTables, table];

      onDataChange({
        customTables: updatedTables,
      });

      alert(
        `✅ טבלה "${table.title || "ללא כותרת"}" נוספה בהצלחה! (${table.rows.length} שורות)`,
      );
    },
    [data, onDataChange],
  );

  // Export current table to CSV
  const handleExportTableToCSV = useCallback(() => {
    if (!currentTableCell) {
      alert("יש לבחור תא בטבלה לפני ייצוא");
      return;
    }

    const existingTables: CustomTable[] = data.customTables || [];
    const table = existingTables.find((t) => t.id === currentTableCell.tableId);

    if (!table) {
      alert("לא נמצאה הטבלה לייצוא");
      return;
    }

    // Build CSV content with proper escaping
    const escapeCSVField = (field: string): string => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const headerRow = table.headers.map(escapeCSVField).join(",");
    const dataRows = table.rows.map((row) => row.map(escapeCSVField).join(","));
    const csvContent = [headerRow, ...dataRows].join("\n");

    // Add BOM for Hebrew support in Excel
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Download the file
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table.title || "table"}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentTableCell, data]);

  // Table operations for custom tables
  const handleTableOperation = useCallback(
    (
      operation:
        | "addRow"
        | "deleteRow"
        | "addColumn"
        | "deleteColumn"
        | "deleteTable",
    ) => {
      if (!currentTableCell) {
        alert("יש לבחור תא בטבלה");
        return;
      }

      const { tableId, row, col } = currentTableCell;
      const existingTables: CustomTable[] = data.customTables || [];
      const tableIndex = existingTables.findIndex((t) => t.id === tableId);

      if (tableIndex === -1) {
        alert("לא נמצאה הטבלה");
        return;
      }

      const table = existingTables[tableIndex];

      let updatedTable: CustomTable | null = null;

      switch (operation) {
        case "addRow": {
          const newRow = new Array(table.headers.length).fill("");
          const insertIndex = row >= 0 ? row + 1 : table.rows.length;
          const newRows = [...table.rows];
          newRows.splice(insertIndex, 0, newRow);
          updatedTable = {
            ...table,
            rows: newRows,
            updatedAt: new Date().toISOString(),
          };
          break;
        }
        case "deleteRow": {
          if (row < 0 || table.rows.length <= 1) {
            alert("לא ניתן למחוק את השורה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            rows: table.rows.filter((_, idx) => idx !== row),
            updatedAt: new Date().toISOString(),
          };
          // Update currentTableCell to reflect deleted row
          // After deletion, new length = table.rows.length - 1, so max valid index = table.rows.length - 2
          const newLength = table.rows.length - 1;
          const newRowIndex = row >= newLength ? newLength - 1 : row;
          setCurrentTableCell((prev) =>
            prev ? { ...prev, row: Math.max(0, newRowIndex) } : null,
          );
          break;
        }
        case "addColumn": {
          const insertIndex = col >= 0 ? col + 1 : table.headers.length;
          const newHeaders = [...table.headers];
          newHeaders.splice(insertIndex, 0, "עמודה חדשה");
          const newRows = table.rows.map((r) => {
            const newRow = [...r];
            newRow.splice(insertIndex, 0, "");
            return newRow;
          });
          updatedTable = {
            ...table,
            headers: newHeaders,
            rows: newRows,
            updatedAt: new Date().toISOString(),
          };
          break;
        }
        case "deleteColumn": {
          if (col < 0 || table.headers.length <= 1) {
            alert("לא ניתן למחוק את העמודה היחידה");
            return;
          }
          updatedTable = {
            ...table,
            headers: table.headers.filter((_, idx) => idx !== col),
            rows: table.rows.map((r) => r.filter((_, idx) => idx !== col)),
            updatedAt: new Date().toISOString(),
          };
          // Update currentTableCell to reflect deleted column
          // After deletion, new length = table.headers.length - 1, so max valid index = table.headers.length - 2
          const newLength = table.headers.length - 1;
          const newColIndex = col >= newLength ? newLength - 1 : col;
          setCurrentTableCell((prev) =>
            prev ? { ...prev, col: Math.max(0, newColIndex) } : null,
          );
          break;
        }
        case "deleteTable": {
          if (!confirm("האם אתה בטוח שברצונך למחוק את הטבלה?")) {
            return;
          }
          const updatedTables = existingTables.filter((t) => t.id !== tableId);
          onDataChange({ customTables: updatedTables });
          setCurrentTableCell(null);
          setToolbarState((prev) => ({ ...prev, mode: "text" }));
          return;
        }
      }

      if (updatedTable) {
        const updatedTables = [...existingTables];
        updatedTables[tableIndex] = updatedTable;
        onDataChange({ customTables: updatedTables });
      }
    },
    [currentTableCell, data, onDataChange],
  );

  // handleExportPDF and handleExportDOCX are now provided by useExport hook

  const handleManualRefresh = useCallback(async () => {
    const sessionId = data.sessionId;
    if (!sessionId) {
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/session/${sessionId}`);
      if (!response.ok) {
        return;
      }

      const freshSession = await response.json();
      const freshData = freshSession?.data || {};

      if (
        freshData.gisScreenshots &&
        JSON.stringify(freshData.gisScreenshots) !==
          JSON.stringify(data.gisScreenshots)
      ) {
        onDataChange({ gisScreenshots: freshData.gisScreenshots });
      }

      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [data, onDataChange]);

  const textToolbarButtons: Array<{
    icon: string;
    command: string;
    label: string;
  }> = [
    { icon: "B", command: "bold", label: "מודגש" },
    { icon: "I", command: "italic", label: "נטוי" },
    { icon: "U", command: "underline", label: "קו תחתון" },
    { icon: "•", command: "insertUnorderedList", label: "רשימת תבליטים" },
    { icon: "1.", command: "insertOrderedList", label: "רשימה ממוספרת" },
    { icon: "↔︎", command: "justifyFull", label: "יישור מלא" },
    { icon: "⇤", command: "justifyRight", label: "יישור לימין" },
    { icon: "⇥", command: "justifyCenter", label: "יישור למרכז" },
  ];

  const handleIframeLoad = useCallback(() => {
    updateIframeHeight(previewFrameRef.current);
    applyOverridesToDocument();

    // Apply edit bindings if in edit mode - ensures bindings are ready after iframe reload
    if (isEditMode) {
      // Use setTimeout to ensure DOM is fully settled
      window.setTimeout(() => {
        applyEditableBindings();
      }, 100);
    }
  }, [
    applyOverridesToDocument,
    applyEditableBindings,
    isEditMode,
    updateIframeHeight,
  ]);

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-[1400px] mx-auto flex flex-col h-full">
      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center sticky top-0 z-50">
        <div>
          <h3 className="text-sm font-medium text-gray-700">
            תצוגה מקדימה של הדוח
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            התצוגה משקפת במדויק את ה-PDF המופק מן השרת.
          </p>
          {lastRefreshTime && (
            <p className="text-xs text-green-600 mt-1">
              עודכן לאחרונה: {lastRefreshTime.toLocaleTimeString("he-IL")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data.sessionId && (
            <>
              {/* Export buttons group */}
              <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
                <button
                  onClick={() => handleExportPDF(false)}
                  disabled={isExporting}
                  className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                    isExporting
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-slate-700 text-white hover:bg-slate-800"
                  }`}
                  title="ייצא PDF (Puppeteer)"
                >
                  {isExporting ? "מייצא..." : "PDF"}
                </button>
                <button
                  onClick={() => handleExportPDF(true)}
                  disabled={isExporting}
                  className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                    isExporting
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-slate-600 text-white hover:bg-slate-700"
                  }`}
                  title="ייצא PDF (React-PDF)"
                >
                  {isExporting ? "מייצא..." : "PDF+"}
                </button>
                <button
                  onClick={handleExportDOCX}
                  disabled={isExporting}
                  className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                    isExporting
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-slate-500 text-white hover:bg-slate-600"
                  }`}
                  title="ייצא Word"
                >
                  {isExporting ? "מייצא..." : "Word"}
                </button>
              </div>

              {/* Refresh button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                  isRefreshing
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
                title="רענן נתונים"
              >
                {isRefreshing ? "מרענן..." : "רענן"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit toolbar */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEditMode}
            className={`h-8 px-4 text-xs font-semibold rounded-md transition-all ${
              isEditMode
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
            title={isEditMode ? "סגור מצב עריכה" : "כניסה למצב עריכה"}
          >
            {isEditMode ? "סגור עריכה" : "עריכה"}
          </button>

          {isEditMode && (
            <>
              <div className="w-px h-6 bg-gray-300" />

              <button
                onClick={handleSave}
                disabled={
                  isSaving || Object.keys(customHtmlOverrides).length === 0
                }
                className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                  isSaving || Object.keys(customHtmlOverrides).length === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                title={
                  Object.keys(customHtmlOverrides).length === 0
                    ? "אין שינויים"
                    : "שמור שינויים"
                }
              >
                {isSaving
                  ? "שומר..."
                  : `שמור (${Object.keys(customHtmlOverrides).length})`}
              </button>

              <button
                onClick={handleRevert}
                disabled={
                  isSaving ||
                  (Object.keys(customHtmlOverrides).length === 0 &&
                    !data.customDocumentEdits &&
                    !(
                      data.propertyAnalysis as
                        | PropertyAnalysisWithEdits
                        | undefined
                    )?.__customDocumentEdits)
                }
                className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                  isSaving ||
                  (Object.keys(customHtmlOverrides).length === 0 &&
                    !data.customDocumentEdits &&
                    !(
                      data.propertyAnalysis as
                        | PropertyAnalysisWithEdits
                        | undefined
                    )?.__customDocumentEdits)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-red-600 border border-red-300 hover:bg-red-50"
                }`}
                title="בטל שינויים"
              >
                {isSaving ? "מבטל..." : "בטל"}
              </button>

              <div className="w-px h-6 bg-gray-300" />

              <button
                onClick={handleAddFootnote}
                className="h-8 px-3 text-xs font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
                title="הוסף הערת שוליים"
              >
                הערת שוליים
              </button>

              <button
                onClick={() => setShowCSVUploadDialog(true)}
                className="h-8 px-3 text-xs font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all"
                title="הוסף טבלה מ-CSV"
              >
                טבלה מ-CSV
              </button>

              <div className="w-px h-6 bg-gray-300" />

              <span className="text-xs text-gray-500">
                לחץ על טקסט או תמונה לעריכה
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-4 overflow-auto flex-1 min-h-0">
        {!htmlContent ? (
          <div
            className="w-full border border-gray-200 rounded shadow-sm bg-gray-50 mx-auto flex flex-col items-center justify-center"
            style={{ minHeight: "1122px", width: "100%", maxWidth: "1200px" }}
            dir="rtl"
          >
            <div className="text-center p-8">
              <div className="text-6xl mb-4 opacity-50">📄</div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                טוען את התצוגה המקדימה...
              </h3>
              <p className="text-gray-500 text-sm">
                {!data.sessionId
                  ? "לא נמצא מזהה סשן. יש לחזור לשלב קודם ולהתחיל מחדש."
                  : "המסמך בתהליך הכנה. אנא המתן..."}
              </p>
              {!data.sessionId && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  שגיאה: חסר מזהה סשן. לא ניתן לטעון את המסמך.
                </div>
              )}
            </div>
          </div>
        ) : (
          <iframe
            ref={previewFrameRef}
            srcDoc={htmlContent}
            className="w-full border border-gray-200 rounded shadow-sm bg-white mx-auto"
            style={{ minHeight: "1122px", width: "100%", maxWidth: "1200px" }}
            title="Document preview"
            onLoad={handleIframeLoad}
          />
        )}
        {isEditMode && (
          <FloatingToolbar
            toolbarState={toolbarState}
            onHide={hideToolbar}
            onExecuteCommand={executeCommand}
            onAdjustFontSize={adjustFontSize}
            onTableOperation={handleTableOperation}
            onExportTableToCSV={handleExportTableToCSV}
            onImageResize={handleImageResize}
            onImageReplace={handleImageReplace}
            onImageReset={handleImageReset}
          />
        )}
        <style jsx global>{`
          iframe {
            background: #ffffff;
          }
        `}</style>
      </div>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        isOpen={showCSVUploadDialog}
        onClose={() => setShowCSVUploadDialog(false)}
        onTableInsert={handleInsertCustomTable}
      />
    </div>
  );
}
