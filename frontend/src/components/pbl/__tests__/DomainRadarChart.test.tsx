
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

import React from 'react'
import { render, screen } from '@testing-library/react'
import DomainRadarChart from '../DomainRadarChart'

// Mock Chart.js and react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Radar: ({ data, options }: any) => (
    <div 
      data-testid="radar-chart" 
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
    >
      Radar Chart
    </div>
  ),
}))

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  RadialLinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Filler: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}))

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'domains.engaging_with_ai': 'Engaging with AI',
        'domains.creating_with_ai': 'Creating with AI',
        'domains.managing_with_ai': 'Managing AI',
        'domains.designing_with_ai': 'Designing AI',
      }
      return translations[key] || key
    }
  }),
}))

describe('DomainRadarChart', () => {
  const mockDomainScores = {
    engaging_with_ai: 85,
    creating_with_ai: 72,
    managing_with_ai: 90,
    designing_with_ai: 78,
  }

  it('renders the radar chart', async () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    expect(radarChart).toBeInTheDocument()
  })

  it('passes correct data structure to chart', async () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    // Check that labels are translation keys (since mock returns keys)
    expect(chartData.labels).toContain('homepage:domains.items.engaging.name')
    expect(chartData.labels).toContain('homepage:domains.items.creating.name')
    expect(chartData.labels).toContain('homepage:domains.items.managing.name')
    expect(chartData.labels).toContain('homepage:domains.items.designing.name')

    // Check dataset
    expect(chartData.datasets).toHaveLength(1)
    const dataset = chartData.datasets[0]
    
    expect(dataset.label).toBe('homepage:domains.title')
    expect(dataset.data).toEqual([85, 72, 90, 78])
  })

  it('configures chart options correctly', async () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartOptions = JSON.parse(radarChart.getAttribute('data-chart-options') || '{}')

    // Check scale configuration
    expect(chartOptions.scales?.r?.min).toBe(0)
    expect(chartOptions.scales?.r?.max).toBe(100)
    expect(chartOptions.scales?.r?.ticks?.stepSize).toBe(20)

    // Check responsive settings
    expect(chartOptions.responsive).toBe(true)
    expect(chartOptions.maintainAspectRatio).toBe(false)
  })

  it('handles empty domain scores', async () => {
    const emptyScores = {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0,
    };
    render(<DomainRadarChart domainScores={emptyScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    // Component always renders all 4 domains
    expect(chartData.labels).toHaveLength(4)
    expect(chartData.datasets[0].data).toEqual([0, 0, 0, 0])
  })

  it('handles partial domain scores', async () => {
    const partialScores = {
      engaging_with_ai: 85,
      creating_with_ai: 72,
      managing_with_ai: 0,
      designing_with_ai: 0,
    }
    
    render(<DomainRadarChart domainScores={partialScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    // Component always renders all 4 domains, even with 0 scores
    expect(chartData.labels).toHaveLength(4)
    expect(chartData.datasets[0].data).toEqual([85, 72, 0, 0])
  })

  it('applies correct styling to dataset', async () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')
    const dataset = chartData.datasets[0]

    // Check styling properties
    expect(dataset.backgroundColor).toMatch(/rgba/)
    expect(dataset.borderColor).toBeDefined()
    expect(dataset.pointBackgroundColor).toBeDefined()
    expect(dataset.pointBorderColor).toBe('#fff')
    expect(dataset.pointHoverBackgroundColor).toBe('#fff')
  })
})