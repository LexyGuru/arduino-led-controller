export class OfflineReadCache {
  constructor({
    maximumEntries = 100,
    defaultTtlMs =
      30000,
    now =
      () => Date.now()
  } = {}) {
    this.maximumEntries =
      Math.max(
        1,
        Number(maximumEntries) ||
        100
      );
    this.defaultTtlMs =
      Math.max(
        0,
        Number(defaultTtlMs) ||
        0
      );
    this.now = now;
    this.entries =
      new Map();
  }

  set(
    key,
    value,
    {
      ttlMs =
        this.defaultTtlMs
    } = {}
  ) {
    const normalizedKey =
      String(key);

    this.entries.delete(
      normalizedKey
    );

    this.entries.set(
      normalizedKey,
      {
        value,
        storedAt:
          this.now(),
        ttlMs:
          Math.max(
            0,
            Number(ttlMs) ||
            0
          )
      }
    );

    while (
      this.entries.size >
      this.maximumEntries
    ) {
      const oldest =
        this.entries.keys()
          .next()
          .value;

      this.entries.delete(
        oldest
      );
    }

    return value;
  }

  get(
    key,
    {
      allowStale = false
    } = {}
  ) {
    const entry =
      this.entries.get(
        String(key)
      );

    if (!entry) {
      return null;
    }

    const ageMs =
      this.now() -
      entry.storedAt;

    const stale =
      entry.ttlMs > 0 &&
      ageMs >
        entry.ttlMs;

    if (
      stale &&
      !allowStale
    ) {
      return null;
    }

    return {
      value:
        entry.value,
      stale,
      ageMs,
      storedAt:
        new Date(
          entry.storedAt
        ).toISOString()
    };
  }

  delete(key) {
    return this.entries.delete(
      String(key)
    );
  }

  clear() {
    this.entries.clear();
  }

  snapshot() {
    return {
      size:
        this.entries.size,
      maximumEntries:
        this.maximumEntries,
      defaultTtlMs:
        this.defaultTtlMs
    };
  }
}
