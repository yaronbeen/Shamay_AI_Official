/**
 * Custom tables generator for user-uploaded CSV data
 */

/**
 * Custom table definition from user uploads.
 */
export interface CustomTable {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
}

/**
 * Escapes HTML for table content while preserving structure.
 */
const escapeHtmlForTable = (value: string | null | undefined): string => {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Generates HTML for a single custom table.
 *
 * @param table - The custom table definition
 * @returns HTML string for the table
 */
export const generateCustomTableHTML = (table: CustomTable): string => {
  const tableId = `custom-table-${table.id}`;

  const headerCells = table.headers
    .map((header) => `<th>${escapeHtmlForTable(header)}</th>`)
    .join("");

  const bodyRows = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtmlForTable(cell)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `
    <div id="${tableId}" class="custom-table-container section-block" data-custom-table-id="${table.id}">
      ${table.title ? `<div class="sub-title">${escapeHtmlForTable(table.title)}</div>` : ""}
      <table class="table">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates HTML for all custom tables section.
 *
 * @param customTables - Array of custom table definitions
 * @returns HTML string for the complete custom tables section
 */
export const generateAllCustomTablesHTML = (
  customTables?: CustomTable[],
): string => {
  if (!customTables || customTables.length === 0) {
    return "";
  }

  return `
    <section class="page custom-tables-section">
      <div class="chapter-title">נספחים - טבלאות מותאמות אישית</div>
      <div class="page-body">
        ${customTables.map((table) => generateCustomTableHTML(table)).join("\n")}
      </div>
    </section>
  `;
};
