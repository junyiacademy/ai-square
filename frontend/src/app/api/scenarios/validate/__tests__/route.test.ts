/**
 * Integration tests for /api/scenarios/validate
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import type { ValidateScenarioRequest } from '@/types/prompt-to-course';

describe('POST /api/scenarios/validate', () => {
  const validYAML = `
id: 550e8400-e29b-41d4-a716-446655440000
mode: pbl
status: draft
version: "1.0.0"
sourceType: ai_generated
sourceMetadata: {}
title:
  en: "Test Scenario"
  zhTW: "測試情境"
description:
  en: "Test Description"
  zhTW: "測試描述"
objectives:
  en:
    - "Objective 1"
  zhTW:
    - "目標 1"
difficulty: beginner
estimatedMinutes: 60
prerequisites: []
taskTemplates:
  - id: "task-1"
    title:
      en: "Task 1"
      zhTW: "任務 1"
    type: analysis
pblData:
  scenario:
    context:
      en: "Context"
    challenge:
      en: "Challenge"
  stages: []
discoveryData: {}
assessmentData: {}
xpRewards: {}
unlockRequirements: {}
aiModules: {}
resources: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
metadata: {}
`;

  const createMockRequest = (body: ValidateScenarioRequest) => {
    return new NextRequest('http://localhost:3000/api/scenarios/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('should return 400 if YAML is missing', async () => {
    const request = createMockRequest({ yaml: '', mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Missing YAML content');
  });

  it('should return validation errors for invalid YAML syntax', async () => {
    const invalidYAML = 'invalid: yaml: syntax:';

    const request = createMockRequest({ yaml: invalidYAML, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
    expect(data.errors[0].message).toContain('YAML parsing error');
  });

  it('should validate correct YAML', async () => {
    const request = createMockRequest({ yaml: validYAML, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.errors.length).toBe(0);
  });

  it('should return schema validation errors', async () => {
    const invalidYAML = `
id: not-a-uuid
mode: pbl
status: draft
version: "1.0.0"
sourceType: ai_generated
title:
  en: "Test"
description:
  en: "Test"
objectives:
  en: []
difficulty: invalid_difficulty
estimatedMinutes: 0
prerequisites: []
taskTemplates: []
pblData: {}
discoveryData: {}
assessmentData: {}
xpRewards: {}
unlockRequirements: {}
aiModules: {}
resources: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
metadata: {}
sourceMetadata: {}
`;

    const request = createMockRequest({ yaml: invalidYAML, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it('should warn about mode mismatch', async () => {
    const request = createMockRequest({ yaml: validYAML, mode: 'discovery' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.warnings.some((w: { message: string }) =>
      w.message.includes('Mode mismatch')
    )).toBe(true);
  });

  it('should warn about multilingual completeness', async () => {
    const yamlWithoutMultilingual = `
id: 550e8400-e29b-41d4-a716-446655440000
mode: pbl
status: draft
version: "1.0.0"
sourceType: ai_generated
sourceMetadata: {}
title:
  en: "Test Only"
description:
  en: "Test Only"
objectives:
  en: ["Objective"]
difficulty: beginner
estimatedMinutes: 60
prerequisites: []
taskTemplates: []
pblData:
  scenario:
    context:
      en: "Context"
    challenge:
      en: "Challenge"
  stages: []
discoveryData: {}
assessmentData: {}
xpRewards: {}
unlockRequirements: {}
aiModules: {}
resources: []
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
metadata: {}
`;

    const request = createMockRequest({ yaml: yamlWithoutMultilingual, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.warnings.some((w: { message: string }) =>
      w.message.includes('at least 2 languages')
    )).toBe(true);
  });

  it('should warn about very short estimated time', async () => {
    const yamlWithShortTime = validYAML.replace('estimatedMinutes: 60', 'estimatedMinutes: 5');

    const request = createMockRequest({ yaml: yamlWithShortTime, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.warnings.some((w: { message: string }) =>
      w.message.includes('very short')
    )).toBe(true);
  });

  it('should validate mode-specific data', async () => {
    const yamlWithoutPBLData = validYAML.replace('pblData:\n  scenario:', 'pblData: {}');

    const request = createMockRequest({ yaml: yamlWithoutPBLData, mode: 'pbl' });
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.errors.some((e: { message: string }) =>
      e.message.includes('pblData')
    )).toBe(true);
  });
});
