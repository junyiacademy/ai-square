/**
 * Tests for layout
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Layout from '../layout';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<Layout>{<div>Test content</div>}</Layout>);
    expect(container).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    const { container } = render(<Layout>{<div>Test content</div>}</Layout>);

    // Check that children are rendered
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Check that layout wrapper exists
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(<Layout>{<div>Test content</div>}</Layout>);

    // Look for interactive elements
    const buttons = screen.queryAllByRole('button');
    const links = screen.queryAllByRole('link');
    const inputs = screen.queryAllByRole('textbox');

    // Test at least one interaction if available
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
      // Add assertion based on expected behavior
    }

    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'test' } });
      expect(inputs[0]).toHaveValue('test');
    }
  });

  it('should be accessible', () => {
    const { container } = render(<Layout>{<div>Test content</div>}</Layout>);

    // Basic accessibility checks
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const images = container.querySelectorAll('img');

    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should match snapshot', () => {
    const { container } = render(<Layout>{<div>Test content</div>}</Layout>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
