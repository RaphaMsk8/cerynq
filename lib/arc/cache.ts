type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type AsyncTtlCacheOptions = {
  ttlMs: number;
  maxEntries: number;
};

export function createAsyncTtlCache<T>(
  options: AsyncTtlCacheOptions
) {
  const cache = new Map<
    string,
    CacheEntry<T>
  >();

  const inFlight = new Map<
    string,
    Promise<T>
  >();

  function cleanupExpired(
    now: number
  ) {
    for (const [
      key,
      entry,
    ] of cache) {
      if (
        entry.expiresAt <= now
      ) {
        cache.delete(key);
      }
    }
  }

  function enforceSizeLimit() {
    while (
      cache.size >
      options.maxEntries
    ) {
      const oldestKey =
        cache.keys().next()
          .value as
          | string
          | undefined;

      if (!oldestKey) {
        break;
      }

      cache.delete(oldestKey);
    }
  }

  async function getOrCreate(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    const now =
      Date.now();

    const existing =
      cache.get(key);

    if (
      existing &&
      existing.expiresAt > now
    ) {
      cache.delete(key);

      cache.set(
        key,
        existing
      );

      return existing.value;
    }

    if (existing) {
      cache.delete(key);
    }

    const pending =
      inFlight.get(key);

    if (pending) {
      return pending;
    }

    const request =
      factory();

    inFlight.set(
      key,
      request
    );

    try {
      const value =
        await request;

      const completedAt =
        Date.now();

      cleanupExpired(
        completedAt
      );

      cache.set(
        key,
        {
          value,

          expiresAt:
            completedAt +
            options.ttlMs,
        }
      );

      enforceSizeLimit();

      return value;
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    getOrCreate,
  };
}