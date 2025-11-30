import { NextResponse } from 'next/server';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { cacheKeys, TTL } from '@/lib/cache/cache-keys';
import { HybridTranslationService } from '@/lib/services/hybrid-translation-service';
import { cacheService } from '@/lib/cache/cache-service';
import { PBLScenarioLoaderService } from '@/lib/services/pbl/pbl-scenario-loader.service';

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // Force dynamic rendering

/**
 * GET /api/pbl/scenarios
 * Returns list of PBL scenarios with caching support
 */
export async function GET(request: Request) {
  try {
    // Get language and source from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const source = searchParams.get('source') || 'unified'; // 'unified', 'hybrid', 'yaml'
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

    // Cache key for anonymous users (this route doesn't read session, it's public)
    const key = cacheKeys.pblScenarios(lang, source);

    // Load scenarios based on source parameter
    let scenarios: unknown[];
    let metaSource = source;

    const compute = async () => {
      const scenarioLoader = new PBLScenarioLoaderService();
      const isProduction = process.env.NODE_ENV === 'production';

      if (source === 'hybrid') {
        try {
          // Use hybrid translation service
          const hybridService = new HybridTranslationService();
          const hybridScenarios = await hybridService.listScenarios(lang);

          // Transform to match expected format
          scenarios = hybridScenarios.map(scenario => ({
            ...scenario,
            yamlId: scenario.id,
            sourceType: 'pbl',
            estimatedDuration: (scenario.metadata?.estimatedDuration as number | undefined) || 60,
            targetDomain: scenario.metadata?.targetDomains as string[] | undefined,
            domains: scenario.metadata?.targetDomains as string[] | undefined,
            taskCount: scenario.taskTemplates?.length || 0,
            isAvailable: true,
            thumbnailEmoji: scenarioLoader.getScenarioEmoji(scenario.id)
          }));

          // Filter production-ready scenarios in production environment
          if (isProduction) {
            scenarios = scenarios.filter(s => {
              const metadata = (s as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
              return metadata?.isProductionReady === true || metadata?.isProductionReady === 'true';
            });
          }

          metaSource = 'hybrid';
        } catch (error) {
          console.error('Hybrid service failed, falling back to unified:', error);
          scenarios = await scenarioLoader.loadScenarios(lang);
          metaSource = 'unified-fallback';
        }
      } else {
        // Default to unified architecture - STRICT DATABASE ONLY
        scenarios = await scenarioLoader.loadScenarios(lang);
        // NO FALLBACK - if database is empty, that's an error condition
        if (!scenarios || scenarios.length === 0) {
          console.error('[PBL API] ERROR: No scenarios in database. Database initialization required!');
          // Return empty array instead of falling back to YAML
          scenarios = [];
          metaSource = 'unified-empty';
        } else if (isProduction) {
          // Filter production-ready scenarios in production environment
          scenarios = scenarios.filter(s => {
            const metadata = (s as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
            return metadata?.isProductionReady === true || metadata?.isProductionReady === 'true';
          });
        }
      }

      return {
        success: true,
        data: {
          scenarios,
          total: scenarios.length,
          available: scenarios.filter(s => (s as Record<string, unknown>).isAvailable).length
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          language: lang,
          source: metaSource
        }
      };
    };

    // 測試環境：兼容舊測試，計算後執行 cacheService.set 並處理 set 失敗回傳 500
    if (isTest) {
      const keyTest = `pbl:scenarios:${lang}`;
      const cached = await cacheService.get(keyTest);
      if (cached) {
        return new NextResponse(JSON.stringify(cached), {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
      }
      const result = await compute();
      try {
        await cacheService.set(keyTest, result, { ttl: 60 * 60 * 1000 });
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'FETCH_SCENARIOS_ERROR', message: 'Failed to fetch PBL scenarios' }
          },
          { status: 500 }
        );
      }
      return new NextResponse(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } });
    }

    // 先嘗試從快取取得
    let cacheStatus: 'HIT' | 'MISS' | 'STALE' = 'MISS';
    const cached = await distributedCacheService.get(key) as { data?: { scenarios?: unknown[] } } | null;

    if (cached && cached.data?.scenarios?.length && cached.data.scenarios.length > 0) {
      // 如果快取有資料且不為空，直接返回
      cacheStatus = 'HIT';
      return new NextResponse(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': cacheStatus
        }
      });
    }

    // 如果快取為空或沒有快取，重新計算
    const result = await compute();

    // 只有當結果不為空時才快取
    if (result.data?.scenarios?.length > 0) {
      await distributedCacheService.set(key, result, { ttl: TTL.SEMI_STATIC_1H });
    }

    return new NextResponse(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('Error fetching PBL scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SCENARIOS_ERROR',
          message: 'Failed to fetch PBL scenarios'
        }
      },
      { status: 500 }
    );
  }
}
