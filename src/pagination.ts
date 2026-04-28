/**
 * Async-iterator helpers for paginated list endpoints. Lets consumers write
 * `for await (const item of resource.iterate())` instead of manually
 * stepping limit/offset.
 *
 * @module
 */

import type { IteratePaginationParams } from './types/common.js';

/**
 * A function that fetches a single page given limit/offset.
 *
 * @internal
 */
export type PageFetcher<T> = (params: { limit: number; offset: number }) => Promise<T[]>;

const DEFAULT_PAGE_SIZE = 100;

/**
 * Yields items across pages until the server returns an empty page or
 * `maxResults` is reached.
 *
 * @category Pagination
 */
export async function* paginate<T>(
  fetcher: PageFetcher<T>,
  params: IteratePaginationParams = {},
): AsyncGenerator<T, void, void> {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxResults = params.maxResults;
  let offset = 0;
  let yielded = 0;

  while (true) {
    const limit = maxResults !== undefined ? Math.min(pageSize, maxResults - yielded) : pageSize;
    if (limit <= 0) return;
    const page = await fetcher({ limit, offset });
    if (page.length === 0) return;
    for (const item of page) {
      yield item;
      yielded += 1;
      if (maxResults !== undefined && yielded >= maxResults) return;
    }
    if (page.length < limit) return;
    offset += page.length;
  }
}

/**
 * Materializes an async iterator into an array. Convenience helper for
 * callers who want all results without writing a `for await` loop.
 *
 * @category Pagination
 */
export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) {
    out.push(item);
  }
  return out;
}
