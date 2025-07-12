import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/lib/cache/cache-service';
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
  const cacheKey = `relations-${lang}`;

  try {
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    // Load data using the new hybrid loader with language support
    const [domainsData, ksaCodesData] = await Promise.all([
      jsonYamlLoader.load('ai_lit_domains', { preferJson: true, language: lang }) as Promise<DomainsYaml>,
      jsonYamlLoader.load('ksa_codes', { preferJson: true, language: lang }) as Promise<KSACodesYaml>
    ]);

    if (!domainsData || !ksaCodesData) {
      return NextResponse.json(
        { error: 'Failed to load data files' },
        { status: 500 }
      );
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
            content: comp.content
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

    const responseData = {
      domains,
      ksa,
      kMap,
      sMap,
      aMap
    };

    // Cache the response
    await cacheService.set(cacheKey, responseData, { ttl: 5 * 60 * 1000 }); // 5 minutes

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error loading relations data:', error);
    
    return NextResponse.json(
      { error: 'Failed to load relations data' },
      { status: 500 }
    );
  }
}