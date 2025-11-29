/**
 * Tests for PBLEvaluationPromptBuilder
 * Handles building evaluation prompts for PBL tasks
 */

import { PBLEvaluationPromptBuilder } from '../pbl-evaluation-prompt-builder.service';
import { Conversation } from '@/types/pbl-evaluate';

describe('PBLEvaluationPromptBuilder', () => {
  let builder: PBLEvaluationPromptBuilder;

  beforeEach(() => {
    builder = new PBLEvaluationPromptBuilder();
  });

  describe('buildPrompt', () => {
    it('should build basic evaluation prompt in English', () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test description',
          instructions: ['Step 1', 'Step 2'],
          expectedOutcome: 'Expected result'
        },
        conversations: [
          { type: 'user', content: 'Hello, I want to learn about AI' },
          { type: 'assistant', content: 'Sure, I can help you' },
          { type: 'user', content: 'What is machine learning?' }
        ] as Conversation[],
        targetDomains: ['engaging_with_ai'],
        focusKSA: ['K1.1'],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      expect(prompt).toContain('Test Task');
      expect(prompt).toContain('Test description');
      expect(prompt).toContain('Expected result');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Hello, I want to learn about AI');
      expect(prompt).toContain('What is machine learning?');
      expect(prompt).not.toContain('Sure, I can help you'); // AI message should not be included
    });

    it('should build evaluation prompt in Traditional Chinese', () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test description',
          instructions: [],
          expectedOutcome: 'Expected result'
        },
        conversations: [
          { type: 'user', content: '你好' }
        ] as Conversation[],
        targetDomains: [],
        focusKSA: [],
        language: 'zhTW'
      };

      const prompt = builder.buildPrompt(params);

      expect(prompt).toContain('繁體中文');
      expect(prompt).toContain('code: zhTW');
      expect(prompt).toContain('DO NOT use English');
    });

    it('should include target domains scoring instructions', () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [{ type: 'user', content: 'test' }] as Conversation[],
        targetDomains: ['engaging_with_ai', 'creating_with_ai'],
        focusKSA: [],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      expect(prompt).toContain('ONLY evaluate the following domains');
      expect(prompt).toContain('engaging_with_ai');
      expect(prompt).toContain('creating_with_ai');
      expect(prompt).toContain('For domains NOT in the target list: You MUST return -1');
    });

    it('should limit user messages to last 10', () => {
      const conversations: Conversation[] = [];
      for (let i = 0; i < 20; i++) {
        conversations.push({ type: 'user', content: `Message ${i}` });
        conversations.push({ type: 'assistant', content: 'Response' });
      }

      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations,
        targetDomains: [],
        focusKSA: [],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      // Should only include messages 10-19
      expect(prompt).toContain('Message 19');
      expect(prompt).toContain('Message 10');
      expect(prompt).not.toContain('Message 9');
      expect(prompt).not.toContain('Message 0');
    });

    it('should truncate long messages to 200 characters', () => {
      const longMessage = 'A'.repeat(300);
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [
          { type: 'user', content: longMessage }
        ] as Conversation[],
        targetDomains: [],
        focusKSA: [],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      // Should truncate to 200 chars
      const truncatedMessage = 'A'.repeat(200);
      expect(prompt).toContain(truncatedMessage);
      expect(prompt).not.toContain('A'.repeat(300));
    });

    it('should include focus KSA in prompt', () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [{ type: 'user', content: 'test' }] as Conversation[],
        targetDomains: [],
        focusKSA: ['K1.1', 'S2.3', 'A1.1'],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      expect(prompt).toContain('Focus KSA: K1.1, S2.3, A1.1');
    });

    it('should handle missing optional fields gracefully', () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test'
        },
        conversations: [{ type: 'user', content: 'test' }] as Conversation[],
        language: 'en'
      };

      const prompt = builder.buildPrompt(params);

      expect(prompt).toContain('Test Task');
      expect(prompt).toContain('All domains');
      expect(prompt).toContain('All KSA');
    });
  });

  describe('getLanguageName', () => {
    it('should return correct language names', () => {
      expect(builder.getLanguageName('en')).toBe('English');
      expect(builder.getLanguageName('zhTW')).toBe('繁體中文');
      expect(builder.getLanguageName('zhCN')).toBe('简体中文');
    });

    it('should default to English for unknown language codes', () => {
      expect(builder.getLanguageName('unknown')).toBe('English');
    });
  });
});
