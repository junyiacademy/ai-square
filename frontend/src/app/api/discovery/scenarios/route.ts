/**
 * PBL Scenarios API - 統一架構版本
 * 從 YAML 檔案載入並建立 Scenarios
 */

import { NextResponse } from 'next/server';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { IScenario } from '@/types/unified-learning';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

/**
 * GET /api/pbl/unified/scenarios
 * 獲取所有 PBL Scenarios
 */
// 簡單的記憶體快取
let cachedScenarios: IScenario[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘

export async function GET() {
  try {
    // 檢查快取
    const now = Date.now();
    if (cachedScenarios && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedScenarios);
    }
    
    const scenarioRepo = getScenarioRepository();
    
    // 先嘗試從儲存庫獲取現有的 scenarios
    let scenarios = await scenarioRepo.findBySource('pbl');
    
    // 如果沒有 scenarios，從 YAML 檔案建立
    if (scenarios.length === 0) {
      console.log('No PBL scenarios found, creating from YAML files...');
      scenarios = await createScenariosFromYAML();
    }
    
    // 更新快取
    cachedScenarios = scenarios;
    cacheTimestamp = now;
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error in GET /api/pbl/unified/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 從 YAML 檔案建立 Scenarios
 */
async function createScenariosFromYAML(): Promise<IScenario[]> {
  const scenarioRepo = getScenarioRepository();
  const scenarios: IScenario[] = [];
  
  // 掃描 pbl_data/scenarios 目錄
  const yamlDir = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
  
  try {
    const dirs = await fs.readdir(yamlDir);
    // 過濾出目錄，排除模板文件
    const scenarioDirs = dirs.filter(d => !d.startsWith('_') && !d.endsWith('.yaml'));
    
    for (const dir of scenarioDirs) {
      try {
        const dirPath = path.join(yamlDir, dir);
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) continue;
        
        // 嘗試讀取英文版本作為預設
        const enFilePath = path.join(dirPath, `${dir}_en.yaml`);
        const fileContent = await fs.readFile(enFilePath, 'utf8');
        const yamlData = yaml.load(fileContent) as any;
        
        // 從 scenario_info 提取資訊
        const info = yamlData.scenario_info || yamlData;
        
        // 建立 Scenario
        const scenario: Omit<IScenario, 'id'> = {
          sourceType: 'pbl',
          sourceRef: {
            type: 'yaml',
            path: `pbl_data/scenarios/${dir}`,
            metadata: {
              originalFile: `${dir}_en.yaml`,
              domain: info.target_domains?.[0] || 'general',
              difficulty: info.difficulty || 'intermediate'
            }
          },
          title: info.title || dir.replace(/_/g, ' '),
          description: info.description || '',
          objectives: info.learning_objectives || info.objectives || [],
          taskTemplates: extractTaskTemplates(yamlData),
          metadata: {
            // Store complete YAML data in metadata for page display
            ...yamlData,
            // Flattened scenario info for easier access
            scenario_info: info,
            difficulty: info.difficulty || 'intermediate',
            estimatedDuration: info.estimated_duration || 60,
            targetDomains: info.target_domains || [],
            prerequisites: info.prerequisites || [],
            learningObjectives: info.learning_objectives || [],
            ksaMapping: yamlData.ksa_mapping || {},
            tasks: yamlData.tasks || [],
            // Ensure compatibility with existing page expectations
            ksa_mapping: yamlData.ksa_mapping || {},
            estimated_duration: info.estimated_duration || 60,
            target_domains: info.target_domains || []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const created = await scenarioRepo.create(scenario);
        scenarios.push(created);
        
        console.log(`Created PBL scenario: ${created.title} (${created.id})`);
      } catch (error) {
        console.error(`Failed to create scenario from ${dir}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to read YAML directory:', error);
  }
  
  return scenarios;
}

/**
 * 從 YAML 資料中提取任務模板
 */
function extractTaskTemplates(yamlData: any): any[] {
  const templates: any[] = [];
  
  // 檢查 tasks 陣列
  if (yamlData.tasks && Array.isArray(yamlData.tasks)) {
    yamlData.tasks.forEach((task: any, index: number) => {
      templates.push({
        id: task.id || `task-${index + 1}`,
        title: task.title || `Task ${index + 1}`,
        description: task.description || '',
        instructions: task.instructions || [],
        expectedOutcome: task.expected_outcome || task.expected_outcomes || '',
        timeLimit: task.time_limit || 30,
        category: task.category || task.type || 'general',
        type: task.type || task.category || 'general',
        ksaFocus: task.KSA_focus || {},
        aiModule: task.ai_module || {},
        objectives: task.objectives || [],
        metadata: {
          // Store complete task data
          ...task
        }
      });
    });
  }
  
  return templates;
}