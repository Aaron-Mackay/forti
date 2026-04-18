import { describe, it, expect } from 'vitest';
import {
  parseCheckInTemplate,
  parseCustomResponses,
  validateTemplate,
  isFieldVisible,
  getAllInputFields,
  migrateV1Template,
  DEFAULT_TEMPLATE,
  MAX_TEMPLATE_FIELDS,
  MAX_TEMPLATE_CARDS,
  MAX_RATING_SCALE,
  MIN_RATING_SCALE,
} from './checkInTemplateTypes';
import type { CheckInTemplate, CustomCard } from './checkInTemplateTypes';

// ─── migrateV1Template ────────────────────────────────────────────────────────

describe('migrateV1Template', () => {
  it('converts photos field to a system card', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [{ id: 'p', type: 'photos', label: 'Progress photos' }],
    });
    expect(result.version).toBe(2);
    const photoCards = result.cards.filter(c => c.kind === 'system' && c.systemType === 'photos');
    expect(photoCards).toHaveLength(1);
  });

  it('converts metrics field to a system card', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [{ id: 'm', type: 'metrics', label: 'Weekly metrics' }],
    });
    const metricsCards = result.cards.filter(c => c.kind === 'system' && c.systemType === 'metrics');
    expect(metricsCards).toHaveLength(1);
  });

  it('converts workouts field to a system card', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [{ id: 'w', type: 'workouts', label: 'Workouts' }],
    });
    const workoutsCards = result.cards.filter(c => c.kind === 'system' && c.systemType === 'workouts');
    expect(workoutsCards).toHaveLength(1);
  });

  it('converts input fields to single-field custom cards preserving id and label', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [
        { id: 'a', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
        { id: 'b', type: 'text', label: 'Short Q' },
      ],
    });
    const customCards = result.cards.filter((c): c is CustomCard => c.kind === 'custom');
    expect(customCards).toHaveLength(2);
    expect(customCards[0].fields[0]).toMatchObject({ id: 'a', label: 'Energy', type: 'rating' });
    expect(customCards[1].fields[0]).toMatchObject({ id: 'b', label: 'Short Q', type: 'text' });
  });

  it('gives all cards columnSpan 1 (except photos which gets 2)', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [
        { id: 'p', type: 'photos', label: 'Photos' },
        { id: 'a', type: 'rating', label: 'Rating', minScale: 1, maxScale: 5 },
      ],
    });
    const photoCard = result.cards.find(c => c.kind === 'system' && c.systemType === 'photos');
    expect(photoCard?.columnSpan).toBe(2);
    const customCard = result.cards.find(c => c.kind === 'custom');
    expect(customCard?.columnSpan).toBe(1);
  });

  it('deduplicates duplicate system field types, keeping only the first', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [
        { id: 'p1', type: 'photos', label: 'Photos 1' },
        { id: 'p2', type: 'photos', label: 'Photos 2' },
      ],
    });
    expect(result.cards.filter(c => c.kind === 'system' && c.systemType === 'photos')).toHaveLength(1);
  });

  it('returns a v2 template', () => {
    const result = migrateV1Template({ version: 1, fields: [] });
    expect(result.version).toBe(2);
  });
});

// ─── parseCheckInTemplate — v2 ───────────────────────────────────────────────

