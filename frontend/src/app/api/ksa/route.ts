import { NextRequest, NextResponse } from 'next/server';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';

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

    // Load language-specific KSA codes file
    // For language-specific files, use format: ksa_codes_lang
    const fileName = lang === 'en' ? 'ksa_codes' : `ksa_codes_${lang}`;
    const data = await jsonYamlLoader.load(fileName, { 
      preferJson: true 
    }) as YAMLData;

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to load KSA data' },
        { status: 500 }
      );
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error loading KSA data:', error);
    return NextResponse.json(
      { error: 'Failed to load KSA data' },
      { status: 500 }
    );
  }
}