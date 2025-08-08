import React from 'react';
import { render } from '@testing-library/react';
import RootLayout from './layout';
import { Metadata } from 'next';

// Mock Next.js font
jest.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
  }),
}));

// Mock ClientLayout
jest.mock('@/components/layout/ClientLayout', () => ({
  ClientLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-layout">{children}</div>
  )
}));

describe('RootLayout', () => {
  it('should render children with ClientLayout', () => {
    const { getByText, getByTestId } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );
    
    expect(getByText('Test Content')).toBeInTheDocument();
    expect(getByTestId('client-layout')).toBeInTheDocument();
  });

  it('should have correct html and body structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    // RootLayout renders html and body elements
    // In test environment, they are part of the component tree
    const body = container.querySelector('body');
    expect(body).toBeInTheDocument();
  });

  it('should wrap content in ClientLayout', () => {
    const { container, getByTestId } = render(
      <RootLayout>
        <div id="test-child">Child</div>
      </RootLayout>
    );
    
    const clientLayout = getByTestId('client-layout');
    const child = container.querySelector('#test-child');
    expect(clientLayout).toBeInTheDocument();
    expect(child).toBeInTheDocument();
  });

  it('should apply font classes to body', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    const body = container.querySelector('body');
    expect(body?.className).toContain('--font-geist-sans');
    expect(body?.className).toContain('--font-geist-mono');
    expect(body?.className).toContain('antialiased');
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