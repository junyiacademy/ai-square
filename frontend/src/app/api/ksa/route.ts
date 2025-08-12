import { NextRequest, NextResponse } from 'next/server';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { TTL } from '@/lib/cache/cache-keys';

interface YAMLCode {
  summary: string;
  questions?: string[];
}

interface YAMLTheme {
  theme?: string;
  explanation: string;
  codes: Record<string, YAMLCode>;
}

interface YAMLSection {
  description: string;
  themes: Record<string, YAMLTheme>;
}

type YAMLData = {
  knowledge_codes: YAMLSection;
  skill_codes: YAMLSection;
  attitude_codes: YAMLSection;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Cache key for KSA data
    const cacheKey = `ksa:${lang}`;
    let cacheStatus: 'HIT' | 'MISS' | 'STALE' = 'MISS';
    
    // Fetcher function for cache
    const fetcher = async () => {
      // Load language-specific KSA codes file from rubrics_data/ksa_codes/
      const fileName = `ksa_codes_${lang}`;
      const data = await jsonYamlLoader.load(`rubrics_data/ksa_codes/${fileName}`, { 
        preferJson: false  // Use YAML files
      }) as YAMLData;

      if (!data) {
        throw new Error('Failed to load KSA data');
      }

      // Process each section (knowledge_codes, skill_codes, attitude_codes)
      // No translation needed as we're loading language-specific files
      const processSection = (sectionData: YAMLSection) => {
      const processedSection = {
        description: sectionData.description,
        themes: {} as Record<string, { 
          name?: string;
          explanation: string; 
          codes: Record<string, { summary: string; questions?: string[] }> 
        }>
      };

      Object.entries(sectionData.themes).forEach(([themeKey, theme]) => {
        processedSection.themes[themeKey] = {
          ...(theme.theme && { name: theme.theme }),
          explanation: theme.explanation,
          codes: {}
        };

        Object.entries(theme.codes).forEach(([codeKey, code]) => {
          processedSection.themes[themeKey].codes[codeKey] = {
            summary: code.summary,
            ...(code.questions && { questions: code.questions })
          };
        });
      });

      return processedSection;
    };

      const response = {
        knowledge_codes: processSection(data.knowledge_codes),
        skill_codes: processSection(data.skill_codes),
        attitude_codes: processSection(data.attitude_codes)
      };

      return response;
    };
    
    // Use distributed cache with SWR (24 hour TTL for semi-static KSA data)
    const response = await distributedCacheService.getWithRevalidation(
      cacheKey,
      fetcher,
      { 
        ttl: TTL.SEMI_STATIC_1H * 24, // 24 hours
        staleWhileRevalidate: TTL.SEMI_STATIC_1H * 24,
        onStatus: (s) => { cacheStatus = s; }
      }
    );

    return new NextResponse(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': cacheStatus
      }
    });
  } catch (error) {
    console.error('Error loading KSA data:', error);
    return NextResponse.json(
      { error: 'Failed to load KSA data' },
      { status: 500 }
    );
  }
}