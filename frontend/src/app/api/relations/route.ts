import { NextRequest, NextResponse } from 'next/server';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { cacheKeys, TTL } from '@/lib/cache/cache-keys';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';

// Type definitions for language-specific YAML files
interface CompetencyYaml {
  description: string;
  scenarios?: string[];
  content?: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface DomainYaml {
  title?: string;
  overview: string;
  competencies: Record<string, CompetencyYaml>;
  emoji?: string;
}

interface KSAItemYaml {
  summary: string;
}

interface ThemeYaml {
  theme?: string;
  explanation: string;
  codes: Record<string, KSAItemYaml>;
}

interface DomainsYaml {
  domains: Record<string, DomainYaml>;
}
interface KSAThemesYaml {
  themes: Record<string, ThemeYaml>;
}
interface KSACodesYaml {
  knowledge_codes: KSAThemesYaml;
  skill_codes: KSAThemesYaml;
  attitude_codes: KSAThemesYaml;
}

// Response types for API
interface CompetencyResponse {
  id: string;
  description: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
  scenarios?: string[];
  content?: string;
}

interface DomainResponse {
  id: string;
  name: string;
  overview: string;
  competencies: CompetencyResponse[];
  emoji?: string;
}

interface KSAItemResponse {
  code: string;
  summary: string;
}

interface ThemeResponse {
  id: string;
  name: string;
  explanation: string;
  items: KSAItemResponse[];
}

interface KSADataResponse {
  themes: ThemeResponse[];
}


export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') || 'en';
  const cacheKey = cacheKeys.relationsByLang(lang);

  try {
    // Try distributed cache with SWR
    const fetcher = async () => {
      // Load data using the new hybrid loader with language-specific paths
      // Note: We only have YAML files, not JSON, so disable preferJson
      const [domainsData, ksaCodesData] = await Promise.all([
        jsonYamlLoader.load(`rubrics_data/ai_lit_domains/ai_lit_domains_${lang}`, { preferJson: false }) as Promise<DomainsYaml>,
        jsonYamlLoader.load(`rubrics_data/ksa_codes/ksa_codes_${lang}`, { preferJson: false }) as Promise<KSACodesYaml>
      ]);

      if (!domainsData || !ksaCodesData) {
        throw new Error('Failed to load data files');
      }

      // Process domains - use title field if available, fallback to formatted domainId
      const domains: DomainResponse[] = Object.entries(domainsData.domains).map(
        ([domainId, domain]) => ({
          id: domainId,
          name: domain.title || domainId.replace(/_/g, ' '),
          overview: domain.overview,
          emoji: domain.emoji,
          competencies: Object.entries(domain.competencies).map(
            ([compId, comp]) => ({
              id: compId,
              description: comp.description,
              knowledge: comp.knowledge || [],
              skills: comp.skills || [],
              attitudes: comp.attitudes || [],
              scenarios: comp.scenarios,
              context: comp.content
            })
          )
        })
      );

      // Process KSA data - no translation needed as we're loading language-specific files
      const processKSASection = (section: KSAThemesYaml): KSADataResponse => ({
        themes: Object.entries(section.themes).map(([themeId, theme]) => ({
          id: themeId,
          name: theme.theme || themeId.replace(/_/g, ' '),
          explanation: theme.explanation || '',
          items: Object.entries(theme.codes).map(([code, item]) => ({
            code,
            summary: item.summary
          }))
        }))
      });

      // Create the KSA structure
      const ksa = {
        knowledge: processKSASection(ksaCodesData.knowledge_codes),
        skills: processKSASection(ksaCodesData.skill_codes),
        attitudes: processKSASection(ksaCodesData.attitude_codes)
      };

      // Create legacy maps for backward compatibility
      const kMap: Record<string, { summary: string; theme: string; explanation?: string }> = {};
      const sMap: Record<string, { summary: string; theme: string; explanation?: string }> = {};
      const aMap: Record<string, { summary: string; theme: string; explanation?: string }> = {};

      // Convert knowledge items
      ksa.knowledge.themes.forEach(theme => {
        theme.items.forEach(item => {
          kMap[item.code] = {
            summary: item.summary,
            theme: theme.name,
            explanation: theme.explanation
          };
        });
      });

      // Convert skills items
      ksa.skills.themes.forEach(theme => {
        theme.items.forEach(item => {
          sMap[item.code] = {
            summary: item.summary,
            theme: theme.name,
            explanation: theme.explanation
          };
        });
      });

      // Convert attitudes items
      ksa.attitudes.themes.forEach(theme => {
        theme.items.forEach(item => {
          aMap[item.code] = {
            summary: item.summary,
            theme: theme.name,
            explanation: theme.explanation
          };
        });
      });

      return {
        domains,
        ksa,
        kMap,
        sMap,
        aMap
      };
    };

    let cacheStatus: 'HIT' | 'MISS' | 'STALE' = 'MISS';
    const data = await distributedCacheService.getWithRevalidation(
      cacheKey,
      fetcher,
      { ttl: TTL.SEMI_STATIC_1H, staleWhileRevalidate: TTL.SEMI_STATIC_1H, onStatus: (s) => { cacheStatus = s; } }
    );

    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': cacheStatus
      }
    });
  } catch (error) {
    console.error('Error loading relations data:', error);
    
    return NextResponse.json(
      { error: 'Failed to load relations data' },
      { status: 500 }
    );
  }
}