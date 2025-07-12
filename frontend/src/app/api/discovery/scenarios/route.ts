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
export async function GET() {
  try {
    const scenarioRepo = getScenarioRepository();
    
    // 先嘗試從儲存庫獲取現有的 scenarios
    let scenarios = await scenarioRepo.findBySource('pbl');
    
    // 如果沒有 scenarios，從 YAML 檔案建立
    if (scenarios.length === 0) {
      console.log('No PBL scenarios found, creating from YAML files...');
      scenarios = await createScenariosFromYAML();
    }
    
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
          objectives: info.objectives || [],
          taskTemplates: extractTaskTemplates(yamlData),
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
        estimatedTime: task.time_limit || 30,
        category: task.category || 'general',
        assessmentFocus: task.assessment_focus || {},
        aiModule: task.ai_module || {},
        objectives: task.objectives || [],
        expectedOutcomes: task.expected_outcomes || []
      });
    });
  }
  
  return templates;
}