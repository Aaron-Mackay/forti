import { parseLibraryCsv } from './csvImport';

describe('parseLibraryCsv', () => {
  describe('empty / whitespace input', () => {
    it('returns empty array for empty string', () => {
      expect(parseLibraryCsv('')).toEqual([]);
    });

    it('returns empty array for whitespace-only input', () => {
      expect(parseLibraryCsv('   \n  \n  ')).toEqual([]);
    });
  });

  describe('header detection', () => {
    it('uses name and url columns when header is present', () => {
      const rows = parseLibraryCsv('name,url\nSquat Guide,https://example.com');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ title: 'Squat Guide', url: 'https://example.com' });
    });

    it('recognises title as an alias for the name column', () => {
      const rows = parseLibraryCsv('title,url\nMy Link,https://example.com');
      expect(rows[0].title).toBe('My Link');
    });

    it('recognises link as an alias for the url column', () => {
      const rows = parseLibraryCsv('name,link\nMy Link,https://example.com');
      expect(rows[0].url).toBe('https://example.com');
    });

    it('is case-insensitive for header names', () => {
      const rows = parseLibraryCsv('Name,URL\nSquat Guide,https://example.com');
      expect(rows[0]).toEqual({ title: 'Squat Guide', url: 'https://example.com' });
    });

    it('treats first row as data when no header is recognised', () => {
      // Neither column matches a known alias, so both rows are treated as data
      const rows = parseLibraryCsv('Squat Guide,https://example.com\nMy Blog,https://blog.com');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ title: 'Squat Guide', url: 'https://example.com' });
    });
  });

  describe('delimiter detection', () => {
    it('parses tab-separated values', () => {
      const rows = parseLibraryCsv('name\turl\nSquat Guide\thttps://example.com');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ title: 'Squat Guide', url: 'https://example.com' });
    });

    it('prefers tab over comma when both are present in first line', () => {
      // First line has a tab — delimiter = tab; comma inside a field is literal
      const rows = parseLibraryCsv('name\turl\nGuide, Vol.1\thttps://example.com');
      expect(rows[0].title).toBe('Guide, Vol.1');
    });
  });

  describe('CRLF line endings', () => {
    it('handles \\r\\n line endings', () => {
      const rows = parseLibraryCsv('name,url\r\nGuide,https://example.com\r\n');
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Guide');
    });
  });

  describe('empty lines', () => {
    it('silently drops fully empty lines', () => {
      const rows = parseLibraryCsv('name,url\n\nGuide,https://example.com\n\n');
      expect(rows).toHaveLength(1);
    });

    it('silently drops lines where both name and url are empty', () => {
      const rows = parseLibraryCsv('name,url\n,\nGuide,https://example.com');
      expect(rows).toHaveLength(1);
    });
  });

  describe('validation errors', () => {
    it('returns error when name is missing', () => {
      const rows = parseLibraryCsv('name,url\n,https://example.com');
      expect(rows).toHaveLength(1);
      expect(rows[0].error).toBe('Missing name');
    });

    it('returns error when url is missing', () => {
      const rows = parseLibraryCsv('name,url\nSquat Guide,');
      expect(rows).toHaveLength(1);
      expect(rows[0].error).toBe('Missing URL');
    });

    it('returns error when url does not start with http:// or https://', () => {
      const rows = parseLibraryCsv('name,url\nGuide,ftp://example.com');
      expect(rows[0].error).toMatch(/must start with/i);
    });

    it('accepts http:// URLs', () => {
      const rows = parseLibraryCsv('name,url\nGuide,http://example.com');
      expect(rows[0].error).toBeUndefined();
    });

    it('accepts https:// URLs', () => {
      const rows = parseLibraryCsv('name,url\nGuide,https://example.com/path?q=1#hash');
      expect(rows[0].error).toBeUndefined();
    });
  });

  describe('CSV quoting', () => {
    it('handles double-quoted fields containing commas', () => {
      const rows = parseLibraryCsv('name,url\n"Guide, Volume 1",https://example.com');
      expect(rows[0].title).toBe('Guide, Volume 1');
    });

    it('handles escaped double quotes inside quoted fields', () => {
      const rows = parseLibraryCsv('name,url\n"He said ""hello""",https://example.com');
      expect(rows[0].title).toBe('He said "hello"');
    });
  });

  describe('multiple valid rows', () => {
    it('parses multiple rows correctly', () => {
      const input = [
        'name,url',
        'Squat Guide,https://youtube.com/squat',
        'My Blog,https://myblog.com',
        'Research,https://pubmed.com',
      ].join('\n');
      const rows = parseLibraryCsv(input);
      expect(rows).toHaveLength(3);
      expect(rows.every((r) => !r.error)).toBe(true);
    });

    it('mixes valid and invalid rows in the same output', () => {
      const input = [
        'name,url',
        'Good Link,https://example.com',
        'Bad Link,not-a-url',
        ',https://example.com',
      ].join('\n');
      const rows = parseLibraryCsv(input);
      expect(rows).toHaveLength(3);
      expect(rows[0].error).toBeUndefined();
      expect(rows[1].error).toBeDefined();
      expect(rows[2].error).toBeDefined();
    });
  });

  describe('column ordering', () => {
    it('handles url column before name column', () => {
      const rows = parseLibraryCsv('url,name\nhttps://example.com,My Link');
      expect(rows[0]).toEqual({ title: 'My Link', url: 'https://example.com' });
    });
  });
});
