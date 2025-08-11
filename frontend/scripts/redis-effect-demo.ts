import { distributedCacheService } from '../src/lib/cache/distributed-cache-service';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDemo() {
  console.log('--- Redis Effect Demo ---');
  console.log('ENV:', {
    REDIS_URL: process.env.REDIS_URL || null,
    REDIS_ENABLED: process.env.REDIS_ENABLED || null,
  });

  await distributedCacheService.clear();
  console.log('Cleared cache.');

  const before = await distributedCacheService.getStats();
  console.log('Stats before:', before);

  console.log('Setting demo:key ...');
  await distributedCacheService.set('demo:key', { ts: Date.now() }, { ttl: 2000 });

  const v1 = await distributedCacheService.get<{ ts: number }>('demo:key');
  console.log('Get v1:', v1);

  await sleep(150);
  const v2 = await distributedCacheService.get<{ ts: number }>('demo:key');
  console.log('Get v2 (should hit cache):', v2);

  // Demonstrate SWR quickly
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount += 1;
    return { fetchCount, ts: Date.now() };
  };
  const swrKey = 'demo:swr';

  console.log('SWR first fetch...');
  const swr1 = await distributedCacheService.getWithRevalidation(swrKey, fetcher, {
    ttl: 500,
    staleWhileRevalidate: 2000,
  });
  console.log('SWR1:', swr1);

  await sleep(600); // make it stale but within SWR
  console.log('SWR second fetch (stale should be returned, bg revalidate triggered)...');
  const swr2 = await distributedCacheService.getWithRevalidation(swrKey, fetcher, {
    ttl: 500,
    staleWhileRevalidate: 2000,
  });
  console.log('SWR2:', swr2, 'fetchCount:', fetchCount);

  await sleep(300); // give background revalidate time
  console.log('SWR third fetch (should be refreshed soon)...');
  const swr3 = await distributedCacheService.getWithRevalidation(swrKey, fetcher, {
    ttl: 500,
    staleWhileRevalidate: 2000,
  });
  console.log('SWR3:', swr3, 'fetchCount:', fetchCount);

  const after = await distributedCacheService.getStats();
  console.log('Stats after:', after);

  await distributedCacheService.close();
}

runDemo().catch((e) => {
  console.error(e);
  process.exit(1);
}); 