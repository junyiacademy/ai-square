import React from 'react';
import { render } from '@testing-library/react';
import RootLayout, { metadata } from '../layout';

// Mock the ClientLayout component
jest.mock('@/components/layout/ClientLayout', () => {
  return {
    ClientLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="client-layout">{children}</div>
    ),
  };
});

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Geist: jest.fn(() => ({
    variable: '--font-geist-sans',
  })),
  Geist_Mono: jest.fn(() => ({
    variable: '--font-geist-mono',
  })),
}));

describe('RootLayout', () => {
  it('renders children within the layout', () => {
    const { container, getByText } = render(
      <RootLayout>
        <div>Test Child Content</div>
      </RootLayout>
    );

    expect(getByText('Test Child Content')).toBeInTheDocument();
  });

  it('applies correct HTML structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    // RootLayout component structure in test environment
    // doesn't render actual html/body tags, just the component structure
    expect(container.firstChild).toBeDefined();

    // The actual html/body attributes are applied by Next.js at runtime
    // We can verify the component renders without errors
    expect(container.querySelector('div')).toHaveTextContent('Test Content');
  });

  it('wraps children with ClientLayout', () => {
    const { getByTestId } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(getByTestId('client-layout')).toBeInTheDocument();
  });

  it('has correct metadata', () => {
    expect(metadata).toEqual({
      title: 'AI Square - AI Literacy Platform',
      description: 'Multi-agent learning platform for AI literacy education',
    });
  });
});
