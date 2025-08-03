/**
 * Custom Render Helper
 * 包含所有必要 Provider 的 render 函數
 */

import React from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import userEvent from '@testing-library/user-event';
import { mockSession, Session } from '../mocks/next-auth';

// Mock SessionProvider component from our mock
const SessionProvider: React.FC<{ children: React.ReactNode; session?: Session | null }> = ({ children }) => {
  return children;
};
SessionProvider.displayName = 'MockSessionProvider';

// Mock i18n instance
const mockI18n = {
  language: 'en',
  languages: ['en', 'zh', 'es'],
  changeLanguage: jest.fn(),
  getFixedT: jest.fn(),
  t: jest.fn((key: string) => key),
  exists: jest.fn(),
  getDataByLanguage: jest.fn(),
  getResource: jest.fn(),
  hasResourceBundle: jest.fn(),
  use: jest.fn(),
  init: jest.fn(),
  loadNamespaces: jest.fn(),
  loadLanguages: jest.fn(),
  reloadResources: jest.fn(),
  setDefaultNamespace: jest.fn(),
  dir: jest.fn(),
  format: jest.fn(),
  isInitialized: true,
  resolvedLanguage: 'en',
  options: {},
  services: {},
  store: {},
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  locale?: string;
  initialRoute?: string;
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

// 創建所有 Provider 的 wrapper
const createWrapper = (options: CustomRenderOptions = {}) => {
  const { session = mockSession } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={session}>
      <I18nextProvider i18n={mockI18n as unknown as import('i18next').i18n}>
        {children}
      </I18nextProvider>
    </SessionProvider>
  );
  Wrapper.displayName = 'TestProviderWrapper';
  return Wrapper;
};

/**
 * Custom render function that includes all necessary providers
 * @param ui - React element to render
 * @param options - Render options including session and locale
 * @returns Render result with user event setup
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult => {
  const user = userEvent.setup();
  
  const rendered = rtlRender(ui, {
    wrapper: createWrapper(options),
    ...options,
  });

  return {
    user,
    ...rendered,
  };
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { userEvent };

// Export custom render as default and named
export default renderWithProviders;