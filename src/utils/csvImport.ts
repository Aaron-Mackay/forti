/**
 * Parses CSV or TSV text into candidate library link rows.
 *
 * Rules:
 * - Delimiter is auto-detected: tab if any tab characters appear in the first
 *   non-empty line, otherwise comma.
 * - If the first row contains recognised header names (name/title and url/link,
 *   case-insensitive) those columns are used; otherwise columns 0 and 1 are
 *   treated as name and url respectively.
 * - Rows where both name and url are empty (after trimming) are silently dropped.
 * - Every other row is returned; invalid rows carry an `error` string.
 */

export interface CsvRow {
  title: string;
  url: string;
  /** Present when the row is invalid and should be skipped on import. */
  error?: string;
}

const NAME_ALIASES = new Set(['name', 'title', 'label']);
const URL_ALIASES = new Set(['url', 'link', 'href']);

/** Split one comma-separated line, respecting double-quoted fields. */
function splitCsv(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Escaped quote inside a quoted field ("" → ")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function splitLine(line: string, delimiter: '\t' | ','): string[] {
  if (delimiter === '\t') return line.split('\t').map((s) => s.trim());
  return splitCsv(line);
}

export function parseLibraryCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  const delimiter: '\t' | ',' = lines[0].includes('\t') ? '\t' : ',';
  const firstCols = splitLine(lines[0], delimiter).map((s) => s.toLowerCase());

  // Detect header row
  let nameIdx = -1;
  let urlIdx = -1;
  for (let i = 0; i < firstCols.length; i++) {
    if (NAME_ALIASES.has(firstCols[i]) && nameIdx === -1) nameIdx = i;
    if (URL_ALIASES.has(firstCols[i]) && urlIdx === -1) urlIdx = i;
  }

  const hasHeader = nameIdx !== -1 || urlIdx !== -1;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Fall back to positional columns if no header recognised
  if (nameIdx === -1) nameIdx = 0;
  if (urlIdx === -1) urlIdx = 1;

  const rows: CsvRow[] = [];
  for (const line of dataLines) {
    const cols = splitLine(line, delimiter);
    const title = (cols[nameIdx] ?? '').trim();
    const url = (cols[urlIdx] ?? '').trim();

    // Drop fully-empty rows silently
    if (!title && !url) continue;

    if (!title) {
      rows.push({ title, url, error: 'Missing name' });
    } else if (!url) {
      rows.push({ title, url, error: 'Missing URL' });
    } else if (!/^https?:\/\/.+/.test(url)) {
      rows.push({ title, url, error: 'URL must start with http:// or https://' });
    } else {
      rows.push({ title, url });
    }
  }
  return rows;
}
