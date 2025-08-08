import React from 'react';
import { render } from '@testing-library/react';
import RootLayout from './layout';
import { Metadata } from 'next';

// Mock the providers
jest.mock('@/components/providers/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/components/providers/RTLProvider', () => ({
  RTLProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/components/layout/Header', () => ({
  default: () => <header data-testid="header">Header</header>
}));

jest.mock('@/components/layout/Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}));

describe('RootLayout', () => {
  it('should render children with all providers', () => {
    const { getByText, getByTestId } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );
    
    expect(getByText('Test Content')).toBeInTheDocument();
    expect(getByTestId('header')).toBeInTheDocument();
    expect(getByTestId('footer')).toBeInTheDocument();
  });

  it('should have correct html and body structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    const html = container.querySelector('html');
    const body = container.querySelector('body');
    
    expect(html).toHaveAttribute('lang', 'en');
    expect(body).toBeInTheDocument();
  });

  it('should wrap content in providers', () => {
    const { container } = render(
      <RootLayout>
        <div id="test-child">Child</div>
      </RootLayout>
    );
    
    const child = container.querySelector('#test-child');
    expect(child).toBeInTheDocument();
  });
});

// Test metadata export
describe('RootLayout Metadata', () => {
  it('should export metadata', async () => {
    const layoutModule = await import('./layout');
    const metadata = layoutModule.metadata as Metadata;
    
    expect(metadata).toBeDefined();
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toBeDefined();
  });
});