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
  'military press': 'overhead press',
  'seated db press': 'seated dumbbell shoulder press',

  // Pulling / back
  'lat pull down': 'lat pulldown',
  'lat pulldown': 'lat pulldown',
  'pullup': 'pull up',
  'chinup': 'chin up',
  'tbar row': 't bar row',
  'cable row': 'seated cable row',

  // Lower body
  'rdl': 'romanian deadlift',
  'sldl': 'stiff leg deadlift',
  'conv deadlift': 'conventional deadlift',
  'sumo dl': 'sumo deadlift',
  'bulgarian split squat': 'bulgarian split squat',
  'bss': 'bulgarian split squat',
  'goblet squat': 'goblet squat',
  'leg ext': 'leg extension',
  'leg curl': 'lying leg curl',
  'hip thrusts': 'hip thrust',
  'calf raises': 'standing calf raise',

  // Arms / accessories
  'skull crushers': 'lying triceps extension',
  'rope pushdown': 'triceps rope pushdown',
  'tricep pushdown': 'triceps pushdown',
  'preacher curls': 'preacher curl',
  'hammer curls': 'hammer curl',
  'lat raises': 'lateral raise',
  'rear delt flys': 'rear delt fly',

  // Cardio common variants
  'treadmill run': 'running',
  'jogging': 'running',
  'bike': 'cycling',
  'stationary bike': 'cycling',
  'rower': 'rowing',
  'jump rope': 'jumping rope',
  'stairmaster': 'stair climber',
};

const TOKEN_ALIASES: Record<string, string> = {
  // Equipment
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  bw: 'bodyweight',
  sm: 'smith machine',

  // Exercise shorthand
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  dl: 'deadlift',
  sldl: 'stiff leg deadlift',
  bss: 'bulgarian split squat',
  tri: 'triceps',

  // Descriptor shorthand
  alt: 'alternating',
  rev: 'reverse',
  inc: 'incline',
  dec: 'decline',
  uni: 'unilateral',
  pron: 'pronated',
  sup: 'supinated',
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
