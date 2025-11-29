import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeatureCard from '../FeatureCard';
import { Rocket } from 'lucide-react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
  },
}));

// Mock Lucide React
jest.mock('lucide-react', () => ({
  Rocket: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon"><path /></svg>
  ),
}));

describe('FeatureCard', () => {
  const mockProps = {
    icon: Rocket,
    title: 'Test Feature',
    description: 'Test description for feature',
    colorGradient: 'from-purple-500 to-pink-500',
    glowColor: 'shadow-purple-500/25'
  };

  it('should render without crashing', () => {
    render(<FeatureCard {...mockProps} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<FeatureCard {...mockProps} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('should display description', () => {
    render(<FeatureCard {...mockProps} />);
    expect(screen.getByText('Test description for feature')).toBeInTheDocument();
  });

  it('should render icon', () => {
    render(<FeatureCard {...mockProps} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should apply correct color gradient classes', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const gradientElements = container.querySelectorAll('[class*="from-purple-500"]');
    expect(gradientElements.length).toBeGreaterThan(0);
  });

  it('should apply glow color class', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const glowElements = container.querySelectorAll('[class*="shadow-purple-500"]');
    expect(glowElements.length).toBeGreaterThan(0);
  });

  it('should have group class for hover effects', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const card = container.querySelector('.group');
    expect(card).toBeInTheDocument();
  });

  it('should handle mouse hover', () => {
    render(<FeatureCard {...mockProps} />);
    const card = screen.getByText('Test Feature').closest('.group');

    if (card) {
      fireEvent.mouseOver(card);
      expect(card).toBeInTheDocument();

      fireEvent.mouseLeave(card);
      expect(card).toBeInTheDocument();
    }
  });

  it('should render with proper card structure', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const card = container.querySelector('.rounded-2xl');
    expect(card).toBeInTheDocument();
  });

  it('should have backdrop blur effect', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const backdropElements = container.querySelectorAll('[class*="backdrop-blur"]');
    expect(backdropElements.length).toBeGreaterThan(0);
  });

  it('should render decorative elements', () => {
    const { container } = render(<FeatureCard {...mockProps} />);
    const decorations = container.querySelectorAll('.rounded-full');
    expect(decorations.length).toBeGreaterThan(0);
  });

  it('should handle long titles gracefully', () => {
    render(<FeatureCard {...mockProps} title="Very Long Feature Title That Spans Multiple Lines" />);
    expect(screen.getByText('Very Long Feature Title That Spans Multiple Lines')).toBeInTheDocument();
  });

  it('should handle long descriptions gracefully', () => {
    const longDescription = 'This is a very long description that should wrap properly and still be displayed correctly in the feature card component without breaking the layout or causing any issues.';
    render(<FeatureCard {...mockProps} description={longDescription} />);
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it('should apply different color gradients', () => {
    const { container } = render(
      <FeatureCard {...mockProps} colorGradient="from-blue-500 to-cyan-500" />
    );
    const gradientElements = container.querySelectorAll('[class*="from-blue-500"]');
    expect(gradientElements.length).toBeGreaterThan(0);
  });

  it('should have proper text hierarchy', () => {
    render(<FeatureCard {...mockProps} />);
    const title = screen.getByText('Test Feature');
    expect(title.tagName).toBe('H3');
  });
});
