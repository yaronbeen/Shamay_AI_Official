/**
 * Comparables table generator for market comparison display
 */

import type { ValuationData } from "@/types/valuation";
import { formatDateNumeric, parseNumeric } from "../utils/formatters";
import { normalizeText } from "../utils/text";
import { formatBlockParcelFromString } from "../../comparable-data-formatter";

/**
 * Creates the comparables (market comparison) table HTML.
 *
 * @param data - The valuation data containing comparable transactions
 * @returns HTML string for the comparables table
 */
export const createComparablesTable = (data: ValuationData): string => {
  const items: Array<Record<string, unknown>> = Array.isArray(
    (data as ValuationData & { comparableData?: unknown[] }).comparableData ||
      (data as ValuationData & { comparable_data?: unknown[] }).comparable_data,
  )
    ? (((data as ValuationData & { comparableData?: unknown[] })
        .comparableData ||
        (data as ValuationData & { comparable_data?: unknown[] })
          .comparable_data) as Array<Record<string, unknown>>)
    : [];

  if (!items.length) {
    return `
      <p class="muted">נתוני השוואה יוצגו לאחר הזנה במערכת</p>
    `;
  }

  const rows = items.slice(0, 10).map((item) => {
    // Parse sale date - backend returns sale_day (prioritize this)
    const saleDate = formatDateNumeric(
      (item.sale_day as string) ||
        (item.sale_date as string) ||
        (item.date as string) ||
        (item.transaction_date as string) ||
        (item.saleDate as string),
    );

    // Format gush/chelka using the formatter function
    // If block_of_land exists, use formatBlockParcelFromString to convert "007113-0009-010-00" → "7113/9"
    const rawBlockOfLand =
      (item.block_of_land as string) || (item.gush_chelka_code as string);
    const gushChelka = rawBlockOfLand
      ? formatBlockParcelFromString(rawBlockOfLand)
      : normalizeText(
          (item.gush_chelka as string) ||
            (item.block_lot as string) ||
            (item.gushChelka as string),
          "—",
        );

    // Parse address - backend returns address (constructed from asset_details or settlement)
    const address = normalizeText(
      (item.address as string) ||
        (item.street_address as string) ||
        (item.streetAddress as string),
      "—",
    );

    // Parse rooms - backend returns rooms (numeric)
    const rooms = normalizeText(
      (item.rooms as string) || (item.room_count as string),
      "—",
    );

    // Parse floor - backend returns floor (from asset_details, may be null)
    const floor = normalizeText(
      (item.floor as string) ||
        (item.floor_number as string) ||
        (item.floor_num as string) ||
        (item.floorNumber as string),
      "—",
    );

    // Parse size - backend returns surface (numeric, prioritize this)
    const size = normalizeText(
      (item.surface as string) ||
        (item.size as string) ||
        (item.area as string) ||
        (item.sqm as string) ||
        (item.sizeInSqm as string) ||
        (item.apartmentArea as string),
      "—",
    );

    // Parse build year - backend returns year_of_constru (from year_of_construction, prioritize this)
    const buildYear = normalizeText(
      (item.year_of_constru as string) ||
        (item.year_of_construction as string) ||
        (item.building_year as string) ||
        (item.year_built as string) ||
        (item.construction_year as string) ||
        (item.buildYear as string) ||
        (item.constructionYear as string),
      "—",
    );

    // Parse prices safely (handles strings from backend)
    const salePrice = parseNumeric(
      (item.price as string | number) ||
        (item.declared_price as string | number) ||
        (item.sale_value_nis as string | number) ||
        (item.estimated_price_ils as string | number),
    );
    const price =
      salePrice > 0 ? `₪ ${salePrice.toLocaleString("he-IL")}` : "—";

    const pricePerSqmValue = parseNumeric(
      item.price_per_sqm as string | number,
    );
    const pricePerSqm =
      pricePerSqmValue > 0
        ? `₪ ${(Math.round(pricePerSqmValue / 100) * 100).toLocaleString("he-IL")}`
        : "—";

    return `
      <tr>
        <td>${saleDate}</td>
        <td class="address-cell">${address}</td>
        <td>${gushChelka}</td>
        <td>${rooms}</td>
        <td>${floor}</td>
        <td>${size}</td>
        <td>${buildYear}</td>
        <td>${price}</td>
        <td>${pricePerSqm}</td>
      </tr>
    `;
  });

  return `
    <table class="table comparables">
      <thead>
        <tr>
          <th>יום מכירה</th>
          <th class="address-cell">כתובת</th>
          <th>גו"ח</th>
          <th>חדרים</th>
          <th>קומה</th>
          <th>שטח דירה (מ"ר)</th>
          <th>שנת בניה</th>
          <th>מחיר עסקה</th>
          <th>מחיר למ"ר, במעוגל</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
};
