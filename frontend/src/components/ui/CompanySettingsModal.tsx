"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Settings, Upload, Trash2, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "./dialog";
import { Button } from "./button";

interface CompanySettings {
  companyLogo?: string;
  footerLogo?: string;
  signature?: string;
  companyName?: string;
  companySlogan?: string;
}

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

type LogoType = "company" | "footer" | "signature";

const LOGO_TYPE_LABELS: Record<LogoType, string> = {
  company: "לוגו חברה",
  footer: "לוגו תחתית",
  signature: "חתימת שמאי",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function CompanySettingsModal({
  isOpen,
  onClose,
  onSettingsUpdated,
}: CompanySettingsModalProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<LogoType, boolean>>({
    company: false,
    footer: false,
    signature: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const companyInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/user/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        setError("שגיאה בטעינת הגדרות");
      }
    } catch (err) {
      setError("שגיאה בטעינת הגדרות");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (type: LogoType, file: File) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("סוג קובץ לא נתמך. יש להעלות JPG, PNG, GIF או WebP");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError("הקובץ גדול מדי. הגודל המרבי הוא 5MB");
        return;
      }

      try {
        setUploading((prev) => ({ ...prev, [type]: true }));
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("/api/user/logo", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload logo");
        }

        // Reload settings to get updated URLs
        const settingsResponse = await fetch("/api/user/settings");
        if (settingsResponse.ok) {
          const updatedSettings = await settingsResponse.json();
          setSettings(updatedSettings);
        }

        setSuccessMessage(`${LOGO_TYPE_LABELS[type]} הועלה בהצלחה!`);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Notify parent to refresh document preview
        onSettingsUpdated();
      } catch (err) {
        setError(`שגיאה בהעלאת ${LOGO_TYPE_LABELS[type]}. נסה שוב.`);
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }));
      }
    },
    [onSettingsUpdated],
  );

  const handleDelete = useCallback(
    async (type: LogoType) => {
      if (!confirm(`האם למחוק את ${LOGO_TYPE_LABELS[type]}?`)) {
        return;
      }

      try {
        setUploading((prev) => ({ ...prev, [type]: true }));
        setError(null);

        // Delete by updating settings with null value
        const fieldMap: Record<LogoType, string> = {
          company: "companyLogo",
          footer: "footerLogo",
          signature: "signature",
        };

        const response = await fetch("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: {
              [fieldMap[type]]: null,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete logo");
        }

        // Reload settings
        const settingsResponse = await fetch("/api/user/settings");
        if (settingsResponse.ok) {
          const updatedSettings = await settingsResponse.json();
          setSettings(updatedSettings);
        }

        setSuccessMessage(`${LOGO_TYPE_LABELS[type]} נמחק בהצלחה`);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Notify parent to refresh document preview
        onSettingsUpdated();
      } catch (err) {
        setError(`שגיאה במחיקת ${LOGO_TYPE_LABELS[type]}. נסה שוב.`);
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }));
      }
    },
    [onSettingsUpdated],
  );

  const handleFileChange = useCallback(
    (type: LogoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(type, file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFileUpload],
  );

  const handleClose = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  }, [onClose]);

  const renderLogoSection = (
    type: LogoType,
    logoUrl: string | undefined,
    inputRef: React.RefObject<HTMLInputElement>,
  ) => {
    const isUploading = uploading[type];

    return (
      <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {LOGO_TYPE_LABELS[type]}
        </h4>

        {/* Preview */}
        <div className="w-32 h-24 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={LOGO_TYPE_LABELS[type]}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-300" />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={inputRef}
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange(type)}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="animate-spin">...</span>
            ) : (
              <>
                <Upload className="h-4 w-4 ml-1" />
                העלאה
              </>
            )}
          </Button>
          {logoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(type)}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Settings className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            הגדרות חברה
          </h2>
          <p className="text-sm text-gray-500">
            העלו לוגו חברה, לוגו תחתית וחתימה שיופיעו במסמך
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
            {successMessage}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderLogoSection(
                "company",
                settings?.companyLogo,
                companyInputRef as React.RefObject<HTMLInputElement>,
              )}
              {renderLogoSection(
                "footer",
                settings?.footerLogo,
                footerInputRef as React.RefObject<HTMLInputElement>,
              )}
              {renderLogoSection(
                "signature",
                settings?.signature,
                signatureInputRef as React.RefObject<HTMLInputElement>,
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
