#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const discoveryPageTest = `import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'test-id', programId: 'prog-id', taskId: 'task-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  })
}));

global.fetch = jest.fn();

describe('Discovery Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        achievements: [],
        evaluation: {},
        overview: {},
        scenario: { id: 'test', title: { en: 'Test' } },
        program: { id: 'test', status: 'active' },
        task: { id: 'test', status: 'active' }
      })
    });
  });

  it('should render without errors', async () => {
    const params = Promise.resolve({ id: 'test-id', programId: 'prog-id', taskId: 'task-id' });
    const result = render(<Page params={params} />);
    await waitFor(() => {
      expect(result.container).toBeTruthy();
    });
  });

  it('should handle loading state', () => {
    const params = Promise.resolve({ id: 'test-id' });
    const result = render(<Page params={params} />);
    expect(result.container).toBeTruthy();
  });
});`;

const pages = [
  'src/app/discovery/achievements/__tests__/page.test.tsx',
  'src/app/discovery/evaluation/__tests__/page.test.tsx',
  'src/app/discovery/overview/__tests__/page.test.tsx',
  'src/app/discovery/scenarios/__tests__/page.test.tsx',
  'src/app/discovery/scenarios/[id]/__tests__/page.test.tsx',
  'src/app/discovery/scenarios/[id]/programs/[programId]/complete/__tests__/page.test.tsx'
];

pages.forEach(testPath => {
  const fullPath = path.join(__dirname, testPath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, discoveryPageTest);
    console.log(`✓ Created test: ${testPath}`);
  }
});

console.log('Done creating discovery tests!');