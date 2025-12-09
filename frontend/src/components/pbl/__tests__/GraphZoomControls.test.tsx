/**
 * Tests for GraphZoomControls component
 * TDD Phase 1.4.3: Extract zoom control buttons
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphZoomControls from '../GraphZoomControls';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'zoomIn': 'Zoom In',
        'zoomOut': 'Zoom Out',
        'resetZoom': 'Reset Zoom'
      };
      return translations[key] || key;
    }
  })
}));

describe('GraphZoomControls', () => {
  const mockOnZoomIn = jest.fn();
  const mockOnZoomOut = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all three zoom control buttons', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('should render zoom in button with correct label', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const zoomInBtn = screen.getByLabelText('Zoom In');
    expect(zoomInBtn).toBeInTheDocument();
  });

  it('should render zoom out button with correct label', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const zoomOutBtn = screen.getByLabelText('Zoom Out');
    expect(zoomOutBtn).toBeInTheDocument();
  });

  it('should render reset button with correct label', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const resetBtn = screen.getByLabelText('Reset Zoom');
    expect(resetBtn).toBeInTheDocument();
  });

  it('should call onZoomIn when zoom in button is clicked', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const zoomInBtn = screen.getByLabelText('Zoom In');
    fireEvent.click(zoomInBtn);

    expect(mockOnZoomIn).toHaveBeenCalledTimes(1);
  });

  it('should call onZoomOut when zoom out button is clicked', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const zoomOutBtn = screen.getByLabelText('Zoom Out');
    fireEvent.click(zoomOutBtn);

    expect(mockOnZoomOut).toHaveBeenCalledTimes(1);
  });

  it('should call onReset when reset button is clicked', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const resetBtn = screen.getByLabelText('Reset Zoom');
    fireEvent.click(resetBtn);

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('should have correct CSS classes for styling', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('p-1');
      expect(button).toHaveClass('rounded');
    });
  });

  it('should render buttons in correct order (zoom in, zoom out, reset)', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-label', 'Zoom In');
    expect(buttons[1]).toHaveAttribute('aria-label', 'Zoom Out');
    expect(buttons[2]).toHaveAttribute('aria-label', 'Reset Zoom');
  });

  it('should have accessible button labels', () => {
    render(
      <GraphZoomControls
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset Zoom')).toBeInTheDocument();
  });
});
