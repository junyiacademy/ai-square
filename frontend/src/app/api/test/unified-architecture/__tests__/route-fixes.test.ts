/**
 * Simple test to validate the fixes made to the unified architecture test API
 * This test checks for TypeScript types and correct field names
 */

import { readFileSync } from 'fs';
import path from 'path';

describe('Unified Architecture Test API - Code Quality', () => {
  let routeContent: string;

  beforeAll(() => {
    // Read the route file content
    const routePath = path.join(__dirname, '../route.ts');
    routeContent = readFileSync(routePath, 'utf-8');
  });

  describe('TypeScript Type Safety', () => {
    it('should not use any types', () => {
      // Check for 'any' types (excluding comments)
      const lines = routeContent.split('\n');
      const anyTypeLines = lines.filter((line, index) => {
        // Skip comment lines
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return false;
        }
        // Look for ': any' patterns
        return line.includes(': any');
      });

      expect(anyTypeLines).toHaveLength(0);
    });

    it('should import proper TypeScript interfaces', () => {
      expect(routeContent).toContain('import type {');
      expect(routeContent).toContain('IScenario');
      expect(routeContent).toContain('IProgram');
      expect(routeContent).toContain('ITask');
      expect(routeContent).toContain('IEvaluation');
    });

    it('should use proper types for data arrays', () => {
      expect(routeContent).toContain('scenarios: [] as IScenario[]');
      expect(routeContent).toContain('programs: [] as IProgram[]');
      expect(routeContent).toContain('tasks: [] as ITask[]');
      expect(routeContent).toContain('evaluations: [] as IEvaluation[]');
    });

    it('should use proper types for test results', () => {
      expect(routeContent).toContain('scenario: null as IScenario | null');
      expect(routeContent).toContain('program: null as IProgram | null');
      expect(routeContent).toContain('task: null as ITask | null');
      expect(routeContent).toContain('evaluation: null as IEvaluation | null');
    });
  });

  describe('Unified Architecture Compliance', () => {
    it('should use entityType and entityId for evaluations', () => {
      // Check that we're using the correct field names
      expect(routeContent).toContain("entityType: 'task'");
      expect(routeContent).toContain('entityId: task.id');
      
      // Ensure old field names are not used
      expect(routeContent).not.toContain('targetType:');
      expect(routeContent).not.toContain('targetId:');
    });

    it('should have proper evaluation structure', () => {
      // Check for required evaluation fields
      expect(routeContent).toContain('programId: program.id');
      expect(routeContent).toContain("userId: 'test-user@example.com'");
      expect(routeContent).toContain("type: 'api_test'");
    });

    it('should have consistent metadata', () => {
      // Program metadata should match scenario sourceType
      const programMetadataMatch = routeContent.match(/metadata:\s*{\s*sourceType:\s*['"](\w+)['"]/);
      expect(programMetadataMatch).toBeTruthy();
      expect(programMetadataMatch?.[1]).toBe('pbl');
    });
  });

  describe('Input Validation', () => {
    it('should validate action parameter', () => {
      expect(routeContent).toContain("const validActions = ['create-test', 'cleanup']");
      expect(routeContent).toContain('if (!validActions.includes(action))');
      expect(routeContent).toContain('Invalid action. Must be one of:');
    });

    it('should handle malformed JSON gracefully', () => {
      expect(routeContent).toContain('.json().catch(() => ({}))');
    });
  });

  describe('Task Creation Compliance', () => {
    it('should use proper ITask fields', () => {
      // Check for required task fields
      expect(routeContent).toContain('templateId:');
      expect(routeContent).toContain('description:');
      expect(routeContent).toContain('order:');
      expect(routeContent).toContain("status: 'pending'");
      
      // Ensure invalid fields are not used
      expect(routeContent).not.toContain('scenarioTaskIndex:');
    });
  });
});