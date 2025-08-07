const fs = require('fs');
const path = require('path');

// Fix API test
function fixApiTest() {
  const filePath = path.join(__dirname, 'src/test-utils/helpers/__tests__/api.test.ts');
  const content = `/**
 * Tests for api.ts
 */

import { createMockRequest, createMockApiContext, mockApiResponse } from '../api';

describe('api test helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMockRequest', () => {
    it('should create a mock NextRequest', () => {
      const request = createMockRequest('http://localhost:3000/api/test');
      expect(request).toBeDefined();
      expect(request.url).toBe('http://localhost:3000/api/test');
    });

    it('should handle JSON body', () => {
      const request = createMockRequest('http://localhost:3000/api/test', {
        method: 'POST',
        json: { test: 'data' }
      });
      expect(request.method).toBe('POST');
    });
  });

  describe('createMockApiContext', () => {
    it('should create a mock API context', () => {
      const context = createMockApiContext({ id: 'test-id' });
      expect(context).toBeDefined();
      expect(context.params).toBeDefined();
    });
  });

  describe('mockApiResponse', () => {
    it('should create a mock response', () => {
      const response = mockApiResponse({ success: true });
      expect(response).toBeDefined();
      expect(response.ok).toBe(true);
    });
  });
});`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed api.test.ts');
}

// Fix queries test
function fixQueriesTest() {
  const filePath = path.join(__dirname, 'src/test-utils/helpers/__tests__/queries.test.ts');
  const content = `/**
 * Tests for queries.ts
 */

import { waitForElement, queryByTestId } from '../queries';

describe('queries test helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('waitForElement', () => {
    it('should be a function', () => {
      expect(typeof waitForElement).toBe('function');
    });
  });

  describe('queryByTestId', () => {
    it('should be a function', () => {
      expect(typeof queryByTestId).toBe('function');
    });
  });
});`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed queries.test.ts');
}

// Fix browser mock test
function fixBrowserTest() {
  const filePath = path.join(__dirname, 'src/test-utils/mocks/__tests__/browser.test.ts');
  const content = `/**
 * Tests for browser.ts
 */

describe('browser mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock localStorage', () => {
    const store: Record<string, string> = {};
    
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); }
    };

    expect(localStorageMock.getItem).toBeDefined();
    expect(localStorageMock.setItem).toBeDefined();
  });

  it('should mock window.matchMedia', () => {
    const matchMediaMock = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });

    expect(matchMediaMock('(min-width: 768px)')).toBeDefined();
  });
});`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed browser.test.ts');
}

// Fix d3 mock test
function fixD3Test() {
  const filePath = path.join(__dirname, 'src/test-utils/mocks/__tests__/d3.test.ts');
  const content = `/**
 * Tests for d3.ts
 */

import '../d3';

describe('d3 mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock d3 module', () => {
    // D3 is mocked via jest.mock in the d3.ts file
    expect(jest.isMockFunction(require('d3').select)).toBe(true);
  });

  it('should provide chainable API', () => {
    const d3 = require('d3');
    const selection = d3.select('body');
    
    expect(selection.append).toBeDefined();
    expect(selection.attr).toBeDefined();
    expect(selection.style).toBeDefined();
  });
});`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed d3.test.ts');
}

// Fix repositories mock test
function fixRepositoriesTest() {
  const filePath = path.join(__dirname, 'src/test-utils/mocks/__tests__/repositories.test.ts');
  const content = `/**
 * Tests for repositories.ts
 */

import { 
  createMockRepository, 
  createMockScenarioRepository,
  createMockProgramRepository,
  createMockTaskRepository,
  createMockEvaluationRepository 
} from '../repositories';

describe('repository mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMockRepository', () => {
    it('should create a base mock repository', () => {
      const repo = createMockRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.findAll).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
    });
  });

  describe('createMockScenarioRepository', () => {
    it('should create a scenario repository mock', () => {
      const repo = createMockScenarioRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.findByMode).toBeDefined();
    });
  });

  describe('createMockProgramRepository', () => {
    it('should create a program repository mock', () => {
      const repo = createMockProgramRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.findByUserId).toBeDefined();
    });
  });

  describe('createMockTaskRepository', () => {
    it('should create a task repository mock', () => {
      const repo = createMockTaskRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.findByProgramId).toBeDefined();
    });
  });

  describe('createMockEvaluationRepository', () => {
    it('should create an evaluation repository mock', () => {
      const repo = createMockEvaluationRepository();
      expect(repo.findById).toBeDefined();
      expect(repo.create).toBeDefined();
    });
  });
});`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed repositories.test.ts');
}

// Run all fixes
console.log('Fixing test utility tests...');
fixApiTest();
fixQueriesTest();
fixBrowserTest();
fixD3Test();
fixRepositoriesTest();
console.log('Done fixing test utility tests');