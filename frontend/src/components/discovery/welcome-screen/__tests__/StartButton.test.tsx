import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StartButton from '../StartButton';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, whileHover, whileTap, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>{children}</button>
    ),
    div: ({ children, animate, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

// Mock Lucide React
jest.mock('lucide-react', () => ({
  Rocket: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="rocket-icon"><path /></svg>
  ),
}));

describe('StartButton', () => {
  const mockOnClick = jest.fn();
  const mockLabel = 'Start Your Journey';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should display the provided label', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    expect(screen.getByText(mockLabel)).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should render rocket icon', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    expect(screen.getByTestId('rocket-icon')).toBeInTheDocument();
  });

  it('should have proper button classes', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('group', 'relative', 'inline-flex');
  });

  it('should be enabled by default', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
  });

  it('should handle multiple clicks', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });

  it('should render with gradient background', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-gradient-to-r');
  });

  it('should have shadow effect', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('shadow-2xl');
  });

  it('should handle empty label gracefully', () => {
    render(<StartButton onClick={mockOnClick} label="" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle mouse events', () => {
    render(<StartButton onClick={mockOnClick} label={mockLabel} />);
    const button = screen.getByRole('button');

    fireEvent.mouseOver(button);
    expect(button).toBeInTheDocument();

    fireEvent.mouseLeave(button);
    expect(button).toBeInTheDocument();
  });
});
