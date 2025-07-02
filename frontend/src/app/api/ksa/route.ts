import { NextRequest, NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

interface YAMLCode {
  summary: string;
  questions?: string[];
  [key: string]: unknown;
}

interface YAMLTheme {
  explanation: string;
  codes: Record<string, YAMLCode>;
  [key: string]: unknown;
}

interface YAMLSection {
  desciption: string; // Note: typo in original YAML
  themes: Record<string, YAMLTheme>;
  [key: string]: unknown;
}

interface YAMLData {
  knowledge_codes: YAMLSection;
  skill_codes: YAMLSection;
  attitude_codes: YAMLSection;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    const filePath = path.join(process.cwd(), 'public', 'rubrics_data', 'ksa_codes.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents) as YAMLData;

    // Helper function to get translated field
    const getTranslatedField = (obj: Record<string, unknown>, fieldName: string, language: string): string | string[] => {
      if (language === 'en') {
        return obj[fieldName] as string | string[];
      }
      
      // Handle zhTW -> zh mapping
      let langCode = language;
      if (language === 'zhTW') {
        langCode = 'zh';
      }
      
      const translatedField = `${fieldName}_${langCode}`;
      return (obj[translatedField] as string | string[]) || (obj[fieldName] as string | string[]);
    };

    // Process each section (knowledge_codes, skill_codes, attitude_codes)
    const processSection = (sectionData: YAMLSection, lang: string) => {
      const processedSection = {
        description: getTranslatedField(sectionData, 'desciption', lang) as string, // Note: typo in original YAML
        themes: {} as Record<string, { explanation: string; codes: Record<string, { summary: string; questions?: string[] }> }>
      };

      Object.entries(sectionData.themes).forEach(([themeKey, theme]) => {
        processedSection.themes[themeKey] = {
          explanation: getTranslatedField(theme, 'explanation', lang) as string,
          codes: {}
        };

        Object.entries(theme.codes).forEach(([codeKey, code]) => {
          processedSection.themes[themeKey].codes[codeKey] = {
            summary: getTranslatedField(code, 'summary', lang) as string,
            ...(code.questions && {
              questions: getTranslatedField(code, 'questions', lang) as string[]
            })
          };
        });
      });

      return processedSection;
    };

    const response = {
      knowledge_codes: processSection(data.knowledge_codes, lang),
      skill_codes: processSection(data.skill_codes, lang),
      attitude_codes: processSection(data.attitude_codes, lang)
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