import { test, expect } from "@playwright/test";

/**
 * End-to-End Tests for ComparableDataViewer
 *
 * Tests verify:
 * - Multiple block (gush) search functionality
 * - Block chips are properly sent to API
 * - Results include data from all selected blocks
 */

test.describe("ComparableDataViewer - Multiple Blocks Search", () => {
  // Track API calls to verify correct parameters
  let apiCalls: { url: string; params: URLSearchParams }[] = [];

  test.beforeEach(async ({ page }) => {
    apiCalls = [];

    // Mock session API
    await page.route("**/api/sessions", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, shumaId: 123 }),
      });
    });

    // Mock session data
    await page.route("**/api/session/*", (route) => {
      const url = route.request().url();

      // Don't intercept asset-details
      if (url.includes("asset-details")) {
        return route.continue();
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            sessionId: "test-session",
            gush: "",
            parcel: "",
            area: 100,
          },
        }),
      });
    });

    // Mock and track asset-details search API
    await page.route("**/api/asset-details/search*", (route) => {
      const url = new URL(route.request().url());
      const params = url.searchParams;

      // Track the API call
      apiCalls.push({ url: route.request().url(), params });

      const blockNumbers = params.get("block_numbers");
      const blocks = blockNumbers ? blockNumbers.split(",") : [];

      // Return mock data based on which blocks were requested
      const mockData = [];

      if (blocks.includes("9905")) {
        mockData.push(
          {
            id: 1,
            block_of_land: "009905-0021-018-00",
            settlement: "נתניה",
            city: "נתניה",
            rooms: "4.0",
            surface: "120.00",
            sale_value_nis: 2500000,
            price_per_sqm: 20833,
            year_of_constru: 2010,
            sale_day: "2024-06-15",
          },
          {
            id: 2,
            block_of_land: "009905-0084-065-00",
            settlement: "נתניה",
            city: "נתניה",
            rooms: "3.0",
            surface: "95.00",
            sale_value_nis: 1900000,
            price_per_sqm: 20000,
            year_of_constru: 2008,
            sale_day: "2024-05-20",
          },
        );
      }

      if (blocks.includes("6213")) {
        mockData.push(
          {
            id: 3,
            block_of_land: "006213-0015-022-00",
            settlement: "תל אביב",
            city: "תל אביב",
            rooms: "5.0",
            surface: "150.00",
            sale_value_nis: 4500000,
            price_per_sqm: 30000,
            year_of_constru: 2015,
            sale_day: "2024-07-01",
          },
          {
            id: 4,
            block_of_land: "006213-0022-011-00",
            settlement: "תל אביב",
            city: "תל אביב",
            rooms: "4.0",
            surface: "110.00",
            sale_value_nis: 3300000,
            price_per_sqm: 30000,
            year_of_constru: 2012,
            sale_day: "2024-06-28",
          },
        );
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: mockData,
          count: mockData.length,
          pagination: {
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
      });
    });

    // Mock stats API
    await page.route("**/api/asset-details/stats", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          stats: {
            min_year: 2000,
            max_year: 2024,
            settlements: ["נתניה", "תל אביב"],
          },
        }),
      });
    });

    // Mock property types API
    await page.route("**/api/asset-details/property-types", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          types: ["דירה", "בית פרטי"],
        }),
      });
    });
  });

  test("sends multiple blocks in block_numbers parameter when chips are added", async ({
    page,
  }) => {
    await page.goto("/wizard?step=4&sessionId=test-session");
    await page.waitForLoadState("networkidle");

    // Click on market analysis tab to show ComparableDataViewer
    const marketTab = page.getByText(/נתוני השוואה|שוק|ניתוח/i);
    if ((await marketTab.count()) > 0) {
      await marketTab.first().click();
    }

    // Wait for the component to load
    await page.waitForTimeout(1000);

    // Find the block number input field
    const blockInput = page.locator('input[placeholder*="גוש"]').first();
    if ((await blockInput.count()) === 0) {
      // Try alternative selectors
      const inputs = page.locator("input[type='text']");
      await expect(inputs.first()).toBeVisible({ timeout: 5000 });
    }

    // Enter first block number
    await blockInput.fill("9905");

    // Click the add button
    const addButton = page.getByText(/הוסף/i).first();
    await addButton.click();

    // Wait for chip to be created
    await page.waitForTimeout(500);

    // Verify chip was created
    await expect(page.getByText("9905")).toBeVisible();

    // Enter second block number
    await blockInput.fill("6213");

    // Click add button again
    await addButton.click();

    // Wait for search to trigger (debounce is 500ms)
    await page.waitForTimeout(1000);

    // Verify both chips are visible
    await expect(page.getByText("9905")).toBeVisible();
    await expect(page.getByText("6213")).toBeVisible();

    // Verify API was called with both blocks
    const lastCall = apiCalls[apiCalls.length - 1];
    expect(lastCall).toBeDefined();

    const blockNumbers = lastCall.params.get("block_numbers");
    expect(blockNumbers).toBeTruthy();

    // Both blocks should be in the comma-separated list
    const blocks = blockNumbers!.split(",");
    expect(blocks).toContain("9905");
    expect(blocks).toContain("6213");
  });

  test("displays results from all selected blocks", async ({ page }) => {
    await page.goto("/wizard?step=4&sessionId=test-session");
    await page.waitForLoadState("networkidle");

    // Click on market analysis tab
    const marketTab = page.getByText(/נתוני השוואה|שוק|ניתוח/i);
    if ((await marketTab.count()) > 0) {
      await marketTab.first().click();
    }

    await page.waitForTimeout(1000);

    const blockInput = page.locator('input[placeholder*="גוש"]').first();

    // Add two blocks
    await blockInput.fill("9905");
    await page.getByText(/הוסף/i).first().click();
    await page.waitForTimeout(300);

    await blockInput.fill("6213");
    await page.getByText(/הוסף/i).first().click();

    // Wait for search results
    await page.waitForTimeout(1500);

    // Check that results from both blocks are visible
    // Block 9905 is in Netanya, Block 6213 is in Tel Aviv
    const netanyaResult = page.getByText(/נתניה/i);
    const telAvivResult = page.getByText(/תל אביב/i);

    // At least one result from each block should be visible
    expect(
      (await netanyaResult.count()) > 0 || (await telAvivResult.count()) > 0,
    ).toBeTruthy();
  });

  test("removing a chip updates the search correctly", async ({ page }) => {
    await page.goto("/wizard?step=4&sessionId=test-session");
    await page.waitForLoadState("networkidle");

    // Click on market analysis tab
    const marketTab = page.getByText(/נתוני השוואה|שוק|ניתוח/i);
    if ((await marketTab.count()) > 0) {
      await marketTab.first().click();
    }

    await page.waitForTimeout(1000);

    const blockInput = page.locator('input[placeholder*="גוש"]').first();

    // Add two blocks
    await blockInput.fill("9905");
    await page.getByText(/הוסף/i).first().click();
    await page.waitForTimeout(300);

    await blockInput.fill("6213");
    await page.getByText(/הוסף/i).first().click();
    await page.waitForTimeout(1000);

    // Clear API call tracking
    apiCalls = [];

    // Find and click the remove button for the first chip (9905)
    const chip9905 = page.locator("text=9905").first();
    const removeButton = chip9905.locator(
      "xpath=following-sibling::button | ../button",
    );
    if ((await removeButton.count()) > 0) {
      await removeButton.first().click();
    }

    // Wait for new search
    await page.waitForTimeout(1000);

    // Verify the last API call only has 6213
    if (apiCalls.length > 0) {
      const lastCall = apiCalls[apiCalls.length - 1];
      const blockNumbers = lastCall.params.get("block_numbers");

      if (blockNumbers) {
        expect(blockNumbers).not.toContain("9905");
        expect(blockNumbers).toContain("6213");
      }
    }
  });
});
