type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ConsumeRateLimitArgs = {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getBucketKey(namespace: string, key: string) {
  return `${namespace}:${key}`;
}

function getRetryAfterSeconds(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function consumeRateLimit(args: ConsumeRateLimitArgs): RateLimitResult {
  const now = args.now ?? Date.now();
  pruneExpiredEntries(now);

  const bucketKey = getBucketKey(args.namespace, args.key);
  const existing = rateLimitStore.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(bucketKey, {
      count: 1,
      resetAt: now + args.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, args.limit - 1),
      retryAfterSeconds: Math.ceil(args.windowMs / 1000),
    };
  }

  if (existing.count >= args.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: getRetryAfterSeconds(existing.resetAt, now),
    };
  }

  existing.count += 1;
  rateLimitStore.set(bucketKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, args.limit - existing.count),
    retryAfterSeconds: getRetryAfterSeconds(existing.resetAt, now),
  };
}

export function resetRateLimitStoreForTests() {
  rateLimitStore.clear();
}
