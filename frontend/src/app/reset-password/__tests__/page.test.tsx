/**
 * Tests for page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '../page';

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

describe('page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    render(<Page />);
    
    // Check for the page heading
    expect(screen.getByRole('heading', { name: /resetPassword\.title/i })).toBeInTheDocument();
    
    // Check for the error message
    expect(screen.getByText(/resetPassword\.noToken/i)).toBeInTheDocument();
    
    // Check for the link to request new link
    expect(screen.getByRole('link', { name: /resetPassword\.requestNewLink/i })).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(<Page />);
    
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
    const { container } = render(<Page />);
    
    // Basic accessibility checks
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const images = container.querySelectorAll('img');
    
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should match snapshot', () => {
    const { container } = render(<Page />);
    expect(container.firstChild).toMatchSnapshot();
  });
});