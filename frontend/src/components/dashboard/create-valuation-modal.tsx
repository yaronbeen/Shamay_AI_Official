"use client";

import { useState, useEffect } from "react";
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

function parseAddress(address: string): {
  street: string;
  buildingNumber: string;
  city: string;
} {
  const parts = { street: "", buildingNumber: "", city: "" };
  if (!address) return parts;
  const buildingMatch = address.match(/(\d+)/);
  if (buildingMatch) {
    parts.buildingNumber = buildingMatch[1];
    parts.street = address
      .substring(0, buildingMatch.index)
      .trim()
      .replace(/^רחוב\s*/i, "");
  } else {
    parts.street = address
      .split(",")[0]
      .trim()
      .replace(/^רחוב\s*/i, "");
  }
  const cityMatch = address.match(/,\s*([^,]+)$/);
  if (cityMatch) parts.city = cityMatch[1].trim();
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

  // טען כתובת אחרונה כשהמודאל נפתח
  useEffect(() => {
    if (open) {
      const lastAddress = localStorage.getItem(LAST_ADDRESS_KEY);
      if (lastAddress) {
        const parsed = parseAddress(lastAddress);
        setFormData((prev) => ({
          ...prev,
          addressFull: lastAddress,
          street: parsed.street,
          buildingNumber: parsed.buildingNumber,
          city: parsed.city,
        }));
      }
    }
  }, [open]);

  // נקה את הטופס כשהמודאל נסגר
  useEffect(() => {
    if (!open) {
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

    try {
      // Use form data fields directly (already parsed or manually edited)
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            street: formData.street,
            buildingNumber: formData.buildingNumber,
            city: formData.city,
            addressFull: formData.addressFull,
            valuationName: formData.title,
          },
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      const { sessionId } = await sessionResponse.json();

      // Create the valuation with the session ID
      const response = await fetch("/api/valuations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sessionId: sessionId,
        }),
      });

      if (response.ok) {
        const { valuation } = await response.json();

        // שמור את הכתובת ב-localStorage לשימוש עתידי
        if (formData.addressFull) {
          localStorage.setItem(LAST_ADDRESS_KEY, formData.addressFull);
        }

        onOpenChange(false);
        // Navigate to the wizard with the session ID
        window.location.href = `/wizard?sessionId=${sessionId}`;
      }
    } catch (error) {
      console.error("Error creating valuation:", error);
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
            <Label htmlFor="title">כותרת השומה</Label>
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
          <div className="grid grid-cols-3 gap-2">
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "יוצר..." : "צור שומה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