describe('parseCheckInTemplate — v2', () => {
  it('returns null for null input', () => {
    expect(parseCheckInTemplate(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseCheckInTemplate('string')).toBeNull();
    expect(parseCheckInTemplate(42)).toBeNull();
    expect(parseCheckInTemplate([])).toBeNull();
  });

  it('returns null when version is not 2 or 1', () => {
    expect(parseCheckInTemplate({ version: 0, cards: [] })).toBeNull();
    expect(parseCheckInTemplate({ version: 3, cards: [] })).toBeNull();
  });

  it('parses a valid v2 template with system and custom cards', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 'sys-1', systemType: 'metrics', columnSpan: 1 },
        {
          kind: 'custom', id: 'cust-1', title: 'Wellbeing', columnSpan: 2,
          fields: [
            { id: 'f1', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
          ],
        },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
    expect(result!.cards).toHaveLength(2);
    expect(result!.cards[0]).toMatchObject({ kind: 'system', systemType: 'metrics' });
    expect(result!.cards[1]).toMatchObject({ kind: 'custom', title: 'Wellbeing', columnSpan: 2 });
  });

  it('skips cards with no id', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'custom', id: '', title: 'No ID', columnSpan: 1, fields: [] },
        { kind: 'system', id: 's1', systemType: 'metrics', columnSpan: 1 },
      ],
    });
    expect(result!.cards).toHaveLength(1);
    expect(result!.cards[0].id).toBe('s1');
  });

  it('skips cards with invalid kind', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'unknown', id: 'x', columnSpan: 1 },
        { kind: 'system', id: 's1', systemType: 'workouts', columnSpan: 1 },
      ],
    });
    expect(result!.cards).toHaveLength(1);
    expect(result!.cards[0]).toMatchObject({ kind: 'system', systemType: 'workouts' });
  });

  it('enforces singleton system card types — drops duplicates', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 'p1', systemType: 'photos', columnSpan: 2 },
        { kind: 'system', id: 'p2', systemType: 'photos', columnSpan: 1 },
        { kind: 'system', id: 'm1', systemType: 'metrics', columnSpan: 1 },
      ],
    });
    const photoCards = result!.cards.filter(c => c.kind === 'system' && c.systemType === 'photos');
    expect(photoCards).toHaveLength(1);
    expect(photoCards[0].id).toBe('p1');
    expect(result!.cards).toHaveLength(2);
  });

  it('defaults invalid columnSpan to 1', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 's1', systemType: 'metrics', columnSpan: 99 },
      ],
    });
    expect(result!.cards[0].columnSpan).toBe(1);
  });

  it('accepts columnSpan 2', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [{ kind: 'system', id: 's1', systemType: 'photos', columnSpan: 2 }],
    });
    expect(result!.cards[0].columnSpan).toBe(2);
  });

  it('treats title as optional on custom cards', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [{ kind: 'custom', id: 'c1', columnSpan: 1, fields: [] }],
    });
    const card = result!.cards[0];
    expect(card.kind).toBe('custom');
    if (card.kind === 'custom') expect(card.title).toBeUndefined();
  });

  it('skips fields with type photos/metrics/workouts inside custom cards', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [
          { id: 'sys', type: 'photos', label: 'Photos' },   // system type — skipped
          { id: 'inp', type: 'text', label: 'Question' },    // valid
        ],
      }],
    });
    const card = result!.cards[0];
    if (card.kind === 'custom') expect(card.fields).toHaveLength(1);
  });

  it('parses a yesno field inside a custom card', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [{ id: 'f1', type: 'yesno', label: 'Did you follow your diet?' }],
      }],
    });
    const card = result!.cards[0];
    if (card.kind === 'custom') {
      expect(card.fields).toHaveLength(1);
      expect(card.fields[0]).toMatchObject({ id: 'f1', type: 'yesno', label: 'Did you follow your diet?' });
    }
  });

  it(`caps total input fields across custom cards at ${MAX_TEMPLATE_FIELDS}`, () => {
    const fields = Array.from({ length: MAX_TEMPLATE_FIELDS + 5 }, (_, i) => ({
      id: `f${i}`, type: 'text', label: `Field ${i}`,
    }));
    const result = parseCheckInTemplate({
      version: 2,
      cards: [{ kind: 'custom', id: 'c1', columnSpan: 1, fields }],
    });
    const card = result!.cards[0];
    if (card.kind === 'custom') expect(card.fields).toHaveLength(MAX_TEMPLATE_FIELDS);
  });

  it(`caps at ${MAX_TEMPLATE_CARDS} cards`, () => {
    const cards = Array.from({ length: MAX_TEMPLATE_CARDS + 5 }, (_, i) => ({
      kind: 'custom', id: `c${i}`, columnSpan: 1, fields: [],
    }));
    const result = parseCheckInTemplate({ version: 2, cards });
    expect(result!.cards).toHaveLength(MAX_TEMPLATE_CARDS);
  });
});

// ─── parseCheckInTemplate — v1 migration ─────────────────────────────────────

