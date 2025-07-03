import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetDomain: string[];
  estimatedDuration: number;
  prerequisites?: string[];
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

interface RecommendationRequest {
  userId?: string;
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  completedScenarios?: string[];
  learningGoals?: string[];
  preferredDifficulty?: string;
}

interface ScenarioRecommendation {
  scenarioId: string;
  title: string;
  description: string;
  difficulty: string;
  relevanceScore: number;
  reasons: string[];
  estimatedImprovement: {
    domain: string;
    expectedGain: number;
  };
  estimatedDuration: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest = await request.json();
    const { domainScores, completedScenarios = [], learningGoals = [] } = body;

    // Load all scenario data
    const scenariosDir = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');
    const folders = await fs.readdir(scenariosDir);
    
    // Get language from request headers or default to 'en'
    const lang = request.headers.get('Accept-Language')?.split(',')[0]?.split('-')[0] || 'en';

    const scenarios: ScenarioData[] = [];
    for (const folder of folders) {
      if (folder.startsWith('_')) continue; // Skip template folders
      
      try {
        // Try language-specific file first
        let filePath = path.join(scenariosDir, folder, `${folder}_${lang}.yaml`);
        
        // Check if language-specific file exists, fallback to English
        try {
          await fs.access(filePath);
        } catch {
          filePath = path.join(scenariosDir, folder, `${folder}_en.yaml`);
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        const data = yaml.load(content) as ScenarioData;
        scenarios.push(data);
      } catch (error) {
        console.error(`Error loading scenario from folder ${folder}:`, error);
      }
    }

    // Filter out completed scenarios
    const availableScenarios = scenarios.filter(
      scenario => !completedScenarios.includes(scenario.id)
    );

    // Calculate recommendations
    const recommendations: ScenarioRecommendation[] = availableScenarios.map(scenario => {
      const relevance = calculateRelevance(scenario, domainScores, learningGoals);
      const improvement = estimateImprovement(scenario, domainScores);

      return {
        scenarioId: scenario.id,
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty,
        relevanceScore: relevance.score,
        reasons: relevance.reasons,
        estimatedImprovement: improvement,
        estimatedDuration: scenario.estimatedDuration
      };
    });

    // Sort by relevance score
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top recommendations
    const topRecommendations = recommendations.slice(0, 10);

    return NextResponse.json({
      success: true,
      recommendations: topRecommendations,
      totalAvailable: availableScenarios.length
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate recommendations' 
      },
      { status: 500 }
    );
  }
}

function calculateRelevance(
  scenario: ScenarioData,
  domainScores: RecommendationRequest['domainScores'],
  learningGoals: string[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Check target domains
  scenario.targetDomain.forEach(domain => {
    const domainKey = domain.replace(' ', '_').toLowerCase() as keyof typeof domainScores;
    const domainScore = domainScores[domainKey];

    if (domainScore !== undefined) {
      if (domainScore < 60) {
        // Weak domain - high priority
        score += 30;
        reasons.push(`Targets weak domain: ${domain} (current: ${domainScore}%)`);
      } else if (domainScore < 80) {
        // Average domain - medium priority
        score += 20;
        reasons.push(`Improves average domain: ${domain} (current: ${domainScore}%)`);
      } else {
        // Strong domain - low priority for basics, high for advanced
        if (scenario.difficulty === 'advanced') {
          score += 25;
          reasons.push(`Advanced challenge for strong domain: ${domain}`);
        } else {
          score += 10;
          reasons.push(`Maintains strong domain: ${domain}`);
        }
      }
    }
  });

  // Difficulty matching
  const avgScore = Object.values(domainScores).reduce((a, b) => a + b, 0) / 4;
  if (avgScore < 50 && scenario.difficulty === 'beginner') {
    score += 15;
    reasons.push('Beginner-friendly for current level');
  } else if (avgScore >= 50 && avgScore < 70 && scenario.difficulty === 'intermediate') {
    score += 15;
    reasons.push('Appropriate intermediate challenge');
  } else if (avgScore >= 70 && scenario.difficulty === 'advanced') {
    score += 15;
    reasons.push('Advanced challenge for high performer');
  }

  // Learning goals alignment
  if (learningGoals.length > 0) {
    const goalKeywords = learningGoals.map(g => g.toLowerCase());
    const scenarioText = `${scenario.title} ${scenario.description}`.toLowerCase();
    
    goalKeywords.forEach(keyword => {
      if (scenarioText.includes(keyword)) {
        score += 10;
        reasons.push(`Aligns with learning goal: ${keyword}`);
      }
    });
  }

  // KSA diversity bonus
  const ksaCount = 
    (scenario.ksa_mapping?.knowledge?.length || 0) +
    (scenario.ksa_mapping?.skills?.length || 0) +
    (scenario.ksa_mapping?.attitudes?.length || 0);
  
  if (ksaCount > 10) {
    score += 5;
    reasons.push('Comprehensive KSA coverage');
  }

  return { score, reasons };
}

function estimateImprovement(
  scenario: ScenarioData,
  domainScores: RecommendationRequest['domainScores']
): { domain: string; expectedGain: number } {
  // Find the primary target domain
  const primaryDomain = scenario.targetDomain[0];
  const domainKey = primaryDomain.replace(' ', '_').toLowerCase() as keyof typeof domainScores;
  const currentScore = domainScores[domainKey] || 50;

  // Estimate gain based on difficulty and current level
  let expectedGain = 0;
  
  if (scenario.difficulty === 'beginner') {
    if (currentScore < 40) expectedGain = 15;
    else if (currentScore < 60) expectedGain = 10;
    else expectedGain = 5;
  } else if (scenario.difficulty === 'intermediate') {
    if (currentScore < 50) expectedGain = 8;
    else if (currentScore < 70) expectedGain = 12;
    else expectedGain = 6;
  } else if (scenario.difficulty === 'advanced') {
    if (currentScore < 60) expectedGain = 5;
    else if (currentScore < 80) expectedGain = 10;
    else expectedGain = 8;
  }

  // Cap at 100
  expectedGain = Math.min(expectedGain, 100 - currentScore);

  return {
    domain: primaryDomain,
    expectedGain
  };
}