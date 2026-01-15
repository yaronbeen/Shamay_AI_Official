"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateValuationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LAST_ADDRESS_KEY = "shamay_last_address";

// Security: Sanitize user input to prevent XSS and injection attacks
function sanitizeInput(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim()
    .substring(0, maxLength);
}

// Security: Validate sessionId format to prevent open redirect
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

function parseAddress(address: string): {
  street: string;
  buildingNumber: string;
  city: string;
} {
  const parts = { street: "", buildingNumber: "", city: "" };
  if (!address) return parts;

  // First, extract city (last comma-separated segment)
  const cityMatch = address.match(/,\s*([^,]+)$/);
  if (cityMatch) {
    parts.city = cityMatch[1].trim();
  }

  // Get the street portion (everything before the city)
  const streetPortion = cityMatch
    ? address.substring(0, cityMatch.index).trim()
    : address.trim();

  // Look for building number at the END of the street portion
  // Common patterns: "רחוב הרצל 15" or "הרצל 15" or "הרצל 15א"
  const buildingMatch = streetPortion.match(/\s+(\d+[א-ת]?)$/);
  if (buildingMatch) {
    parts.buildingNumber = buildingMatch[1];
    parts.street = streetPortion
      .substring(0, buildingMatch.index)
      .trim()
      .replace(/^רחוב\s*/i, "");
  } else {
    parts.street = streetPortion.replace(/^רחוב\s*/i, "");
  }

  return parts;
}

export function CreateValuationModal({
  open,
  onOpenChange,
}: CreateValuationModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    addressFull: "",
    street: "",
    buildingNumber: "",
    city: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Handle modal open/close - load last address when opening, clear on close
  useEffect(() => {
    if (open) {
      // Load last address when modal opens
      const lastAddress = localStorage.getItem(LAST_ADDRESS_KEY);
      if (lastAddress) {
        const parsed = parseAddress(lastAddress);
        setFormData({
          title: "",
          addressFull: lastAddress,
          street: parsed.street,
          buildingNumber: parsed.buildingNumber,
          city: parsed.city,
        });
      }
    } else {
      // Clear form when modal closes
      setFormData({
        title: "",
        addressFull: "",
        street: "",
        buildingNumber: "",
        city: "",
      });
    }
  }, [open]);

  // פענח כתובת מלאה לשדות נפרדים
  const handleAddressChange = (addressFull: string) => {
    const parsed = parseAddress(addressFull);
    setFormData((prev) => ({
      ...prev,
      addressFull,
      street: parsed.street,
      buildingNumber: parsed.buildingNumber,
      city: parsed.city,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let createdSessionId: string | null = null;

    try {
      // Security: Sanitize all user inputs before sending to backend
      const sanitizedData = {
        street: sanitizeInput(formData.street, 200),
        buildingNumber: sanitizeInput(formData.buildingNumber, 20),
        city: sanitizeInput(formData.city, 100),
        addressFull: sanitizeInput(formData.addressFull, 500),
        valuationName: sanitizeInput(formData.title, 200),
      };

      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: sanitizedData }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      const { sessionId } = await sessionResponse.json();

      // Security: Validate sessionId format to prevent open redirect
      if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
        throw new Error("Invalid session ID returned from server");
      }

      createdSessionId = sessionId;

      // Create the valuation with the session ID
      const response = await fetch("/api/valuations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sanitizedData,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create valuation");
      }

      const { valuation } = await response.json();

      // שמור את הכתובת ב-localStorage לשימוש עתידי
      if (formData.addressFull) {
        localStorage.setItem(LAST_ADDRESS_KEY, formData.addressFull);
      }

      onOpenChange(false);
      // Navigate to the wizard with the session ID (already validated)
      window.location.href = `/wizard?sessionId=${encodeURIComponent(sessionId)}`;
    } catch (error) {
      console.error("Error creating valuation:", error);

      // Clean up orphaned session if it was created
      if (createdSessionId) {
        fetch(`/api/session/${createdSessionId}`, { method: "DELETE" }).catch(
          () =>
            console.warn(
              "Failed to clean up orphaned session:",
              createdSessionId,
            ),
        );
      }

      toast.error("שגיאה ביצירת השומה. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>שומה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">כותרת השומה *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="addressFull">כתובת מלאה *</Label>
            <Input
              id="addressFull"
              value={formData.addressFull}
              onChange={(e) => handleAddressChange(e.target.value)}
              required
              placeholder="לדוגמה: רחוב הרצל 15, תל אביב"
              dir="rtl"
            />
          </div>

          {/* שדות כתובת נפרדים - מתמלאים אוטומטית מהכתובת המלאה */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="street" className="text-xs text-gray-600">
                רחוב
              </Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, street: e.target.value }))
                }
                dir="rtl"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="buildingNumber" className="text-xs text-gray-600">
                מספר
              </Label>
              <Input
                id="buildingNumber"
                value={formData.buildingNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    buildingNumber: e.target.value,
                  }))
                }
                dir="rtl"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="city" className="text-xs text-gray-600">
                עיר
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                dir="rtl"
                className="text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 text-right">
            💡 גוש, חלקה ותת-חלקה ימולאו אוטומטית לאחר העלאת נסח הטאבו בשלב 2
          </p>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "יוצר..." : "צור שומה"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
