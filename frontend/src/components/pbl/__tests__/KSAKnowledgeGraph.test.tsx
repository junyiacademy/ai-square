/**
 * Tests for KSAKnowledgeGraph
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KSAKnowledgeGraph from '../KSAKnowledgeGraph';


const mockProps = {
  ksaScores: {
    K1: { score: 0.8, category: 'knowledge' as const },
    K2: { score: 0.6, category: 'knowledge' as const },
    S1: { score: 0.7, category: 'skills' as const },
    S2: { score: 0.9, category: 'skills' as const },
    A1: { score: 0.5, category: 'attitudes' as const },
    A2: { score: 0.8, category: 'attitudes' as const }
  },
  title: 'Test KSA Graph'
};

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

describe('KSAKnowledgeGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<KSAKnowledgeGraph {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    render(<KSAKnowledgeGraph {...mockProps} />);
    
    // Check for basic elements - adjust based on component
    const element = screen.getByRole('main', { hidden: true }) || 
                   screen.getByRole('article', { hidden: true }) ||
                   screen.getByRole('section', { hidden: true }) ||
                   document.querySelector('div');
    expect(element).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(<KSAKnowledgeGraph {...mockProps} />);
    
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
    const { container } = render(<KSAKnowledgeGraph {...mockProps} />);
    
    // Basic accessibility checks
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const images = container.querySelectorAll('img');
    
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should match snapshot', () => {
    const { container } = render(<KSAKnowledgeGraph {...mockProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});