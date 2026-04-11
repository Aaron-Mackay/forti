import { Exercise } from '@/generated/prisma/browser';

export type MatchedExercise = {
  inputName: string;
  matchedExerciseId: number;
  canonicalName: string;
  category: 'resistance' | 'cardio';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  matchType: 'exact' | 'whole_alias' | 'token_alias';
};

const WHOLE_STRING_ALIASES: Record<string, string> = {
  // Pressing
  'db bench': 'dumbbell bench press',
  'bb bench': 'barbell bench press',
  'flat bench': 'bench press',
  'incline bb bench': 'incline barbell bench press',
  'incline db bench': 'incline dumbbell bench press',
  'decline bb bench': 'decline barbell bench press',
  'ohp': 'overhead press',
  'seated db press': 'seated dumbbell shoulder press',
  'bench': 'bench press',

  // Pulling / back
  'lat pull down': 'lat pulldown',
  'pullup': 'pull up',
  'chinup': 'chin up',
  'tbar row': 't-bar row',

  // Lower body
  'rdl': 'romanian deadlift',
  'sldl': 'stiff-leg deadlift',
  'conv deadlift': 'deadlift',
  'conventional deadlift': 'deadlift',
  'sumo dl': 'sumo deadlift',
  'bulgarian split squat': 'bulgarian split squat',
  'bss': 'bulgarian split squat',
  'leg ext': 'leg extension',
  'knee extension': 'leg extension',
  'knee ext': 'leg extension',
  'leg curls': 'lying leg curls',
  'hip thrusts': 'hip thrusts',
  'calf raises': 'standing calf raises',

  // Arms / accessories
  'tricep rope pushdown': 'rope pushdown',
  'lat raises': 'lateral raise',
  'rear delt flys': 'rear delt fly',

  // Cardio common variants
  'jogging': 'running',
  'bike': 'cycling',
  'stationary bike': 'cycling',
  'rower': 'rowing',
  'stairmaster': 'stair climber',
};

const TOKEN_ALIASES: Record<string, string> = {
  // Equipment
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  bw: 'bodyweight',

  // Exercise shorthand
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  dl: 'deadlift',
  sldl: 'stiff leg deadlift',
  bss: 'bulgarian split squat',
  curl: 'curls',
  ext: 'extension',

  // Descriptor shorthand
  alt: 'alternating',
  rev: 'reverse',
  inc: 'incline',
  dec: 'decline',
  uni: 'unilateral',
  pronated: 'overhand',
  supinated: 'underhand',
};


export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandTokenAliases(normalizedName: string): string {
  const tokens = normalizedName.split(' ').filter(Boolean);
  return tokens.map(token => TOKEN_ALIASES[token] ?? token).join(' ');
}

function getCanonicalLookupKeys(inputName: string): Array<{ key: string; type: MatchedExercise['matchType'] }> {
  const normalized = normalizeExerciseName(inputName);
  const keys: Array<{ key: string; type: MatchedExercise['matchType'] }> = [{ key: normalized, type: 'exact' }];

  const wholeAlias = WHOLE_STRING_ALIASES[normalized];
  if (wholeAlias) {
    keys.push({ key: normalizeExerciseName(wholeAlias), type: 'whole_alias' });
  }

  const tokenExpanded = expandTokenAliases(normalized);
  if (tokenExpanded !== normalized) {
    keys.push({ key: tokenExpanded, type: 'token_alias' });
  }

  return keys;
}

export function matchExercisesByAlias(
  inputNames: string[],
  visibleExercises: Pick<Exercise, 'id' | 'name' | 'category' | 'primaryMuscles' | 'secondaryMuscles'>[],
): { matched: MatchedExercise[]; unmatched: string[] } {
  const byNormalizedName = new Map<string, Pick<Exercise, 'id' | 'name' | 'category' | 'primaryMuscles' | 'secondaryMuscles'>>();
  for (const ex of visibleExercises) {
    byNormalizedName.set(normalizeExerciseName(ex.name), ex);
  }

  const matched: MatchedExercise[] = [];
  const unmatched: string[] = [];

  for (const inputName of inputNames) {
    const lookupKeys = getCanonicalLookupKeys(inputName);

    let resolved: MatchedExercise | null = null;
    for (const candidate of lookupKeys) {
      const ex = byNormalizedName.get(candidate.key);
      if (!ex || (ex.category !== 'resistance' && ex.category !== 'cardio')) continue;
      resolved = {
        inputName,
        matchedExerciseId: ex.id,
        canonicalName: ex.name,
        category: ex.category,
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        matchType: candidate.type,
      };
      break;
    }

    if (resolved) matched.push(resolved);
    else unmatched.push(inputName);
  }

  return { matched, unmatched };
}
