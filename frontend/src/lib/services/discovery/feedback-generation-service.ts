import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';
import { Interaction } from '@/lib/repositories/interfaces';

export interface LearningJourneyItem {
  type: string;
  attempt: number;
  content?: unknown;
  timeSpent?: number;
  passed?: boolean;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  xpEarned?: number;
}

export class FeedbackGenerationService {
  static getSystemPromptForLanguage(_language: string): string {
    return 'You are an expert educational psychologist and learning coach.';
  }

  static generateComprehensiveFeedbackPrompt(
    language: string,
    careerType: string,
    taskTitle: string,
    taskInstructions: string,
    taskContext: unknown,
    yamlData: unknown,
    learningJourney: unknown[]
  ): string {
    console.log('Language detection for feedback:', {
      inputLanguage: language,
      careerType,
      taskTitle
    });

    return `
You are an experienced mentor from the ${careerType} field. Based on the world setting context and the learner's complete journey, provide a concise but meaningful qualitative assessment.

Context & Setting:
- Career Field: ${careerType}
- Task: ${taskTitle}
- Objective: ${taskInstructions}
${yamlData && (yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting ? `- World Setting: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.description || 'Unknown'}` : ''}
${yamlData && (yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting ? `- Atmosphere: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.atmosphere || 'Unknown'}` : ''}

Learning Journey:
${JSON.stringify(learningJourney, null, 2)}

As a seasoned expert in this field, provide a personalized assessment that:

1. **Highlights key growth moments** - What specific breakthroughs did you observe?
2. **Identifies unique strengths** - What made their approach stand out?
3. **Offers practical next steps** - What should they focus on developing next?

Guidelines:
- Write as an authoritative but approachable mentor in this specific field
- Keep it concise (2-3 short paragraphs maximum)
- Be specific about what they did well, not generic praise
- Include 1-2 concrete suggestions for improvement
- Sign off with an appropriate authority figure name based on the career field:
  * For biotech/life sciences: Use historical figures like "Dr. Fleming" (Alexander Fleming), "Dr. Watson" (James Watson), or "Dr. McClintock" (Barbara McClintock)
  * For technology/AI: Use figures like "Dr. Turing" (Alan Turing), "Prof. McCarthy" (John McCarthy), or "Dr. Hinton" (Geoffrey Hinton)
  * For creative fields: Use figures like "Prof. Jobs" (Steve Jobs), "Master da Vinci" (Leonardo da Vinci), or "Sensei Miyazaki" (Hayao Miyazaki)
  * For business/entrepreneurship: Use figures like "Prof. Drucker" (Peter Drucker), "Mr. Carnegie" (Andrew Carnegie), or "Ms. Graham" (Katherine Graham)
  * For data/analytics: Use figures like "Prof. Tukey" (John Tukey), "Dr. Fisher" (Ronald Fisher), or "Prof. Nightingale" (Florence Nightingale)
  * For other fields: Choose appropriate historical authority figures or create fitting fictional expert names
- Focus on growth and potential rather than perfect performance
- Use markdown formatting with **bold** for emphasis and clear structure
- Use bullet points or numbered lists where appropriate for clarity

Write in language code: ${language} with an encouraging but professional tone that reflects expertise in the ${careerType} domain.`;
  }

  static getStatsSection(language: string, attempts: number, passCount: number, bestXP: number): string {
    return `\n\n📊 Learning Statistics Summary:\n- Total attempts: ${attempts}\n- Passed times: ${passCount}\n- Highest score: ${bestXP} XP`;
  }

  static getSkillsSection(language: string, skills: string[]): string {
    return `\n- Demonstrated abilities: ${skills.join(', ')}`;
  }

  static getFallbackMessage(_language: string): string {
    return 'Congratulations on successfully completing this task! Your effort and persistence are commendable.';
  }

  static buildLearningJourney(interactions: Interaction[]): LearningJourneyItem[] {
    return interactions.map((interaction, index) => {
      if (interaction.type === 'user_input') {
        return {
          type: 'user_response',
          attempt: Math.floor(index / 2) + 1,
          content: interaction.content,
          timeSpent: (interaction.metadata as { timeSpent?: number })?.timeSpent || 0
        };
      } else if (interaction.type === 'ai_response') {
        let parsed: { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
        try {
          parsed = typeof interaction.content === 'string'
            ? JSON.parse(interaction.content)
            : interaction.content as { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
        } catch {
          parsed = { completed: false, feedback: '', strengths: [], improvements: [], xpEarned: 0 };
        }
        return {
          type: 'ai_feedback',
          attempt: Math.floor(index / 2) + 1,
          passed: parsed.completed || false,
          feedback: parsed.feedback || '',
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          xpEarned: parsed.xpEarned || 0
        };
      }
      return { type: 'unknown', attempt: 0 };
    }).filter(item => item.type !== 'unknown');
  }

  static async generateComprehensiveFeedback(
    task: { title?: unknown; metadata?: unknown; content?: unknown; interactions: Interaction[] },
    program: { scenarioId: string; metadata?: unknown },
    careerType: string,
    userLanguage: string
  ): Promise<{ feedback: string; bestXP: number; passedAttempts: number }> {
    const language = (program.metadata as { language?: string })?.language || 'en';
    const userAttempts = task.interactions.filter(i => i.type === 'user_input').length;
    const aiResponses = task.interactions.filter(i => i.type === 'ai_response');

    const passedAttempts = aiResponses.filter(i => {
      try {
        const content = typeof i.content === 'string' ? JSON.parse(i.content) : i.content;
        return (content as { completed?: boolean }).completed === true;
      } catch {
        return false;
      }
    }).length;

    const allFeedback = task.interactions.filter(i => i.type === 'ai_response').map(i => {
      try {
        return JSON.parse(String(i.content)) as { xpEarned?: number; skillsImproved?: string[] };
      } catch {
        return { xpEarned: 0, skillsImproved: [] };
      }
    });

    const bestXP = Math.max(
      ...allFeedback.map(f => f.xpEarned || 0),
      (task.content as Record<string, unknown>)?.xp as number || 100
    );

    const learningJourney = this.buildLearningJourney(task.interactions);

    let yamlData = null;
    if (careerType !== 'unknown') {
      const loader = new DiscoveryYAMLLoader();
      yamlData = await loader.loadPath(careerType, language);
    }

    const taskTitle = (() => {
      const titleObj = task.title;
      if (typeof titleObj === 'string') return titleObj;
      if (typeof titleObj === 'object' && titleObj !== null) {
        return (titleObj as Record<string, string>)[language] || (titleObj as Record<string, string>)['en'] || '';
      }
      return '';
    })();

    const comprehensivePrompt = this.generateComprehensiveFeedbackPrompt(
      userLanguage,
      careerType,
      taskTitle,
      (task.metadata as Record<string, unknown>)?.instructions as string || '',
      task.content || {},
      yamlData,
      learningJourney
    );

    console.log('Generated prompt for comprehensive feedback:', { language: userLanguage, careerType });

    const aiService = new VertexAIService({
      systemPrompt: this.getSystemPromptForLanguage(userLanguage),
      temperature: 0.8,
      model: 'gemini-2.5-flash'
    });

    const aiResponse = await aiService.sendMessage(comprehensivePrompt);
    let comprehensiveFeedback = aiResponse.content;

    if (userAttempts > 1) {
      comprehensiveFeedback += this.getStatsSection(userLanguage, userAttempts, passedAttempts, bestXP);

      const allSkills = new Set<string>();
      allFeedback.forEach(f => {
        if (f.skillsImproved) {
          f.skillsImproved.forEach((skill: string) => allSkills.add(skill));
        }
      });

      if (allSkills.size > 0) {
        comprehensiveFeedback += this.getSkillsSection(userLanguage, Array.from(allSkills));
      }
    }

    return { feedback: comprehensiveFeedback, bestXP, passedAttempts };
  }
}