describe('parseCheckInTemplate — v1 migration', () => {
  it('auto-migrates v1 and returns a v2 template', () => {
    const result = parseCheckInTemplate({
      version: 1,
      fields: [
        { id: 'p', type: 'photos', label: 'Progress photos' },
        { id: 'e', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
  });

  it('creates system cards for photos/metrics/workouts v1 fields', () => {
    const result = parseCheckInTemplate({
      version: 1,
      fields: [
        { id: 'p', type: 'photos', label: 'Photos' },
        { id: 'm', type: 'metrics', label: 'Metrics' },
        { id: 'w', type: 'workouts', label: 'Workouts' },
      ],
    });
    expect(result!.cards.filter(c => c.kind === 'system')).toHaveLength(3);
  });

  it('preserves field id and label when migrating input fields to custom cards', () => {
    const result = parseCheckInTemplate({
      version: 1,
      fields: [{ id: 'e1', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 }],
    });
    const customCards = result!.cards.filter((c): c is CustomCard => c.kind === 'custom');
    expect(customCards[0].fields[0]).toMatchObject({ id: 'e1', label: 'Energy' });
  });

  it('returns null for v1 with non-array fields', () => {
    expect(parseCheckInTemplate({ version: 1, fields: 'bad' })).toBeNull();
  });
});

// ─── validateTemplate — v2 ───────────────────────────────────────────────────

describe('validateTemplate — v2', () => {
  function minValidTemplate(): CheckInTemplate {
    return { version: 2, cards: [] };
  }

  it('returns null for a valid empty template', () => {
    expect(validateTemplate(minValidTemplate())).toBeNull();
  });

  it('returns null for a valid template with system and custom cards', () => {
    const err = validateTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 'sys-1', systemType: 'metrics',  columnSpan: 1 },
        { kind: 'system', id: 'sys-2', systemType: 'workouts', columnSpan: 1 },
        {
          kind: 'custom', id: 'cust-1', columnSpan: 1,
          fields: [
            { id: 'f1', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
            { id: 'f2', type: 'text',   label: 'Notes' },
          ],
        },
      ],
    });
    expect(err).toBeNull();
  });

  it('rejects invalid version', () => {
    // @ts-expect-error — intentional bad version
    expect(validateTemplate({ version: 1, cards: [] })).toMatch(/version/i);
  });

  it(`rejects more than ${MAX_TEMPLATE_CARDS} cards`, () => {
    const cards = Array.from({ length: MAX_TEMPLATE_CARDS + 1 }, (_, i) => ({
      kind: 'custom' as const, id: `c${i}`, columnSpan: 1 as const, fields: [],
    }));
    const err = validateTemplate({ version: 2, cards });
    expect(err).not.toBeNull();
    expect(err).toMatch(/exceed/i);
  });

  it(`rejects more than ${MAX_TEMPLATE_FIELDS} input fields across custom cards`, () => {
    const fields = Array.from({ length: MAX_TEMPLATE_FIELDS + 1 }, (_, i) => ({
      id: `f${i}`, type: 'text' as const, label: `Field ${i}`,
    }));
    const err = validateTemplate({
      version: 2,
      cards: [{ kind: 'custom', id: 'c1', columnSpan: 1, fields }],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/exceed/i);
  });

  it('rejects duplicate card ids', () => {
    const err = validateTemplate({
      version: 2,
      cards: [
        { kind: 'custom', id: 'dup', columnSpan: 1, fields: [] },
        { kind: 'system', id: 'dup', systemType: 'metrics', columnSpan: 1 },
      ],
    });
    expect(err).toMatch(/duplicate/i);
  });

  it('rejects columnSpan not in [1, 2]', () => {
    const err = validateTemplate({
      version: 2,
      // @ts-expect-error — intentional bad columnSpan
      cards: [{ kind: 'custom', id: 'c1', columnSpan: 3, fields: [] }],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/columnSpan/i);
  });

  it('rejects duplicate field ids across different custom cards', () => {
    const err = validateTemplate({
      version: 2,
      cards: [
        { kind: 'custom', id: 'c1', columnSpan: 1, fields: [{ id: 'dup', type: 'text' as const, label: 'A' }] },
        { kind: 'custom', id: 'c2', columnSpan: 1, fields: [{ id: 'dup', type: 'text' as const, label: 'B' }] },
      ],
    });
    expect(err).toMatch(/duplicate/i);
  });

  it('rejects more than one system card of the same type', () => {
    const err = validateTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 's1', systemType: 'photos', columnSpan: 2 },
        { kind: 'system', id: 's2', systemType: 'photos', columnSpan: 1 },
      ],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/photos/i);
  });

  it('accepts a yesno field in a custom card', () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [{ id: 'f1', type: 'yesno' as const, label: 'Diet adherence?' }],
      }],
    });
    expect(err).toBeNull();
  });

  it('accepts answered/not_answered showIf referencing a yesno field', () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [
          { id: 'diet', type: 'yesno' as const, label: 'Did you follow your diet?' },
          { id: 'detail', type: 'textarea' as const, label: 'Tell me more', showIf: { fieldId: 'diet', operator: 'answered' as const } },
        ],
      }],
    });
    expect(err).toBeNull();
  });

  it('accepts cross-card showIf referencing a field in another custom card', () => {
    const err = validateTemplate({
      version: 2,
      cards: [
        { kind: 'custom', id: 'c1', columnSpan: 1, fields: [
          { id: 'source', type: 'rating' as const, label: 'Energy', minScale: 1, maxScale: 5 },
        ]},
        { kind: 'custom', id: 'c2', columnSpan: 1, fields: [
          { id: 'cond', type: 'text' as const, label: 'Detail', showIf: { fieldId: 'source', operator: 'lte' as const, value: 3 } },
        ]},
      ],
    });
    expect(err).toBeNull();
  });

  it('rejects showIf referencing a non-existent field', () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [{ id: 'f1', type: 'text' as const, label: 'Q', showIf: { fieldId: 'ghost', operator: 'answered' as const } }],
      }],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/unknown/i);
  });

  it('rejects rating operator on a text field reference', () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [
          { id: 'n', type: 'text' as const, label: 'Notes' },
          { id: 'f', type: 'textarea' as const, label: 'Follow-up', showIf: { fieldId: 'n', operator: 'gte' as const, value: 3 } },
        ],
      }],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/rating operator/i);
  });

  it('rejects answered operator on a rating field reference', () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [
          { id: 'e', type: 'rating' as const, label: 'Energy', minScale: 1, maxScale: 5 },
          { id: 'f', type: 'text' as const, label: 'Q', showIf: { fieldId: 'e', operator: 'answered' as const } },
        ],
      }],
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/answered/i);
  });

  it(`rejects rating with maxScale < ${MIN_RATING_SCALE}`, () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [{ id: 'r', type: 'rating' as const, label: 'Bad', minScale: 1, maxScale: 1 }],
      }],
    });
    expect(err).not.toBeNull();
  });

  it(`rejects rating with maxScale > ${MAX_RATING_SCALE}`, () => {
    const err = validateTemplate({
      version: 2,
      cards: [{
        kind: 'custom', id: 'c1', columnSpan: 1,
        fields: [{ id: 'r', type: 'rating' as const, label: 'Bad', minScale: 1, maxScale: MAX_RATING_SCALE + 1 }],
      }],
    });
    expect(err).not.toBeNull();
  });
});

