import { NextRequest, NextResponse } from 'next/server';
import { completeYAMLContent, translateYAMLContent, improveYAMLContent } from '@/lib/vertex-ai';
import * as yaml from 'js-yaml';
import { AIAssistRequest, AIAssistResponse, YAMLValidation, PBLScenario } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { action, content, file }: AIAssistRequest = await request.json();

    if (!action || !content) {
      return NextResponse.json(
        { error: 'Action and content are required' },
        { status: 400 }
      );
    }

    let result = '';
    let validation: YAMLValidation = { valid: true, errors: [], summary: '' };

    switch (action) {
      case 'complete':
        result = await completeYAMLContent(content, file);
        break;
      
      case 'translate':
        result = await translateYAMLContent(content);
        break;
      
      case 'improve':
        result = await improveYAMLContent(content);
        break;
      
      case 'ksa':
        // Import KSA mapping function dynamically
        const { mapKSAContent } = await import('@/lib/vertex-ai');
        result = await mapKSAContent(content);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Validate the result
    try {
      const parsed = yaml.load(result) as PBLScenario;
      
      // Check for required keys based on file type
      if (file?.includes('scenario')) {
        const requiredKeys = ['scenario_info', 'tasks'];
        const missingKeys = requiredKeys.filter(key => !parsed[key]);
        
        if (missingKeys.length > 0) {
          validation.valid = false;
          validation.errors.push(`Missing required keys: ${missingKeys.join(', ')}`);
        }
        
        // Check multilingual fields for translation action
        if (parsed.scenario_info && action === 'translate') {
          const languages = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
          const baseFields = ['title', 'description'];
          
          for (const field of baseFields) {
            // Check if base field exists
            if (!parsed.scenario_info[field]) {
              validation.errors.push(`Missing base field: ${field}`);
            }
            
            // Check translations
            const missingTranslations = languages.filter(
              lang => !parsed.scenario_info[`${field}_${lang}`]
            );
            
            if (missingTranslations.length > 0) {
              validation.errors.push(`Missing ${field} translations: ${missingTranslations.join(', ')}`);
            }
          }
          
          // Check array fields
          const arrayFields = ['prerequisites', 'learning_objectives'];
          for (const field of arrayFields) {
            if (parsed.scenario_info[field]) {
              const missingTranslations = languages.filter(
                lang => !parsed.scenario_info[`${field}_${lang}`] || 
                        !Array.isArray(parsed.scenario_info[`${field}_${lang}`])
              );
              
              if (missingTranslations.length > 0) {
                validation.errors.push(`Missing ${field} translations: ${missingTranslations.join(', ')}`);
              }
            }
          }
          
          if (validation.errors.length > 0) {
            validation.valid = false;
          }
        }
      }
      
      // Validate YAML structure
      if (typeof parsed !== 'object' || parsed === null) {
        validation.valid = false;
        validation.errors.push('Invalid YAML structure: result is not an object');
      }
      
      if (validation.valid) {
        validation.summary = `✅ YAML structure is valid with ${Object.keys(parsed).length} top-level keys`;
      }
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const response: AIAssistResponse = { result, validation };
    return NextResponse.json(response);
  } catch (error) {
    console.error('AI assist error:', error);
    return NextResponse.json(
      { error: 'AI processing failed' },
      { status: 500 }
    );
  }
}