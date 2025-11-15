import { distributedCacheService } from '../src/lib/cache/distributed-cache-service';

async function main() {
  const mode = process.argv[2] || 'all';
  if (mode !== 'all') {
    console.warn('Currently only all-clear is supported. Ignoring mode:', mode);
  }
  await distributedCacheService.clear();
  console.log('Cache cleared (local + redis + fallback).');
}

main().catch(e => { console.error(e); process.exit(1); });
