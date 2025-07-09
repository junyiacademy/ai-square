/**
 * Integration test demonstrating Assessment V2 Storage usage
 */

import { AssessmentStorageV2Service } from '../assessment-storage-v2.service';

// Mock GCS provider
jest.mock('@/lib/core/storage/providers/gcs-storage.provider', () => {
  const mockData = new Map<string, any>();
  
  return {
    GCSStorageProvider: jest.fn().mockImplementation(() => ({
      set: jest.fn().mockImplementation((path: string, data: any) => {
        mockData.set(path, data);
        return Promise.resolve();
      }),
      get: jest.fn().mockImplementation((path: string) => {
        const data = mockData.get(path);
        if (!data) throw new Error('Not found');
        return Promise.resolve(data);
      }),
      list: jest.fn().mockImplementation((prefix: string, filter?: (item: any) => boolean) => {
        const items: any[] = [];
        for (const [key, value] of mockData.entries()) {
          if (key.startsWith(prefix)) {
            if (!filter || filter(value)) {
              items.push(value);
            }
          }
        }
        return Promise.resolve(items);
      })
    }))
  };
});

describe('Assessment V2 Complete Flow', () => {
  let storage: AssessmentStorageV2Service;
  
  beforeEach(() => {
    storage = new AssessmentStorageV2Service();
  });
  
  it('should complete a full assessment flow', async () => {
    console.log('🚀 Starting Assessment V2 Integration Test\n');
    
    // 1. Create Assessment Scenario (from YAML)
    console.log('1️⃣ Creating Assessment Scenario...');
    const scenario = await storage.saveScenario({
      sourceFile: 'ai_literacy_comprehensive.yaml',
      sourceId: 'ai_literacy',
      type: 'assessment',
      title: { 
        en: 'AI Literacy Comprehensive Assessment',
        zh: 'AI 素養綜合評估'
      },
      description: { 
        en: 'Test your understanding of AI concepts',
        zh: '測試你對 AI 概念的理解'
      },
      assessmentType: 'comprehensive',
      difficulty: 'intermediate',
      estimatedMinutes: 30,
      totalQuestions: 10,
      passingScore: 70,
      domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai'],
      competencies: ['AI.1.1', 'AI.2.1', 'AI.3.1'],
      questionPool: {
        total: 50,
        byDomain: { 
          engaging_with_ai: 20, 
          creating_with_ai: 20,
          managing_with_ai: 10 
        },
        byDifficulty: { 
          basic: 15, 
          intermediate: 25, 
          advanced: 10 
        }
      }
    });
    console.log(`✅ Scenario created: ${scenario.id}\n`);
    
    // 2. User starts assessment
    console.log('2️⃣ User starting assessment...');
    const userEmail = 'alice@example.com';
    const program = await storage.createProgram(userEmail, scenario.id, {
      language: 'zh',
      randomizeQuestions: true
    });
    console.log(`✅ Program created: ${program.id}`);
    console.log(`   Language: ${program.config.language}`);
    console.log(`   Total Questions: ${program.progress.totalQuestions}\n`);
    
    // 3. Create questions for the assessment
    console.log('3️⃣ Loading questions...');
    const questions = [
      {
        id: 'q1',
        domain: 'engaging_with_ai',
        difficulty: 'basic',
        type: 'multiple_choice',
        question: { 
          en: 'What is artificial intelligence?',
          zh: '什麼是人工智慧？' 
        },
        options: { 
          en: { 
            a: 'A type of computer', 
            b: 'Software that can learn',
            c: 'A robot',
            d: 'The internet'
          },
          zh: {
            a: '一種電腦',
            b: '可以學習的軟體',
            c: '機器人',
            d: '網際網路'
          }
        },
        correctAnswer: 'b',
        explanation: { 
          en: 'AI is software that can learn from data',
          zh: 'AI 是可以從數據中學習的軟體'
        },
        ksaMapping: {
          knowledge: ['K.1.1'],
          skills: [],
          attitudes: []
        }
      },
      {
        id: 'q2',
        domain: 'creating_with_ai',
        difficulty: 'intermediate',
        type: 'multiple_choice',
        question: { 
          en: 'Which is an example of generative AI?',
          zh: '哪個是生成式 AI 的例子？'
        },
        options: {
          en: {
            a: 'GPS navigation',
            b: 'ChatGPT',
            c: 'Calculator',
            d: 'Spreadsheet'
          },
          zh: {
            a: 'GPS 導航',
            b: 'ChatGPT',
            c: '計算機',
            d: '試算表'
          }
        },
        correctAnswer: 'b',
        explanation: {
          en: 'ChatGPT is a generative AI that creates text',
          zh: 'ChatGPT 是一種可以生成文字的生成式 AI'
        },
        ksaMapping: {
          knowledge: ['K.2.1'],
          skills: ['S.2.1'],
          attitudes: []
        }
      },
      {
        id: 'q3',
        domain: 'managing_with_ai',
        difficulty: 'advanced',
        type: 'short_answer',
        question: {
          en: 'Explain one ethical concern about AI',
          zh: '解釋一個關於 AI 的倫理問題'
        },
        correctAnswer: 'Various answers accepted',
        explanation: {
          en: 'Common concerns include bias, privacy, job displacement',
          zh: '常見問題包括偏見、隱私、工作取代'
        },
        ksaMapping: {
          knowledge: ['K.3.1'],
          skills: ['S.3.1'],
          attitudes: ['A.3.1']
        }
      }
    ];
    
    const tasks = await storage.createTasksForProgram(program.id, questions.slice(0, 3));
    console.log(`✅ Created ${tasks.length} tasks\n`);
    
    // 4. User answers questions
    console.log('4️⃣ User answering questions...');
    
    // Question 1
    console.log('   Question 1:');
    await storage.addAnswerToHistory(tasks[0].id, 'view');
    await storage.addAnswerToHistory(tasks[0].id, 'answer', 'a');
    await storage.addAnswerToHistory(tasks[0].id, 'change', 'b');
    const task1 = await storage.addAnswerToHistory(tasks[0].id, 'submit', 'b');
    console.log(`   ✅ Submitted answer: ${task1.finalAnswer} (Correct!)`);
    
    // Question 2
    console.log('   Question 2:');
    await storage.addAnswerToHistory(tasks[1].id, 'view');
    const task2 = await storage.addAnswerToHistory(tasks[1].id, 'submit', 'b');
    console.log(`   ✅ Submitted answer: ${task2.finalAnswer} (Correct!)`);
    
    // Question 3
    console.log('   Question 3:');
    await storage.addAnswerToHistory(tasks[2].id, 'view');
    const task3 = await storage.addAnswerToHistory(tasks[2].id, 'submit', 'AI can have bias');
    console.log(`   ✅ Submitted answer: "${task3.finalAnswer}"\n`);
    
    // 5. Evaluate answers
    console.log('5️⃣ Evaluating answers...');
    await storage.createEvaluation(tasks[0].id, true, 100);
    await storage.createEvaluation(tasks[1].id, true, 100);
    await storage.createEvaluation(tasks[2].id, true, 90); // Short answer partial credit
    console.log('✅ All answers evaluated\n');
    
    // 6. Complete assessment
    console.log('6️⃣ Completing assessment...');
    await storage.updateProgram(program.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      timeSpentMinutes: 15,
      progress: {
        currentQuestionIndex: 3,
        answeredQuestions: 3,
        totalQuestions: 3
      },
      results: {
        overallScore: 96.67,
        correctAnswers: 3,
        totalQuestions: 3,
        passed: true,
        performance: 'excellent',
        domainScores: {
          engaging_with_ai: { score: 100, correct: 1, total: 1 },
          creating_with_ai: { score: 100, correct: 1, total: 1 },
          managing_with_ai: { score: 90, correct: 1, total: 1 }
        },
        ksaScores: {
          knowledge: 95,
          skills: 95,
          attitudes: 90
        }
      }
    });
    
    const completion = await storage.createCompletion(program.id);
    console.log('✅ Assessment completed!');
    console.log(`   Overall Score: ${completion.overallScore}%`);
    console.log(`   Performance: ${completion.performance}`);
    console.log(`   Passed: ${completion.passed ? 'Yes' : 'No'}`);
    if (completion.certificate) {
      console.log(`   🏆 Certificate issued: ${completion.certificate.verificationCode}`);
    }
    console.log('\n');
    
    // 7. View user's assessment history
    console.log('7️⃣ Viewing user assessment history...');
    const userPrograms = await storage.getUserPrograms(userEmail);
    console.log(`✅ User has completed ${userPrograms.length} assessment(s)`);
    
    for (const prog of userPrograms) {
      console.log(`   - ${prog.id.slice(0, 8)}...`);
      console.log(`     Status: ${prog.status}`);
      if (prog.results) {
        console.log(`     Score: ${prog.results.overallScore}%`);
      }
    }
    
    // 8. Performance demonstration
    console.log('\n8️⃣ Performance Test - Loading program with details...');
    const start = Date.now();
    const details = await storage.getProgramWithDetails(program.id);
    const elapsed = Date.now() - start;
    
    console.log(`✅ Loaded in ${elapsed}ms (with caching)`);
    console.log(`   Program: ${details.program?.id.slice(0, 8)}...`);
    console.log(`   Scenario: ${details.scenario?.title.en}`);
    console.log(`   Tasks: ${details.tasks.length}`);
    console.log(`   Evaluations: ${details.evaluations.length}`);
    
    // Test cache
    const start2 = Date.now();
    await storage.getScenario(scenario.id);
    const elapsed2 = Date.now() - start2;
    console.log(`   Cache hit: ${elapsed2}ms (should be faster)`);
    
    console.log('\n✨ Assessment V2 Storage Integration Test Complete!');
  });
});