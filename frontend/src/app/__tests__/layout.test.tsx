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

    const html = container.querySelector('html');
    const body = container.querySelector('body');

    expect(html).toHaveAttribute('lang', 'en');
    expect(body).toHaveClass('antialiased');
    expect(body?.className).toContain('--font-geist-sans');
    expect(body?.className).toContain('--font-geist-mono');
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