// ─── DEFAULT_TEMPLATE ─────────────────────────────────────────────────────────

describe('DEFAULT_TEMPLATE', () => {
  it('has version 2', () => {
    expect(DEFAULT_TEMPLATE.version).toBe(2);
  });

  it('has exactly one system card of each type', () => {
    const systemCards = DEFAULT_TEMPLATE.cards.filter(c => c.kind === 'system');
    const types = systemCards.map(c => c.systemType);
    expect(types).toContain('photos');
    expect(types).toContain('metrics');
    expect(types).toContain('workouts');
    expect(systemCards).toHaveLength(3);
  });

  it('has unique card ids', () => {
    const ids = DEFAULT_TEMPLATE.cards.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique input field ids across all custom cards', () => {
    const fields = getAllInputFields(DEFAULT_TEMPLATE);
    const ids = fields.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates successfully', () => {
    expect(validateTemplate(DEFAULT_TEMPLATE)).toBeNull();
  });

  it('has 6 rating fields matching the legacy check-in', () => {
    const fields = getAllInputFields(DEFAULT_TEMPLATE);
    const ratings = fields.filter(f => f.type === 'rating');
    expect(ratings).toHaveLength(6);
    const labels = ratings.map(f => f.label);
    expect(labels).toContain('Energy level');
    expect(labels).toContain('Mood / Motivation');
    expect(labels).toContain('Stress level');
  });

  it('has 3 textarea fields matching the legacy reflection section', () => {
    const fields = getAllInputFields(DEFAULT_TEMPLATE);
    const textareas = fields.filter(f => f.type === 'textarea');
    expect(textareas).toHaveLength(3);
    const labels = textareas.map(f => f.label);
    expect(labels).toContain('How did your week go overall?');
    expect(labels).toContain('Goals / focus for next week');
  });
});

// ─── getAllInputFields ────────────────────────────────────────────────────────

