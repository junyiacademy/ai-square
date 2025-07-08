import yaml from 'js-yaml';

export interface KSACode {
  code: string;
  name: string;
  summary: string;
  theme: string;
  explanation?: string;
  questions?: string[];
}

export interface KSATheme {
  name: string;
  codes: Record<string, { summary: string; questions?: string[] }>;
  explanation: string;
}

export interface KSAData {
  knowledge: {
    description: string;
    themes: Record<string, KSATheme>;
  };
  skills: {
    description: string;
    themes: Record<string, KSATheme>;
  };
  attitudes: {
    description: string;
    themes: Record<string, KSATheme>;
  };
}

export class KSAService {
  private static instance: KSAService;
  private ksaDataCache: Map<string, KSAData> = new Map();
  
  static getInstance(): KSAService {
    if (!KSAService.instance) {
      KSAService.instance = new KSAService();
    }
    return KSAService.instance;
  }
  
  async loadKSAData(language: string = 'en'): Promise<KSAData> {
    // Check cache first
    if (this.ksaDataCache.has(language)) {
      return this.ksaDataCache.get(language)!;
    }
    
    try {
      const response = await fetch(`/rubrics_data/ksa_codes/ksa_codes_${language}.yaml`);
      if (!response.ok) {
        throw new Error(`Failed to load KSA data for language: ${language}`);
      }
      
      const text = await response.text();
      const data = yaml.load(text) as any;
      
      const ksaData: KSAData = {
        knowledge: {
          description: data.knowledge_codes.description,
          themes: data.knowledge_codes.themes
        },
        skills: {
          description: data.skill_codes.description,
          themes: data.skill_codes.themes
        },
        attitudes: {
          description: data.attitude_codes.description,
          themes: data.attitude_codes.themes
        }
      };
      
      // Cache the data
      this.ksaDataCache.set(language, ksaData);
      
      return ksaData;
    } catch (error) {
      console.error('Error loading KSA data:', error);
      throw error;
    }
  }
  
  getKSAByCode(ksaData: KSAData, code: string): KSACode | null {
    const type = code.startsWith('K') ? 'knowledge' : 
                 code.startsWith('S') ? 'skills' : 
                 code.startsWith('A') ? 'attitudes' : null;
    
    if (!type) return null;
    
    const themes = ksaData[type].themes;
    
    for (const [themeName, theme] of Object.entries(themes)) {
      if (theme.codes && theme.codes[code]) {
        return {
          code,
          name: this.formatThemeName(themeName),
          summary: theme.codes[code].summary,
          theme: themeName,
          explanation: theme.explanation,
          questions: theme.codes[code].questions
        };
      }
    }
    
    return null;
  }
  
  getAllKSACodes(ksaData: KSAData): {
    knowledge: KSACode[];
    skills: KSACode[];
    attitudes: KSACode[];
  } {
    const result = {
      knowledge: [] as KSACode[],
      skills: [] as KSACode[],
      attitudes: [] as KSACode[]
    };
    
    // Process each type
    (['knowledge', 'skills', 'attitudes'] as const).forEach(type => {
      const themes = ksaData[type].themes;
      
      for (const [themeName, theme] of Object.entries(themes)) {
        if (theme.codes) {
          for (const [code, codeData] of Object.entries(theme.codes)) {
            result[type].push({
              code,
              name: this.formatThemeName(themeName),
              summary: codeData.summary,
              theme: themeName,
              explanation: theme.explanation,
              questions: codeData.questions
            });
          }
        }
      }
    });
    
    return result;
  }
  
  private formatThemeName(themeName: string): string {
    return themeName.replace(/_/g, ' ');
  }
}

export const ksaService = KSAService.getInstance();