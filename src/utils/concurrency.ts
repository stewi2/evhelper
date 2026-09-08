// Runs `fn` over `items` with at most `limit` calls in flight at once,
// preserving input order in the result. Used to fetch per-target Horizons
// ephemerides concurrently instead of one-at-a-time — a slow/flaky network
// (worst case ~15-40s per request) turns an 18-item sequential loop into a
// multi-minute wait, while a small number in flight together bounds the
// total time to roughly one slow request instead of the sum of all of them.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return results;
}
