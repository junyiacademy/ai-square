import React from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import '@testing-library/jest-dom';
import DomainRadarMini from '../DomainRadarMini';

describe('DomainRadarMini', () => {
  const mockDomainScores = {
    engaging_with_ai: 75,
    creating_with_ai: 60,
    managing_with_ai: 85,
    designing_with_ai: 70
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with correct SVG dimensions', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('renders all four domain labels', async () => {
    renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    
    expect(screen.getByText('Engaging')).toBeInTheDocument();
    expect(screen.getByText('Creating')).toBeInTheDocument();
    expect(screen.getByText('Managing')).toBeInTheDocument();
    expect(screen.getByText('Designing')).toBeInTheDocument();
  });

  it('renders background circles for grid', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const circles = container.querySelectorAll('circle');
    
    // 3 background circles + 4 data point circles = 7 total
    expect(circles).toHaveLength(7);
  });

  it('renders grid lines from center', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const lines = container.querySelectorAll('line');
    
    // 4 grid lines from center to corners
    expect(lines).toHaveLength(4);
  });

  it('renders data polygon', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const polygon = container.querySelector('polygon');
    
    expect(polygon).toBeInTheDocument();
    expect(polygon).toHaveAttribute('fill', 'currentColor');
    expect(polygon).toHaveAttribute('fill-opacity', '0.3');
    expect(polygon).toHaveAttribute('stroke-width', '2');
  });

  it('renders data points for each domain', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    // Select only the data point circles (radius = 3)
    const dataPoints = container.querySelectorAll('circle[r="3"]');
    
    expect(dataPoints).toHaveLength(4);
  });

  it('handles zero scores correctly', async () => {
    const zeroScores = {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0
    };
    
    const { container } = renderWithProviders(<DomainRadarMini domainScores={zeroScores} />);
    const polygon = container.querySelector('polygon');
    
    expect(polygon).toBeInTheDocument();
    // With all zero scores, all points should be at center
    const points = polygon?.getAttribute('points');
    expect(points).toBeTruthy();
  });

  it('handles maximum scores correctly', async () => {
    const maxScores = {
      engaging_with_ai: 100,
      creating_with_ai: 100,
      managing_with_ai: 100,
      designing_with_ai: 100
    };
    
    const { container } = renderWithProviders(<DomainRadarMini domainScores={maxScores} />);
    const polygon = container.querySelector('polygon');
    
    expect(polygon).toBeInTheDocument();
  });

  it('applies correct styling classes', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    
    // Check wrapper div
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
    
    // Check polygon styling
    const polygon = container.querySelector('polygon');
    expect(polygon).toHaveClass('text-blue-500', 'dark:text-blue-400');
    
    // Check data points styling
    const dataPoints = container.querySelectorAll('circle[r="3"]');
    dataPoints.forEach(point => {
      expect(point).toHaveClass('text-blue-600', 'dark:text-blue-400');
    });
  });

  it('correctly positions labels with appropriate text anchors', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const texts = container.querySelectorAll('text');
    
    expect(texts).toHaveLength(4);
    
    // Check text anchors based on position
    expect(texts[0]).toHaveAttribute('text-anchor', 'middle'); // Top
    expect(texts[1]).toHaveAttribute('text-anchor', 'start');  // Right
    expect(texts[2]).toHaveAttribute('text-anchor', 'middle'); // Bottom
    expect(texts[3]).toHaveAttribute('text-anchor', 'end');    // Left
  });

  it('handles partial scores correctly', async () => {
    const partialScores = {
      engaging_with_ai: 50,
      creating_with_ai: 25,
      managing_with_ai: 75,
      designing_with_ai: 100
    };
    
    const { container } = renderWithProviders(<DomainRadarMini domainScores={partialScores} />);
    const polygon = container.querySelector('polygon');
    const dataPoints = container.querySelectorAll('circle[r="3"]');
    
    expect(polygon).toBeInTheDocument();
    expect(dataPoints).toHaveLength(4);
  });

  it('renders grid with correct styling', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    
    // Check background circles
    const backgroundCircles = container.querySelectorAll('circle[fill="none"]');
    backgroundCircles.forEach(circle => {
      expect(circle).toHaveAttribute('stroke', 'currentColor');
      expect(circle).toHaveClass('text-gray-200', 'dark:text-gray-700');
    });
    
    // Check grid lines
    const gridLines = container.querySelectorAll('line');
    gridLines.forEach(line => {
      expect(line).toHaveAttribute('stroke', 'currentColor');
      expect(line).toHaveClass('text-gray-200', 'dark:text-gray-700');
    });
  });

  it('uses transform attribute on SVG', async () => {
    const { container } = renderWithProviders(<DomainRadarMini domainScores={mockDomainScores} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('transform');
  });

  it('calculates polygon points based on scores', async () => {
    const scores = {
      engaging_with_ai: 100,  // Top point
      creating_with_ai: 50,   // Right point
      managing_with_ai: 75,   // Bottom point
      designing_with_ai: 25   // Left point
    };
    
    const { container } = renderWithProviders(<DomainRadarMini domainScores={scores} />);
    const polygon = container.querySelector('polygon');
    const points = polygon?.getAttribute('points');
    
    expect(points).toBeTruthy();
    // Points should form a diamond shape based on the scores
    expect(points).toContain(',');
    expect(points?.split(' ')).toHaveLength(4);
  });
});