describe('getAllInputFields', () => {
  it('returns an empty array for a template with no cards', () => {
    expect(getAllInputFields({ version: 2, cards: [] })).toHaveLength(0);
  });

  it('returns an empty array for a template with only system cards', () => {
    const template: CheckInTemplate = {
      version: 2,
      cards: [
        { kind: 'system', id: 's1', systemType: 'metrics',  columnSpan: 1 },
        { kind: 'system', id: 's2', systemType: 'workouts', columnSpan: 1 },
      ],
    };
    expect(getAllInputFields(template)).toHaveLength(0);
  });

  it('flattens fields from all custom cards in order', () => {
    const template: CheckInTemplate = {
      version: 2,
      cards: [
        { kind: 'system', id: 'sys', systemType: 'metrics', columnSpan: 1 },
        { kind: 'custom', id: 'c1', columnSpan: 1, fields: [
          { id: 'f1', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
          { id: 'f2', type: 'text',   label: 'Notes' },
        ]},
        { kind: 'custom', id: 'c2', columnSpan: 1, fields: [
          { id: 'f3', type: 'textarea', label: 'Review' },
        ]},
      ],
    };
    const fields = getAllInputFields(template);
    expect(fields).toHaveLength(3);
    expect(fields.map(f => f.id)).toEqual(['f1', 'f2', 'f3']);
  });

  it('excludes system cards from the result', () => {
    const template: CheckInTemplate = {
      version: 2,
      cards: [
        { kind: 'system', id: 'sys', systemType: 'photos',  columnSpan: 2 },
        { kind: 'custom', id: 'c1',  columnSpan: 1, fields: [{ id: 'f1', type: 'text', label: 'Q' }] },
      ],
    };
    const fields = getAllInputFields(template);
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('f1');
  });
});

// ─── parseCustomResponses ─────────────────────────────────────────────────────

describe('parseCustomResponses', () => {
  it('returns {} for null/undefined/non-object input', () => {
    expect(parseCustomResponses(null)).toEqual({});
    expect(parseCustomResponses(undefined)).toEqual({});
    expect(parseCustomResponses('bad')).toEqual({});
    expect(parseCustomResponses([])).toEqual({});
  });

  it('returns valid responses', () => {
    expect(parseCustomResponses({ 'uuid-1': 4, 'uuid-2': 'Great week', 'uuid-3': null }))
      .toEqual({ 'uuid-1': 4, 'uuid-2': 'Great week', 'uuid-3': null });
  });

  it('drops entries with non-string/number/null values', () => {
    const result = parseCustomResponses({ good: 5, bad: { nested: true }, also_bad: [1, 2] });
    expect(result).toEqual({ good: 5 });
  });
});

// ─── isFieldVisible ───────────────────────────────────────────────────────────

describe('isFieldVisible', () => {
  it('returns true when field has no showIf', () => {
    expect(isFieldVisible({ id: 'a', type: 'text', label: 'Q' }, {})).toBe(true);
  });

  it('rating eq: true when value matches', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'eq', value: 3 } },
      { a: 3 },
    )).toBe(true);
  });

  it('rating eq: false when value does not match', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'eq', value: 3 } },
      { a: 4 },
    )).toBe(false);
  });

  it('rating lte: false when value exceeds threshold', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'lte', value: 3 } },
      { a: 4 },
    )).toBe(false);
  });

  it('rating lte: true when value equals threshold', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'lte', value: 3 } },
      { a: 3 },
    )).toBe(true);
  });

  it('rating gte: true when value meets threshold', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'gte', value: 3 } },
      { a: 5 },
    )).toBe(true);
  });

  it('rating neq: true when value differs', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'neq', value: 3 } },
      { a: 5 },
    )).toBe(true);
  });

  it('answered: true when response is non-empty string', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'answered' } },
      { a: 'yes' },
    )).toBe(true);
  });

  it('answered: false when response is null', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'answered' } },
      { a: null },
    )).toBe(false);
  });

  it('answered: false when response is empty string', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'answered' } },
      { a: '' },
    )).toBe(false);
  });

  it('not_answered: true when response is missing', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'not_answered' } },
      {},
    )).toBe(true);
  });

  it('not_answered: false when response exists', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'not_answered' } },
      { a: 'something' },
    )).toBe(false);
  });

  it('returns false for rating operator when value is not a number', () => {
    expect(isFieldVisible(
      { id: 'b', type: 'text', label: 'Q', showIf: { fieldId: 'a', operator: 'gte', value: 3 } },
      { a: 'text' },
    )).toBe(false);
  });
});
