/**
 * Custom render function with all providers
 */

import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/__mocks__/i18n';
import { mockSession } from '../mocks/next-auth';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any;
  locale?: string;
}

function AllTheProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <SessionProvider session={session || mockSession}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </SessionProvider>
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