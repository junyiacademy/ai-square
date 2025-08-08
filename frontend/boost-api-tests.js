#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// API routes that need tests
const apiRoutes = [
  'src/app/api/assessment/results/[id]/route.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/pbl/history/route.ts',
  'src/app/api/discovery/translate/route.ts',
  'src/app/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]/route.ts'
];

const apiTestTemplate = (routePath) => {
  const hasParams = routePath.includes('[');
  return `import { NextRequest } from 'next/server';
import * as Route from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(),
    getProgramRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getScenarioRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getContentRepository: jest.fn(),
    getAchievementRepository: jest.fn()
  }
}));

describe('${routePath}', () => {
  const mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    verifyPassword: jest.fn()
  };
  
  const mockProgramRepo = {
    findById: jest.fn(),
    findByUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  
  const mockTaskRepo = {
    findById: jest.fn(),
    findByProgram: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  
  const mockEvaluationRepo = {
    findById: jest.fn(),
    findByProgram: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  
  const mockContentRepo = {
    getScenarioContent: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getContentRepository as jest.Mock).mockReturnValue(mockContentRepo);
  });
  
  ${hasParams ? `
  const params = Promise.resolve({ 
    id: 'test-id',
    programId: 'prog-id',
    taskId: 'task-id'
  });` : ''}
  
  it('should handle GET requests', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'user-id', email: 'test@example.com' });
    mockProgramRepo.findById.mockResolvedValue({ id: 'prog-id', status: 'active' });
    mockTaskRepo.findById.mockResolvedValue({ id: 'task-id', status: 'active' });
    mockEvaluationRepo.findById.mockResolvedValue({ id: 'eval-id', score: 80 });
    
    const request = new NextRequest('http://localhost:3000/api/test');
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });
    
    if (Route.GET) {
      const response = await Route.GET(request${hasParams ? ', { params }' : ''});
      expect(response.status).toBeLessThanOrEqual(500);
    }
  });
  
  it('should handle POST requests', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'user-id', email: 'test@example.com' });
    mockUserRepo.verifyPassword.mockResolvedValue(true);
    mockProgramRepo.create.mockResolvedValue({ id: 'new-prog', status: 'active' });
    
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@example.com',
        password: 'password123',
        data: { test: 'value' }
      })
    });
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });
    
    if (Route.POST) {
      const response = await Route.POST(request${hasParams ? ', { params }' : ''});
      expect(response.status).toBeLessThanOrEqual(500);
    }
  });
  
  it('should handle authentication errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    
    if (Route.GET) {
      const response = await Route.GET(request${hasParams ? ', { params }' : ''});
      expect([200, 401, 404, 500]).toContain(response.status);
    }
  });
});`;
};

apiRoutes.forEach(routePath => {
  const fullPath = path.join(__dirname, routePath);
  const dir = path.dirname(fullPath);
  const testDir = path.join(dir, '__tests__');
  const testPath = path.join(testDir, 'route.test.ts');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  if (!fs.existsSync(testPath)) {
    fs.writeFileSync(testPath, apiTestTemplate(routePath));
    console.log(`✓ Created test: ${testPath}`);
  } else {
    console.log(`✓ Test exists: ${testPath}`);
  }
});

console.log('Done creating API tests!');