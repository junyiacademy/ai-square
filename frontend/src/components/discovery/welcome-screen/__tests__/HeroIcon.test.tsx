import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroIcon from '../HeroIcon';
import '@testing-library/jest-dom';

// Mock framer-motion
let containerCount = 0;
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, transition, onHoverStart, onHoverEnd, className, style, ...props }: any) => {
      const isOuterContainer = className?.includes('inline-flex');
      return (
        <div
          className={className}
          style={style}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          data-testid={isOuterContainer ? "hero-icon-outer" : undefined}
          {...props}
        >
          {children}
        </div>
      );
    },
  },
}));

// Mock Lucide React
jest.mock('lucide-react', () => ({
  Sparkles: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sparkles-icon"><path /></svg>
  ),
}));

describe('HeroIcon', () => {
  it('should render without crashing', () => {
    render(<HeroIcon />);
    expect(screen.getByTestId('hero-icon-outer')).toBeInTheDocument();
  });

  it('should render Sparkles icon', () => {
    render(<HeroIcon />);
    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
  });

  it('should have gradient background', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('[class*="bg-gradient-to-r"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should have rounded corners', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('.rounded-3xl');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should have shadow effect', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('[class*="shadow-"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should handle hover start', () => {
    render(<HeroIcon />);
    const container = screen.getByTestId('hero-icon-outer');

    fireEvent.mouseEnter(container);
    expect(container).toBeInTheDocument();
  });

  it('should handle hover end', () => {
    render(<HeroIcon />);
    const container = screen.getByTestId('hero-icon-outer');

    fireEvent.mouseEnter(container);
    fireEvent.mouseLeave(container);
    expect(container).toBeInTheDocument();
  });

  it('should have correct dimensions', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('.w-24');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('h-24');
  });

  it('should have preserve-3d transform style', () => {
    render(<HeroIcon />);
    const container = screen.getByTestId('hero-icon-outer');
    expect(container).toHaveStyle({ transformStyle: 'preserve-3d' });
  });

  it('should be inline-flex container', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('.inline-flex');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should center items', () => {
    const { container } = render(<HeroIcon />);
    const iconContainer = container.querySelector('.items-center');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass('justify-center');
  });
});
