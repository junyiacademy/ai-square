/**
 * Enhanced render function with all necessary providers
 * Follows @CLAUDE.md TDD principles
 */

import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock providers
const MockSessionProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const MockI18nextProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: unknown;
  locale?: string;
  initialEntries?: string[];
  authState?: {
    user?: unknown;
    loading?: boolean;
    error?: string | null;
  };
}

interface AllProvidersProps {
  children: React.ReactNode;
  session?: unknown;
  locale?: string;
  authState?: {
    user?: unknown;
    loading?: boolean;
    error?: string | null;
  };
}

function AllProviders({ children }: AllProvidersProps) {
  // Mock context values are handled by jest mocks in jest.setup.ts
  // No need to use them here as the mocked providers don't use props

  // Mock i18n (prepared for future use)
  // const mockI18n = {
  //   language: locale,
  //   changeLanguage: jest.fn().mockResolvedValue(undefined),
  //   t: (key: string) => key,
  //   exists: jest.fn().mockReturnValue(true),
  //   getFixedT: jest.fn(),
  //   init: jest.fn(),
  //   use: jest.fn().mockReturnThis(),
  // };

  return (
    <MockAuthProvider>
      <MockSessionProvider>
        <MockI18nextProvider>
          {children}
        </MockI18nextProvider>
      </MockSessionProvider>
    </MockAuthProvider>
  );
}

/**
 * Custom render function that includes all providers
 * @param ui - React element to render
 * @param options - Render options
 * @returns Render result with user event
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    session,
    locale = 'en',
    authState,
    ...renderOptions
  } = options;

  const user = userEvent.setup();

  const renderResult = rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllProviders session={session} locale={locale} authState={authState}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });

  return {
    user,
    ...renderResult,
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { userEvent };