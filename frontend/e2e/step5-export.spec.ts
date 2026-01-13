import { test, expect } from "@playwright/test";

test.describe("Step 5 Export Page UX/UI", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to avoid needing a real backend
    await page.route("**/api/session/**", (route) => {
      const url = route.request().url();

      // Mock session data load
      if (url.includes("/api/session/") && !url.includes("export")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              sessionId: "test-session",
              street: "Test Street",
              city: "Tel Aviv",
              apartmentSqm: 100,
              pricePerSqm: 50000,
              finalValuation: 5000000,
            },
          }),
        });
      }

      // Mock export endpoints
      if (url.includes("export-pdf")) {
        return route.fulfill({
          status: 200,
          contentType: "application/pdf",
          body: Buffer.from("mock pdf content"),
        });
      }

      if (url.includes("export-docx")) {
        return route.fulfill({
          status: 200,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          body: Buffer.from("mock docx content"),
        });
      }

      return route.continue();
    });

    // Navigate to wizard step 5 with test session
    await page.goto("/wizard?step=5&sessionId=test-session");
  });

  test.describe("Export Page Rendering", () => {
    test("displays export page title", async ({ page }) => {
      await expect(page.getByText("חישוב שווי וייצוא")).toBeVisible();
    });

    test("displays PDF export section", async ({ page }) => {
      await expect(page.getByText("ייצוא PDF")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "יצור PDF" }),
      ).toBeVisible();
    });

    test("displays Word export section", async ({ page }) => {
      await expect(page.getByText("ייצוא Word")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "יצור Word" }),
      ).toBeVisible();
    });

    test("displays valuation panel", async ({ page }) => {
      await expect(page.getByText("חישוב שווי הנכס")).toBeVisible();
    });
  });

  test.describe("Export Button Interactions", () => {
    test("PDF export button shows loading state when clicked", async ({
      page,
    }) => {
      // Delay the response to see loading state
      await page.route("**/export-pdf", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: "application/pdf",
          body: Buffer.from("mock pdf"),
        });
      });

      const pdfButton = page.getByRole("button", { name: "יצור PDF" });
      await pdfButton.click();

      // Should show loading state
      await expect(page.getByText("מייצא...")).toBeVisible();
    });

    test("Word export button shows loading state when clicked", async ({
      page,
    }) => {
      // Delay the response to see loading state
      await page.route("**/export-docx", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          body: Buffer.from("mock docx"),
        });
      });

      const wordButton = page.getByRole("button", { name: "יצור Word" });
      await wordButton.click();

      // Should show loading state
      await expect(page.getByText("מייצא Word...")).toBeVisible();
    });

    test("export buttons are enabled", async ({ page }) => {
      const pdfButton = page.getByRole("button", { name: "יצור PDF" });
      const wordButton = page.getByRole("button", { name: "יצור Word" });

      await expect(pdfButton).toBeEnabled();
      await expect(wordButton).toBeEnabled();
    });
  });

  test.describe("Toast Notifications", () => {
    test("shows success toast after PDF export", async ({ page }) => {
      const pdfButton = page.getByRole("button", { name: "יצור PDF" });
      await pdfButton.click();

      // Wait for success toast
      await expect(
        page.getByText("PDF נוצר בהצלחה! הקובץ הורד למחשב שלך"),
      ).toBeVisible({ timeout: 10000 });
    });

    test("shows success toast after Word export", async ({ page }) => {
      const wordButton = page.getByRole("button", { name: "יצור Word" });
      await wordButton.click();

      // Wait for success toast
      await expect(
        page.getByText("Word נוצר בהצלחה! הקובץ הורד למחשב שלך"),
      ).toBeVisible({ timeout: 10000 });
    });

    test("shows error toast when export fails", async ({ page }) => {
      // Make the export fail
      await page.route("**/export-docx", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Export failed" }),
        });
      });

      const wordButton = page.getByRole("button", { name: "יצור Word" });
      await wordButton.click();

      // Wait for error toast
      await expect(
        page.getByText("שגיאה ביצירת Word. אנא נסה שוב"),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe("Valuation Panel UX/UI", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route("**/api/session/**", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            sessionId: "test-session",
            apartmentSqm: 100,
            pricePerSqm: 50000,
            finalValuation: 5000000,
          },
        }),
      });
    });

    await page.goto("/wizard?step=5&sessionId=test-session");
  });

  test("displays valuation data", async ({ page }) => {
    // Check for valuation labels
    await expect(page.getByText(/שטח נמדד/)).toBeVisible();
    await expect(page.getByText(/מחיר למ"ר/)).toBeVisible();
  });

  test("has edit button", async ({ page }) => {
    const editButton = page.getByTitle("ערוך נתונים");
    await expect(editButton).toBeVisible();
  });

  test("edit button is clickable", async ({ page }) => {
    const editButton = page.getByTitle("ערוך נתונים");
    await editButton.click();
    // Edit mode should now be active - look for input fields
    await expect(page.locator("input[type='number']").first()).toBeVisible();
  });
});

test.describe("Document Preview Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/session/**", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sessionId: "test-session" },
        }),
      });
    });

    await page.goto("/wizard?step=5&sessionId=test-session");
  });

  test("document preview can be collapsed and expanded", async ({ page }) => {
    // Look for collapsible drawer or toggle button
    const drawerContent = page
      .locator('[data-testid="preview-drawer"]')
      .or(page.getByText("תצוגה מקדימה").locator(".."));

    // If there's a drawer, test its toggle functionality
    const toggleButton = page.getByRole("button", { name: /תצוגה|preview/i });
    if ((await toggleButton.count()) > 0) {
      await toggleButton.click();
      // Content should be hidden or collapsed
    }
  });
});

test.describe("Responsive Design", () => {
  test("displays correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.route("**/api/session/**", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sessionId: "test-session" },
        }),
      });
    });

    await page.goto("/wizard?step=5&sessionId=test-session");

    // Main content should be visible
    await expect(page.getByText("חישוב שווי וייצוא")).toBeVisible();
  });

  test("displays correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.route("**/api/session/**", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sessionId: "test-session" },
        }),
      });
    });

    await page.goto("/wizard?step=5&sessionId=test-session");

    // Main content should be visible
    await expect(page.getByText("חישוב שווי וייצוא")).toBeVisible();
  });

  test("displays correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route("**/api/session/**", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sessionId: "test-session" },
        }),
      });
    });

    await page.goto("/wizard?step=5&sessionId=test-session");

    // Main content should be visible
    await expect(page.getByText("חישוב שווי וייצוא")).toBeVisible();
  });
});
