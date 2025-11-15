/**
 * Custom render function with all providers
 */

import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
// import { SessionProvider } from 'next-auth/react';
// Mock SessionProvider since next-auth isn't available
const SessionProvider = ({ children }: { children: React.ReactNode; session?: any }) => <>{children}</>;
// Mock I18nextProvider since we're using a mock i18n
const I18nextProvider = ({ children }: { children: React.ReactNode; i18n?: any }) => <>{children}</>;
import i18n from '../mocks/i18n';
import { mockSession } from '../mocks/next-auth';
import { MockAuthProvider } from '../mocks/auth-provider';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any;
  locale?: string;
}

function AllTheProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <MockAuthProvider>
      <SessionProvider session={session || mockSession}>
        <I18nextProvider i18n={i18n}>
          {children}
        </I18nextProvider>
      </SessionProvider>
    </MockAuthProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  { session, locale = 'en', ...renderOptions }: CustomRenderOptions = {}
) {
  // Set the locale if needed
  if (locale !== 'en') {
    i18n.changeLanguage(locale);
  }

  return rtlRender(ui, {
    wrapper: ({ children }) => <AllTheProviders session={session}>{children}</AllTheProviders>,
    ...renderOptions,
  });
}

export * from '@testing-library/react';
