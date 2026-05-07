import type { ParsedPlan } from '@/utils/aiPlanParser';

export type AiImportResponse =
  | { plan: ParsedPlan }
  | { questions: string[] }
  | { error: string; parseIssues?: string[] };
