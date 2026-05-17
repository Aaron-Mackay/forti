import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE,
  CheckInTemplateJsonSchema,
  CustomCheckInResponsesSchema,
  getAllInputFields,
  getAllTemplateCards,
  isFieldVisible,
  migrateV1Template,
  parseCheckInTemplate,
  parseCustomResponses,
  resolveMetricCardConfig,
  validateTemplate,
} from './checkInTemplateTypes';
import type { CheckInTemplate } from './checkInTemplateTypes';

describe('checkInTemplateTypes', () => {
  it('migrates a v1 template into a v3 single-step template', () => {
    const result = migrateV1Template({
      version: 1,
      fields: [
        { id: 'photos', type: 'photos', label: 'Photos' },
        { id: 'energy', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 },
      ],
    });

    expect(result.version).toBe(3);
    expect(result.steps).toHaveLength(1);
    expect(getAllTemplateCards(result)).toHaveLength(2);
  });

  it('parses a v2 template into a v3 single-step template', () => {
    const result = parseCheckInTemplate({
      version: 2,
      cards: [
        { kind: 'system', id: 'metrics', systemType: 'metrics', columnSpan: 1 },
        {
          kind: 'custom',
          id: 'questions',
          title: 'Questions',
          columnSpan: 1,
          fields: [{ id: 'energy', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5 }],
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result?.version).toBe(3);
    expect(result?.steps).toHaveLength(1);
    expect(getAllTemplateCards(result as CheckInTemplate)).toHaveLength(2);
  });

  it('parses a valid v3 template', () => {
    const result = parseCheckInTemplate(DEFAULT_TEMPLATE);
    expect(result).toEqual(DEFAULT_TEMPLATE);
  });

  it('flattens cards and input fields across steps', () => {
    expect(getAllTemplateCards(DEFAULT_TEMPLATE).length).toBeGreaterThan(0);
    expect(getAllInputFields(DEFAULT_TEMPLATE).length).toBeGreaterThan(0);
  });

  it('validates cross-step showIf references', () => {
    const template: CheckInTemplate = {
      version: 3,
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          cards: [{
            id: 'card-1',
            kind: 'custom',
            columnSpan: 1,
            fields: [{ id: 'f1', type: 'yesno', label: 'Started?', required: true }],
          }],
        },
        {
          id: 'step-2',
          title: 'Step 2',
          cards: [{
            id: 'card-2',
            kind: 'custom',
            columnSpan: 1,
            fields: [{
              id: 'f2',
              type: 'text',
              label: 'Why?',
              showIf: { fieldId: 'f1', operator: 'answered' },
            }],
          }],
        },
      ],
    };

    expect(validateTemplate(template)).toBeNull();
  });

  it('rejects duplicate step, card, and field ids across steps', () => {
    const duplicateStepTemplate: CheckInTemplate = {
      version: 3,
      steps: [
        { id: 'dup', title: 'One', cards: [] },
        { id: 'dup', title: 'Two', cards: [] },
      ],
    };
    expect(validateTemplate(duplicateStepTemplate)).toMatch(/duplicate step id/i);

    const duplicateCardTemplate: CheckInTemplate = {
      version: 3,
      steps: [
        { id: 'a', title: 'A', cards: [{ id: 'dup', kind: 'system', systemType: 'metrics', columnSpan: 1 }] },
        { id: 'b', title: 'B', cards: [{ id: 'dup', kind: 'system', systemType: 'workouts', columnSpan: 1 }] },
      ],
    };
    expect(validateTemplate(duplicateCardTemplate)).toMatch(/duplicate card id/i);

    const duplicateFieldTemplate: CheckInTemplate = {
      version: 3,
      steps: [
        {
          id: 'a',
          title: 'A',
          cards: [{ id: 'a1', kind: 'custom', columnSpan: 1, fields: [{ id: 'dup', type: 'text', label: 'A' }] }],
        },
        {
          id: 'b',
          title: 'B',
          cards: [{ id: 'b1', kind: 'custom', columnSpan: 1, fields: [{ id: 'dup', type: 'text', label: 'B' }] }],
        },
      ],
    };
    expect(validateTemplate(duplicateFieldTemplate)).toMatch(/duplicate field id/i);
  });

  it('enforces global singleton system cards', () => {
    const template: CheckInTemplate = {
      version: 3,
      steps: [
        { id: 'a', title: 'A', cards: [{ id: 'metrics-1', kind: 'system', systemType: 'metrics', columnSpan: 1 }] },
        { id: 'b', title: 'B', cards: [{ id: 'metrics-2', kind: 'system', systemType: 'metrics', columnSpan: 1 }] },
      ],
    };
    expect(validateTemplate(template)).toMatch(/only one metrics card/i);
  });

  it('evaluates visibility for answered and rating conditions', () => {
    expect(isFieldVisible(
      { id: 'f2', type: 'text', label: 'Text', showIf: { fieldId: 'f1', operator: 'answered' } },
      { f1: 'yes' },
    )).toBe(true);

    expect(isFieldVisible(
      { id: 'f2', type: 'text', label: 'Text', showIf: { fieldId: 'f1', operator: 'gte', value: 3 } },
      { f1: 2 },
    )).toBe(false);
  });

  it('parses custom responses defensively', () => {
    expect(parseCustomResponses({ a: 'x', b: 2, c: null, d: { nope: true } })).toEqual({ a: 'x', b: 2, c: null });
    expect(CustomCheckInResponsesSchema.safeParse({ a: 'x', b: 2, c: null }).success).toBe(true);
  });

  it('normalizes metric card config and exposes valid template json schema', () => {
    expect(resolveMetricCardConfig({
      visibleBuiltInMetrics: ['protein', 'protein', 'unknown'] as never,
      includeCustomMetrics: false,
    })).toEqual({
      visibleBuiltInMetrics: ['protein'],
      includeCustomMetrics: false,
    });
    expect(CheckInTemplateJsonSchema.safeParse(DEFAULT_TEMPLATE).success).toBe(true);
  });
});
