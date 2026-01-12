/**
 * Footnote management hook for EditableDocumentPreview
 * Handles adding, editing, and deleting footnotes
 */

import { useCallback, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { DOMPURIFY_CONFIG } from "../types";
import { ValuationData } from "@/types/valuation";

interface UseFootnotesProps {
  data: ValuationData;
  onDataChange: (updates: Partial<ValuationData>) => void;
  previewFrameRef: React.RefObject<HTMLIFrameElement>;
  setCustomHtmlOverrides: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

export function useFootnotes({
  data,
  onDataChange,
  previewFrameRef,
  setCustomHtmlOverrides,
}: UseFootnotesProps) {
  // Refs for footnote handlers to avoid stale closures in event listeners
  const handleEditFootnoteRef = useRef<
    ((footnoteP: HTMLElement, pageNumber: number) => void) | null
  >(null);
  const handleDeleteFootnoteRef = useRef<
    ((footnoteP: HTMLElement, pageNumber: number) => void) | null
  >(null);

  // Edit existing footnote
  const handleEditFootnote = useCallback(
    (footnoteP: HTMLElement, pageNumber: number) => {
      const numberSpan = footnoteP.querySelector(".footnote-number");
      const footnoteNumber = parseInt(
        numberSpan?.textContent?.replace(".", "") || "0",
        10,
      );
      if (!footnoteNumber) return;

      const currentText =
        footnoteP.textContent?.replace(/^\d+\.\s*/, "").trim() || "";

      const newText = prompt("ערוך את הערת השוליים:", currentText);
      if (newText === null) return;
      if (newText.trim() === "") {
        alert("טקסט הערת השוליים לא יכול להיות ריק");
        return;
      }

      const textNode = Array.from(footnoteP.childNodes).find(
        (n) => n.nodeType === Node.TEXT_NODE,
      );
      if (textNode) {
        textNode.textContent = ` ${newText.trim()}`;
      }

      const footnotesContainer = footnoteP.closest(".page-footnotes");
      if (footnotesContainer) {
        const pageSelector = `section:nth-of-type(${pageNumber})`;
        setCustomHtmlOverrides((prev) => ({
          ...prev,
          [`${pageSelector} .page-footnotes`]: DOMPurify.sanitize(
            footnotesContainer.innerHTML,
            DOMPURIFY_CONFIG,
          ),
        }));
      }

      const existingFootnotes = (data as any).structuredFootnotes || [];
      const updatedFootnotes = existingFootnotes.map((fn: any) =>
        fn.pageNumber === pageNumber && fn.footnoteNumber === footnoteNumber
          ? { ...fn, text: newText.trim() }
          : fn,
      );
      onDataChange({ structuredFootnotes: updatedFootnotes } as any);

      alert(`✅ הערת שוליים מספר ${footnoteNumber} עודכנה בהצלחה`);
    },
    [data, onDataChange, setCustomHtmlOverrides],
  );

  // Delete existing footnote
  const handleDeleteFootnote = useCallback(
    (footnoteP: HTMLElement, pageNumber: number) => {
      const numberSpan = footnoteP.querySelector(".footnote-number");
      const footnoteNumber = parseInt(
        numberSpan?.textContent?.replace(".", "") || "0",
        10,
      );
      if (!footnoteNumber) return;

      if (!confirm(`האם למחוק את הערת שוליים מספר ${footnoteNumber}?`)) return;

      const doc = previewFrameRef.current?.contentDocument;
      if (!doc) return;

      const allPages = doc.querySelectorAll(".page");
      const currentPage = allPages[pageNumber - 1];
      if (!currentPage) return;

      const supRefs = currentPage.querySelectorAll("sup.footnote-ref");
      supRefs.forEach((sup) => {
        if (sup.textContent === String(footnoteNumber)) {
          sup.remove();
        }
      });

      footnoteP.remove();

      const footnotesContainer = currentPage.querySelector(".page-footnotes");
      const pageSelector = `section:nth-of-type(${pageNumber})`;

      if (footnotesContainer && footnotesContainer.children.length > 0) {
        setCustomHtmlOverrides((prev) => ({
          ...prev,
          [`${pageSelector} .page-footnotes`]: DOMPurify.sanitize(
            footnotesContainer.innerHTML,
            DOMPURIFY_CONFIG,
          ),
        }));
      } else {
        footnotesContainer?.remove();
        setCustomHtmlOverrides((prev) => {
          const updated = { ...prev };
          delete updated[`${pageSelector} .page-footnotes`];
          return updated;
        });
      }

      const editableElements = currentPage.querySelectorAll(
        "[data-edit-selector]",
      );
      editableElements.forEach((el) => {
        const selector = el.getAttribute("data-edit-selector");
        if (selector) {
          setCustomHtmlOverrides((prev) => ({
            ...prev,
            [selector]: DOMPurify.sanitize(el.innerHTML, DOMPURIFY_CONFIG),
          }));
        }
      });

      const existingFootnotes = (data as any).structuredFootnotes || [];
      const updatedFootnotes = existingFootnotes.filter(
        (fn: any) =>
          !(
            fn.pageNumber === pageNumber && fn.footnoteNumber === footnoteNumber
          ),
      );
      onDataChange({ structuredFootnotes: updatedFootnotes } as any);

      alert(`✅ הערת שוליים מספר ${footnoteNumber} נמחקה בהצלחה`);
    },
    [data, onDataChange, previewFrameRef, setCustomHtmlOverrides],
  );

  // Add new footnote
  const handleAddFootnote = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame) {
      alert("לא ניתן להוסיף הערת שוליים - המסמך לא נטען");
      return;
    }

    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      alert("לא ניתן להוסיף הערת שוליים - המסמך לא נטען");
      return;
    }

    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert("יש לבחור מיקום בטקסט להוספת הערת שוליים");
      return;
    }

    if (!selection.isCollapsed) {
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        const confirmDelete = confirm(
          `הטקסט "${selectedText.substring(0, 50)}${selectedText.length > 50 ? "..." : ""}" יימחק. להמשיך?`,
        );
        if (!confirmDelete) {
          return;
        }
      }
    }

    const footnoteText = prompt("הכנס את טקסט הערת השוליים:");
    if (!footnoteText || footnoteText.trim() === "") {
      return;
    }

    const range = selection.getRangeAt(0);
    let currentPage = range.startContainer as Element;
    while (currentPage && !currentPage.classList?.contains("page")) {
      currentPage = currentPage.parentElement as Element;
    }

    if (!currentPage) {
      alert("לא ניתן לזהות את העמוד הנוכחי");
      return;
    }

    const allPages = doc.querySelectorAll(".page");
    let pageNumber = 1;
    allPages.forEach((page, idx) => {
      if (page === currentPage) {
        pageNumber = idx + 1;
      }
    });

    let footnotesContainer = currentPage.querySelector(".page-footnotes");

    const existingFootnoteRefs = currentPage.querySelectorAll(
      "sup.footnote-ref, .page-note sup",
    );
    const existingFootnoteNumbers = new Set(
      Array.from(existingFootnoteRefs)
        .map((el) => parseInt(el.textContent || "0", 10))
        .filter((n) => !isNaN(n) && n > 0),
    );

    if (footnotesContainer) {
      footnotesContainer.querySelectorAll(".footnote-number").forEach((el) => {
        const num = parseInt(el.textContent?.replace(".", "") || "0", 10);
        if (!isNaN(num) && num > 0) {
          existingFootnoteNumbers.add(num);
        }
      });
    }

    let footnoteNumber = 1;
    while (existingFootnoteNumbers.has(footnoteNumber)) {
      footnoteNumber++;
    }

    const pageSelector = `section:nth-of-type(${pageNumber})`;

    if (!footnotesContainer) {
      footnotesContainer = doc.createElement("div");
      footnotesContainer.className = "page-footnotes";
      footnotesContainer.setAttribute(
        "data-edit-selector",
        `${pageSelector} .page-footnotes`,
      );
      currentPage.appendChild(footnotesContainer);
    }

    const supElement = doc.createElement("sup");
    supElement.className = "footnote-ref";
    supElement.textContent = String(footnoteNumber);
    supElement.style.cssText =
      "font-size: 8pt; color: #1e3a8a; cursor: pointer;";

    range.collapse(false);
    range.insertNode(supElement);

    const footnoteP = doc.createElement("p");
    const numberSpan = doc.createElement("span");
    numberSpan.className = "footnote-number";
    numberSpan.style.fontWeight = "bold";
    numberSpan.textContent = `${footnoteNumber}.`;
    const textNode = doc.createTextNode(` ${footnoteText}`);
    footnoteP.appendChild(numberSpan);
    footnoteP.appendChild(textNode);
    footnotesContainer.appendChild(footnoteP);

    const editableParent = supElement.closest(
      "[data-edit-selector]",
    ) as Element | null;

    const updates: Record<string, string> = {
      [`${pageSelector} .page-footnotes`]: DOMPurify.sanitize(
        footnotesContainer!.innerHTML,
        DOMPURIFY_CONFIG,
      ),
    };

    if (editableParent && editableParent.getAttribute("data-edit-selector")) {
      const parentSelector = editableParent.getAttribute("data-edit-selector")!;
      updates[parentSelector] = DOMPurify.sanitize(
        editableParent.innerHTML,
        DOMPURIFY_CONFIG,
      );
    }

    setCustomHtmlOverrides((prev) => ({
      ...prev,
      ...updates,
    }));

    const existingFootnotes = (data as any).structuredFootnotes || [];
    const newFootnote = {
      id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pageNumber,
      footnoteNumber,
      text: footnoteText.trim(),
    };
    onDataChange({
      structuredFootnotes: [...existingFootnotes, newFootnote],
    } as any);

    selection.removeAllRanges();

    alert(`✅ הערת שוליים מספר ${footnoteNumber} נוספה בהצלחה`);
  }, [data, onDataChange, previewFrameRef, setCustomHtmlOverrides]);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    handleEditFootnoteRef.current = handleEditFootnote;
    handleDeleteFootnoteRef.current = handleDeleteFootnote;
  }, [handleEditFootnote, handleDeleteFootnote]);

  return {
    handleAddFootnote,
    handleEditFootnote,
    handleDeleteFootnote,
    handleEditFootnoteRef,
    handleDeleteFootnoteRef,
  };
}
