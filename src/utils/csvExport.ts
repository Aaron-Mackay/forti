/**
 * CSV building utilities.
 *
 * Produces RFC 4180-compliant CSV strings with a UTF-8 BOM prefix so that
 * Excel opens files without manual encoding configuration.
 */

/** Escape a single cell value. Strings containing commas, newlines, or
 *  double-quotes are wrapped in double-quotes per RFC 4180. */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a complete CSV string from a header array and data rows. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const bom = '\uFEFF';
  const headerRow = headers.map(escapeCsvCell).join(',');
  const dataRows = rows.map(row => row.map(escapeCsvCell).join(','));
  return bom + [headerRow, ...dataRows].join('\r\n');
}
