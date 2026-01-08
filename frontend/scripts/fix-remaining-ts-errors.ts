#!/usr/bin/env npx tsx

import { promises as fs } from "fs";

async function fixRemainingErrors() {
  console.log("🔧 Fixing remaining TypeScript errors...");

  // scenario-initialization-service.test.ts 批量修復
  const scenarioTestFile =
    "/Users/young/project/ai-square/frontend/src/lib/services/__tests__/scenario-initialization-service.test.ts";
  let content = await fs.readFile(scenarioTestFile, "utf-8");

  // 修復 AssessmentYAMLData 結構
  content = content.replace(
    /name: 'AI Literacy Assessment',\s*purpose: 'Test your AI knowledge',\s*duration: '30 minutes',\s*available_languages: \['en', 'zh', 'es'\],/g,
    `config: { title: 'AI Literacy Assessment' },`,
  );

  content = content.replace(
    /name: 'AI Literacy',/g,
    `config: { title: 'AI Literacy' },`,
  );

  content = content.replace(
    /name: 'Empty Assessment'/g,
    `config: { title: 'Empty Assessment' }`,
  );

  content = content.replace(
    /name: 'Custom Assessment',\s*purpose: 'Custom purpose',\s*duration: '45 minutes',/g,
    `config: { title: 'Custom Assessment' },`,
  );

  // 修復 PBLYAMLData 結構 - 添加 programs
  content = content.replace(
    /(\{ scenario_info: \{[^}]+\} \})/g,
    "$1,\n        programs: []",
  );

  // 修復 DiscoveryPath 結構
  content = content.replace(
    /\{ metadata: \{[^}]+\}, category: '[^']+', difficulty_range: '[^']+', world_setting: \{[^}]+\}, skill_tree: \{[^}]+\} \}/g,
    `{
      path_id: 'test-path',
      difficulty_range: 'beginner-intermediate',
      metadata: {
        title: 'Content Creator Path',
        short_description: 'Brief description',
        long_description: 'Create engaging content',
        estimated_hours: 20,
        skill_focus: ['writing', 'design']
      },
      category: 'creative',
      world_setting: {
        name: 'Creative World',
        description: 'A world for creativity',
        atmosphere: 'inspiring',
        visual_theme: 'modern'
      },
      skill_tree: {
        core_skills: [],
        advanced_skills: []
      },
      starting_scenario: 'content-creator-intro',
      milestone_quests: []
    }`,
  );

  content = content.replace(
    /\{ category: 'tech' \}/g,
    `{
      path_id: 'tech-path',
      difficulty_range: 'intermediate',
      metadata: {
        title: 'Tech Path',
        short_description: 'Tech description',
        long_description: 'Tech content',
        estimated_hours: 30,
        skill_focus: ['coding']
      },
      category: 'tech',
      world_setting: {
        name: 'Tech World',
        description: 'Tech world',
        atmosphere: 'innovative',
        visual_theme: 'futuristic'
      },
      skill_tree: {
        core_skills: [],
        advanced_skills: []
      },
      starting_scenario: 'tech-intro',
      milestone_quests: []
    }`,
  );

  // 修復 PBLScenarioInfo 缺少 estimated_duration
  content = content.replace(
    /id: 'test',\s*title: 'Test',\s*description: 'Test description',\s*difficulty: 'beginner',\s*target_domains: \['Engaging_with_AI'\]/g,
    `id: 'test',
          title: 'Test',
          description: 'Test description',
          difficulty: 'beginner',
          estimated_duration: 60,
          target_domains: ['Engaging_with_AI']`,
  );

  // 修復字串 vs 數字類型錯誤
  content = content.replace(
    /estimated_duration: '90 minutes'/g,
    "estimated_duration: 90",
  );

  await fs.writeFile(scenarioTestFile, content, "utf-8");

  // user-data-service-client.test.ts 修復
  const userServiceTestFile =
    "/Users/young/project/ai-square/frontend/src/lib/services/__tests__/user-data-service-client.test.ts";
  let userContent = await fs.readFile(userServiceTestFile, "utf-8");

  // 移除 scenarioId 屬性
  userContent = userContent.replace(/scenarioId: '[^']+',\s*/g, "");

  await fs.writeFile(userServiceTestFile, userContent, "utf-8");

  console.log("✅ Batch fixes applied!");
}

fixRemainingErrors().catch(console.error);
