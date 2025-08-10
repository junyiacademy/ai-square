import { redisCacheService } from '../redis-cache-service';

// We don't set REDIS_URL to force fallback (in-memory) path during tests

describe('redisCacheService (fallback mode)', () => {
  beforeEach(async () => {
    await redisCacheService.clear();
  });

  it('set/get should store and retrieve values', async () => {
    await redisCacheService.set('rk1', { a: 1 }, { ttl: 60_000 });
    const v = await redisCacheService.get<{ a: number }>('rk1');
    expect(v).toEqual({ a: 1 });
  });

  it('has should reflect presence', async () => {
    await redisCacheService.set('exists', 'yes', { ttl: 60_000 });
    expect(await redisCacheService.has('exists')).toBe(true);
    expect(await redisCacheService.has('missing')).toBe(false);
  });

  it('delete should remove key', async () => {
    await redisCacheService.set('delk', 123, { ttl: 60_000 });
    await redisCacheService.delete('delk');
    expect(await redisCacheService.get('delk')).toBeNull();
  });

  it('clear should remove all keys', async () => {
    await redisCacheService.set('a', 1, { ttl: 60_000 });
    await redisCacheService.set('b', 2, { ttl: 60_000 });
    await redisCacheService.clear();
    expect(await redisCacheService.get('a')).toBeNull();
    expect(await redisCacheService.get('b')).toBeNull();
  });

  it('incr should increment numeric value in fallback cache', async () => {
    const n1 = await redisCacheService.incr('counter');
    const n2 = await redisCacheService.incr('counter', 5);
    expect(n1).toBe(1);
    expect(n2).toBe(6);
  });

  it('mset/mget should batch process values', async () => {
    await redisCacheService.mset([
      ['ba', { x: 1 }],
      ['bb', { y: 2 }]
    ], { ttl: 60_000 });
    const arr = await redisCacheService.mget<{ x?: number; y?: number }>(['ba', 'bb', 'bc']);
    expect(arr).toEqual([{ x: 1 }, { y: 2 }, null]);
  });

  it('getStats should not throw and include fallback size', async () => {
    await redisCacheService.set('sx', 'v', { ttl: 60_000 });
    const stats = await redisCacheService.getStats();
    expect(typeof stats.redisConnected).toBe('boolean');
    expect(stats.fallbackCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('handles errors gracefully', async () => {
    const mapGetSpy = jest.spyOn(Map.prototype, 'get').mockImplementationOnce(() => {
      throw new Error('forced');
    });
    await expect(redisCacheService.get('err')).resolves.toBeNull();
    mapGetSpy.mockRestore();
  });
}); 