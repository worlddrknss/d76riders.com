/**
 * Run an async function over a list with a ceiling on how many are in flight.
 *
 * The point is the ceiling. A bare `Promise.all` over a rider's gallery would
 * open one S3 connection per photo, and over a ride's attendees would fire one
 * reputation recompute per rider — each of which is several queries — straight
 * at a connection pool sized for a handful. Sequential awaits avoid that by
 * being slow instead. This does neither.
 *
 * Results come back in input order regardless of completion order, and the
 * first rejection propagates, matching `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const width = Math.max(1, Math.min(Math.floor(limit), items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  // Each worker pulls the next index until the list is exhausted, so a slow
  // item holds up only its own worker rather than a whole batch.
  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: width }, () => worker()));
  return results;
}
