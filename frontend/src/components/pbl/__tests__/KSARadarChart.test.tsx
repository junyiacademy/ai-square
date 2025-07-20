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
  const mockData = {
    knowledge: [
      { code: 'K1', name: 'AI Fundamentals', value: 85 },
      { code: 'K2', name: 'Machine Learning', value: 72 },
      { code: 'K3', name: 'Data Science', value: 90 },
    ],
    skills: [
      { code: 'S1', name: 'Programming', value: 88 },
      { code: 'S2', name: 'Analysis', value: 75 },
      { code: 'S3', name: 'Problem Solving', value: 82 },
    ],
    attitudes: [
      { code: 'A1', name: 'Ethics', value: 95 },
      { code: 'A2', name: 'Collaboration', value: 80 },
      { code: 'A3', name: 'Innovation', value: 77 },
    ],
  }

  it('renders the radar chart with all components', () => {
    render(<KSARadarChart data={mockData} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('polar-grid')).toBeInTheDocument()
    expect(screen.getByTestId('polar-angle-axis')).toBeInTheDocument()
    expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument()
    expect(screen.getByTestId('legend')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('renders three radar areas for K, S, and A', () => {
    render(<KSARadarChart data={mockData} />)

    expect(screen.getByTestId('radar-knowledge')).toBeInTheDocument()
    expect(screen.getByTestId('radar-skills')).toBeInTheDocument()
    expect(screen.getByTestId('radar-attitudes')).toBeInTheDocument()
  })

  it('formats data correctly for the chart', () => {
    render(<KSARadarChart data={mockData} />)

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
    const emptyData = {
      knowledge: [],
      skills: [],
      attitudes: [],
    }

    render(<KSARadarChart data={emptyData} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(0)
  })

  it('applies custom className', () => {
    render(<KSARadarChart data={mockData} className="custom-chart-class" />)

    const container = screen.getByTestId('responsive-container').parentElement
    expect(container).toHaveClass('custom-chart-class')
  })

  it('renders with custom height', () => {
    render(<KSARadarChart data={mockData} height={500} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toHaveStyle({ height: '500px' })
  })

  it('shows loading state when data is being fetched', () => {
    render(<KSARadarChart data={mockData} loading />)

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument()
  })

  it('handles partial data correctly', () => {
    const partialData = {
      knowledge: [
        { code: 'K1', name: 'AI Fundamentals', value: 85 },
      ],
      skills: [],
      attitudes: [
        { code: 'A1', name: 'Ethics', value: 95 },
      ],
    }

    render(<KSARadarChart data={partialData} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(2)
  })

  it('renders custom tooltip content', () => {
    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        return (
          <div data-testid="custom-tooltip-content">
            {payload[0].value}
          </div>
        )
      }
      return null
    }

    render(<KSARadarChart data={mockData} customTooltip={CustomTooltip} />)

    // The custom tooltip would be rendered when hovering
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('handles different value ranges', () => {
    const dataWithDifferentRanges = {
      knowledge: [
        { code: 'K1', name: 'Test 1', value: 25 },
        { code: 'K2', name: 'Test 2', value: 100 },
        { code: 'K3', name: 'Test 3', value: 0 },
      ],
      skills: [],
      attitudes: [],
    }

    render(<KSARadarChart data={dataWithDifferentRanges} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData[0].knowledge).toBe(25)
    expect(chartData[1].knowledge).toBe(100)
    expect(chartData[2].knowledge).toBe(0)
  })

  it('preserves data order', () => {
    render(<KSARadarChart data={mockData} />)

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
    render(<KSARadarChart data={mockData} />)

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
    const dataWithLongNames = {
      knowledge: [
        { 
          code: 'K1', 
          name: 'Very Long Knowledge Indicator Name That Should Be Truncated', 
          value: 85 
        },
      ],
      skills: [],
      attitudes: [],
    }

    render(<KSARadarChart data={dataWithLongNames} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Component should handle long names appropriately
    expect(chartData[0].indicator).toContain('K1')
    expect(chartData[0].indicator.length).toBeLessThan(100) // Reasonable length limit
  })
})