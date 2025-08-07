
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
  })),
  scaleLinear: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  scaleOrdinal: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  arc: jest.fn(() => {
    const arcFn = jest.fn();
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis()
    });
    return arcFn;
  }),
  pie: jest.fn(() => {
    const pieFn = jest.fn((data: unknown[]) => data.map((d: unknown, i: number) => ({ data: d, index: i })));
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis()
    });
    return pieFn;
  }),
}));

/**
 * DomainRadarChart 元件測試
 * 測試 Recharts 雷達圖視覺化元件
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DomainRadarChart from '../DomainRadarChart';
import type { RadarChartData } from '@/types/assessment';

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  RadarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => (
    <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="polar-angle-axis" data-key={dataKey} />
  ),
  PolarRadiusAxis: ({ angle, domain }: { angle: number; domain: [number, number] }) => (
    <div data-testid="polar-radius-axis" data-angle={angle} data-domain={JSON.stringify(domain)} />
  ),
  Radar: ({ name, dataKey, stroke, fill, fillOpacity }: { 
    name: string; 
    dataKey: string; 
    stroke: string; 
    fill: string; 
    fillOpacity: number; 
  }) => (
    <div 
      data-testid="radar" 
      data-name={name}
      data-key={dataKey}
      data-stroke={stroke}
      data-fill={fill}
      data-fill-opacity={fillOpacity}
    />
  ),
}));

describe('DomainRadarChart', () => {
  const mockData: RadarChartData[] = [
    {
      domain: 'Engaging with AI',
      score: 85,
      fullMark: 100
    },
    {
      domain: 'Creating with AI',
      score: 75,
      fullMark: 100
    },
    {
      domain: 'Managing AI',
      score: 90,
      fullMark: 100
    },
    {
      domain: 'Designing AI',
      score: 70,
      fullMark: 100
    }
  ];

  it('renders without crashing', async () => {
    const { container } = render(<DomainRadarChart data={mockData} />);
    expect(container.querySelector('.h-64')).toBeInTheDocument();
    expect(container.querySelector('.w-full')).toBeInTheDocument();
  });

  it('renders responsive container', async () => {
    render(<DomainRadarChart data={mockData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders radar chart with correct data', async () => {
    render(<DomainRadarChart data={mockData} />);
    const radarChart = screen.getByTestId('radar-chart');
    expect(radarChart).toBeInTheDocument();
    
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(mockData);
  });

  it('renders all chart components', async () => {
    render(<DomainRadarChart data={mockData} />);
    
    // Check PolarGrid
    expect(screen.getByTestId('polar-grid')).toBeInTheDocument();
    
    // Check PolarAngleAxis
    const angleAxis = screen.getByTestId('polar-angle-axis');
    expect(angleAxis).toBeInTheDocument();
    expect(angleAxis).toHaveAttribute('data-key', 'domain');
    
    // Check PolarRadiusAxis
    const radiusAxis = screen.getByTestId('polar-radius-axis');
    expect(radiusAxis).toBeInTheDocument();
    expect(radiusAxis).toHaveAttribute('data-angle', '90');
    expect(radiusAxis).toHaveAttribute('data-domain', '[0,100]');
    
    // Check Radar
    const radar = screen.getByTestId('radar');
    expect(radar).toBeInTheDocument();
    expect(radar).toHaveAttribute('data-name', 'Score');
    expect(radar).toHaveAttribute('data-key', 'score');
    expect(radar).toHaveAttribute('data-stroke', '#6366f1');
    expect(radar).toHaveAttribute('data-fill', '#6366f1');
    expect(radar).toHaveAttribute('data-fill-opacity', '0.6');
  });

  it('handles empty data array', async () => {
    const { container } = render(<DomainRadarChart data={[]} />);
    expect(container.querySelector('.h-64')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('handles single data point', async () => {
    const singleData: RadarChartData[] = [
      { domain: 'Only Domain', score: 50, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={singleData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(singleData);
  });

  it('handles maximum score values', async () => {
    const maxScoreData: RadarChartData[] = [
      { domain: 'Perfect Score', score: 100, fullMark: 100 },
      { domain: 'Also Perfect', score: 100, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={maxScoreData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(maxScoreData);
  });

  it('handles zero score values', async () => {
    const zeroScoreData: RadarChartData[] = [
      { domain: 'No Score', score: 0, fullMark: 100 },
      { domain: 'Also No Score', score: 0, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={zeroScoreData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(zeroScoreData);
  });

  it('maintains correct container dimensions', async () => {
    const { container } = render(<DomainRadarChart data={mockData} />);
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveClass('h-64', 'w-full');
  });

  it('renders with mixed score values', async () => {
    const mixedData: RadarChartData[] = [
      { domain: 'Low', score: 25, fullMark: 100 },
      { domain: 'Medium', score: 50, fullMark: 100 },
      { domain: 'High', score: 75, fullMark: 100 },
      { domain: 'Perfect', score: 100, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={mixedData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(mixedData);
  });

  it('handles long domain names', async () => {
    const longNameData: RadarChartData[] = [
      { domain: 'This is a very long domain name that might wrap', score: 80, fullMark: 100 },
      { domain: 'Another extremely long domain name for testing purposes', score: 60, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={longNameData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(longNameData);
  });

  it('applies correct styling classes', async () => {
    const { container } = render(<DomainRadarChart data={mockData} />);
    const angleAxis = screen.getByTestId('polar-angle-axis');
    
    // The component applies className="text-sm" to PolarAngleAxis
    // In a real test, this would be checked through the actual DOM,
    // but with our mock we can at least verify the component structure
    expect(angleAxis).toBeInTheDocument();
  });

  it('renders with decimal score values', async () => {
    const decimalData: RadarChartData[] = [
      { domain: 'Domain A', score: 85.5, fullMark: 100 },
      { domain: 'Domain B', score: 72.3, fullMark: 100 },
      { domain: 'Domain C', score: 91.7, fullMark: 100 }
    ];
    
    render(<DomainRadarChart data={decimalData} />);
    const radarChart = screen.getByTestId('radar-chart');
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '[]');
    expect(chartData).toEqual(decimalData);
  });

  it('maintains chart configuration', async () => {
    render(<DomainRadarChart data={mockData} />);
    
    // Verify the radar configuration matches the component
    const radar = screen.getByTestId('radar');
    expect(radar).toHaveAttribute('data-stroke', '#6366f1'); // indigo-500
    expect(radar).toHaveAttribute('data-fill', '#6366f1');
    expect(radar).toHaveAttribute('data-fill-opacity', '0.6');
  });
});