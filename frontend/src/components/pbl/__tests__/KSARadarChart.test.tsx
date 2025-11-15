
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
import KSARadarChart from '../KSARadarChart'

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
        'complete.knowledge': 'Knowledge',
        'complete.skills': 'Skills',
        'complete.attitudes': 'Attitudes',
      }
      return translations[key] || key
    }
  }),
}))

describe('KSARadarChart', () => {
  const mockKsaScores = {
    'K1': { score: 85, category: 'knowledge' as const },
    'K2': { score: 72, category: 'knowledge' as const },
    'K3': { score: 90, category: 'knowledge' as const },
    'S1': { score: 88, category: 'skills' as const },
    'S2': { score: 75, category: 'skills' as const },
    'S3': { score: 82, category: 'skills' as const },
    'A1': { score: 95, category: 'attitudes' as const },
    'A2': { score: 80, category: 'attitudes' as const },
    'A3': { score: 77, category: 'attitudes' as const },
  }

  it('renders the radar chart', async () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    expect(radarChart).toBeInTheDocument()
  })

  it('passes correct data structure to chart', async () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    // Check that labels include all KSA codes
    expect(chartData.labels).toContain('K1')
    expect(chartData.labels).toContain('S1')
    expect(chartData.labels).toContain('A1')

    // Check datasets
    expect(chartData.datasets).toHaveLength(3) // Knowledge, Skills, Attitudes

    // Check knowledge dataset
    const knowledgeDataset = chartData.datasets.find((d: any) => d.label === 'Knowledge')
    expect(knowledgeDataset).toBeDefined()
    expect(knowledgeDataset.data).toContain(85) // K1 score
    expect(knowledgeDataset.data).toContain(72) // K2 score
    expect(knowledgeDataset.data).toContain(90) // K3 score
  })

  it('configures chart options correctly', async () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

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

  it('handles empty KSA scores', async () => {
    render(<KSARadarChart ksaScores={{}} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    expect(chartData.labels).toEqual([])
    expect(chartData.datasets).toHaveLength(3)
    chartData.datasets.forEach((dataset: any) => {
      expect(dataset.data).toEqual([])
    })
  })

  it('groups scores by category correctly', async () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const radarChart = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(radarChart.getAttribute('data-chart-data') || '{}')

    // Find skills dataset
    const skillsDataset = chartData.datasets.find((d: any) => d.label === 'Skills')

    // Skills should have scores for S1, S2, S3 and 0 for knowledge/attitude indices
    const nonZeroScores = skillsDataset.data.filter((score: number) => score > 0)
    expect(nonZeroScores).toHaveLength(3) // Only 3 skills scores
    expect(nonZeroScores).toContain(88) // S1
    expect(nonZeroScores).toContain(75) // S2
    expect(nonZeroScores).toContain(82) // S3
  })
})
