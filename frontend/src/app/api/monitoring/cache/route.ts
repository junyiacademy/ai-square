import { NextRequest, NextResponse } from 'next/server';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { redisCacheService } from '@/lib/cache/redis-cache-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const [distributedStats, redisStats] = await Promise.all([
        distributedCacheService.getStats(),
        redisCacheService.getStats()
      ]);

      return NextResponse.json({
        distributed: distributedStats,
        redis: redisStats,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'clear') {
      await distributedCacheService.clear();
      return NextResponse.json({
        success: true,
        message: 'All caches cleared',
        timestamp: new Date().toISOString()
      });
    }

    // Default: return cache status
    const stats = await distributedCacheService.getStats();

    return NextResponse.json({
      success: true,
      stats,
      actions: {
        clear: '/api/monitoring/cache?action=clear',
        stats: '/api/monitoring/cache?action=stats'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cache monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      await distributedCacheService.delete(key);
      return NextResponse.json({
        success: true,
        message: `Cache key "${key}" deleted`,
        timestamp: new Date().toISOString()
      });
    }

    // Clear all caches
    await distributedCacheService.clear();
    return NextResponse.json({
      success: true,
      message: 'All caches cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
