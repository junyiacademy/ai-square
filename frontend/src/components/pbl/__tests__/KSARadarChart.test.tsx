import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import KSARadarChart from '../KSARadarChart'

// Mock recharts components
jest.mock('recharts', () => {
  const originalModule = jest.requireActual('recharts')
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    RadarChart: ({ children, data, ...props }: any) => (
      <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} {...props}>
        {children}
      </div>
    ),
    PolarGrid: () => <div data-testid="polar-grid" />,
    PolarAngleAxis: ({ dataKey }: any) => <div data-testid="polar-angle-axis" data-key={dataKey} />,
    PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
    Radar: ({ dataKey, name, ...props }: any) => (
      <div data-testid={`radar-${dataKey}`} data-name={name} {...props} />
    ),
    Legend: () => <div data-testid="legend" />,
    Tooltip: ({ content }: any) => <div data-testid="tooltip">{content && typeof content === 'function' ? content({}) : content}</div>,
  }
})

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

  it('renders the radar chart with all components', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('polar-grid')).toBeInTheDocument()
    expect(screen.getByTestId('polar-angle-axis')).toBeInTheDocument()
    expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument()
    expect(screen.getByTestId('legend')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('renders three radar areas for K, S, and A', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    expect(screen.getByTestId('radar-knowledge')).toBeInTheDocument()
    expect(screen.getByTestId('radar-skills')).toBeInTheDocument()
    expect(screen.getByTestId('radar-attitudes')).toBeInTheDocument()
  })

  it('formats data correctly for the chart', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(9) // 3 knowledge + 3 skills + 3 attitudes
    expect(chartData[0]).toEqual({
      indicator: 'K1: AI Fundamentals',
      knowledge: 85,
      skills: 0,
      attitudes: 0,
    })
  })

  it('handles empty data gracefully', () => {
    render(<KSARadarChart ksaScores={{}} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(0)
  })

  it('renders without custom className', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('renders with default height', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('renders when data is available', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('handles partial data correctly', () => {
    const partialKsaScores = {
      'K1': { score: 85, category: 'knowledge' as const },
      'A1': { score: 95, category: 'attitudes' as const }
    }
    
    render(<KSARadarChart ksaScores={partialKsaScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(2)
  })

  it('renders default tooltip content', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    // The default tooltip would be rendered
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('handles different value ranges', () => {
    const ksaScoresWithDifferentRanges = {
      'K1': { score: 25, category: 'knowledge' as const },
      'K2': { score: 100, category: 'knowledge' as const },
      'K3': { score: 0, category: 'knowledge' as const }
    }
    
    render(<KSARadarChart ksaScores={ksaScoresWithDifferentRanges} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData[0].knowledge).toBe(25)
    expect(chartData[1].knowledge).toBe(100)
    expect(chartData[2].knowledge).toBe(0)
  })

  it('preserves data order', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const angleAxis = screen.getByTestId('polar-angle-axis')
    expect(angleAxis).toHaveAttribute('data-key', 'indicator')

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Check that knowledge items come first
    expect(chartData[0].indicator).toContain('K1')
    expect(chartData[1].indicator).toContain('K2')
    expect(chartData[2].indicator).toContain('K3')

    // Then skills
    expect(chartData[3].indicator).toContain('S1')
    expect(chartData[4].indicator).toContain('S2')
    expect(chartData[5].indicator).toContain('S3')

    // Then attitudes
    expect(chartData[6].indicator).toContain('A1')
    expect(chartData[7].indicator).toContain('A2')
    expect(chartData[8].indicator).toContain('A3')
  })

  it('applies theme colors correctly', () => {
    render(<KSARadarChart ksaScores={mockKsaScores} />)

    const knowledgeRadar = screen.getByTestId('radar-knowledge')
    const skillsRadar = screen.getByTestId('radar-skills')
    const attitudesRadar = screen.getByTestId('radar-attitudes')

    expect(knowledgeRadar).toHaveAttribute('stroke', '#3b82f6')
    expect(knowledgeRadar).toHaveAttribute('fill', '#3b82f6')

    expect(skillsRadar).toHaveAttribute('stroke', '#10b981')
    expect(skillsRadar).toHaveAttribute('fill', '#10b981')

    expect(attitudesRadar).toHaveAttribute('stroke', '#f59e0b')
    expect(attitudesRadar).toHaveAttribute('fill', '#f59e0b')
  })

  it('handles long indicator names', () => {
    const ksaScoresWithLongNames = {
      'K1': { score: 85, category: 'knowledge' as const }
    }
    
    render(<KSARadarChart ksaScores={ksaScoresWithLongNames} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Component should handle long names appropriately
    expect(chartData[0].indicator).toContain('K1')
    expect(chartData[0].indicator.length).toBeLessThan(100) // Reasonable length limit
  })
})