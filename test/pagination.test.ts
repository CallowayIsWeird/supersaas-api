import { describe, expect, it, vi } from 'vitest';
import { collect, paginate } from '../src/pagination.js';

describe('paginate', () => {
  it('walks pages until an empty page', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5])
      .mockResolvedValueOnce([]);
    const items = await collect(paginate(fetcher, { pageSize: 3 }));
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('stops when a short page is returned', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce([1, 2]);
    const items = await collect(paginate(fetcher, { pageSize: 100 }));
    expect(items).toEqual([1, 2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('honors maxResults', async () => {
    const fetcher = vi.fn(async ({ limit }) =>
      Array.from({ length: limit }, (_, i) => i),
    );
    const items = await collect(paginate(fetcher, { pageSize: 10, maxResults: 5 }));
    expect(items).toHaveLength(5);
  });

  it('passes correct offset on each page', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5, 6])
      .mockResolvedValueOnce([]);
    await collect(paginate(fetcher, { pageSize: 3 }));
    expect(fetcher).toHaveBeenNthCalledWith(1, { limit: 3, offset: 0 });
    expect(fetcher).toHaveBeenNthCalledWith(2, { limit: 3, offset: 3 });
    expect(fetcher).toHaveBeenNthCalledWith(3, { limit: 3, offset: 6 });
  });
});
