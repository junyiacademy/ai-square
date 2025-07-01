import React from 'react'
import { render, screen } from '@testing-library/react'
import { DomainRadarChart } from '../DomainRadarChart'

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
    PolarRadiusAxis: ({ domain }: any) => <div data-testid="polar-radius-axis" data-domain={JSON.stringify(domain)} />,
    Radar: ({ dataKey, name, ...props }: any) => (
      <div data-testid={`radar-${dataKey}`} data-name={name} {...props} />
    ),
    Legend: () => <div data-testid="legend" />,
    Tooltip: ({ content }: any) => <div data-testid="tooltip">{content && <content />}</div>,
  }
})

describe('DomainRadarChart', () => {
  const mockDomainScores = [
    {
      domain: 'Engaging_with_AI',
      displayName: 'Engaging with AI',
      score: 85,
      color: '#3b82f6',
    },
    {
      domain: 'Creating_with_AI',
      displayName: 'Creating with AI',
      score: 72,
      color: '#10b981',
    },
    {
      domain: 'Managing_with_AI',
      displayName: 'Managing with AI',
      score: 90,
      color: '#f59e0b',
    },
    {
      domain: 'Designing_with_AI',
      displayName: 'Designing with AI',
      score: 68,
      color: '#ef4444',
    },
  ]

  it('renders the radar chart with all components', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('polar-grid')).toBeInTheDocument()
    expect(screen.getByTestId('polar-angle-axis')).toBeInTheDocument()
    expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument()
    expect(screen.getByTestId('legend')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('formats data correctly for the chart', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(4)
    expect(chartData[0]).toEqual({
      domain: 'Engaging with AI',
      value: 85,
      fullMark: 100,
    })
  })

  it('renders with custom height', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} height={500} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toHaveStyle({ height: '500px' })
  })

  it('applies custom className', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} className="custom-chart" />)

    const container = screen.getByTestId('responsive-container').parentElement
    expect(container).toHaveClass('custom-chart')
  })

  it('shows title when provided', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} title="Domain Performance" />)

    expect(screen.getByText('Domain Performance')).toBeInTheDocument()
    expect(screen.getByText('Domain Performance')).toHaveClass('text-xl', 'font-semibold')
  })

  it('shows loading state', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} loading />)

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument()
  })

  it('handles empty domain scores', () => {
    render(<DomainRadarChart domainScores={[]} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(0)
  })

  it('sets correct radar properties', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radar = screen.getByTestId('radar-value')
    expect(radar).toHaveAttribute('dataKey', 'value')
    expect(radar).toHaveAttribute('stroke', '#8884d8')
    expect(radar).toHaveAttribute('fill', '#8884d8')
    expect(radar).toHaveAttribute('fillOpacity', '0.6')
  })

  it('configures axis correctly', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const angleAxis = screen.getByTestId('polar-angle-axis')
    expect(angleAxis).toHaveAttribute('data-key', 'domain')

    const radiusAxis = screen.getByTestId('polar-radius-axis')
    expect(radiusAxis).toHaveAttribute('data-domain', '[0,100]')
  })

  it('shows subtitle when provided', () => {
    render(
      <DomainRadarChart 
        domainScores={mockDomainScores} 
        title="Domain Analysis"
        subtitle="Based on your recent activities"
      />
    )

    expect(screen.getByText('Based on your recent activities')).toBeInTheDocument()
    expect(screen.getByText('Based on your recent activities')).toHaveClass('text-sm', 'text-gray-600')
  })

  it('handles scores above 100', () => {
    const highScores = [
      {
        domain: 'Engaging_with_AI',
        displayName: 'Engaging with AI',
        score: 120,
        color: '#3b82f6',
      },
    ]

    render(<DomainRadarChart domainScores={highScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Score should be capped at 100
    expect(chartData[0].value).toBe(100)
  })

  it('handles negative scores', () => {
    const negativeScores = [
      {
        domain: 'Engaging_with_AI',
        displayName: 'Engaging with AI',
        score: -10,
        color: '#3b82f6',
      },
    ]

    render(<DomainRadarChart domainScores={negativeScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Score should be set to 0
    expect(chartData[0].value).toBe(0)
  })

  it('applies theme colors', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} theme="dark" />)

    const container = screen.getByTestId('responsive-container').parentElement
    expect(container).toHaveClass('dark')
  })

  it('shows comparison data when provided', () => {
    const comparisonData = {
      average: [80, 75, 85, 70],
      previous: [75, 70, 88, 65],
    }

    render(
      <DomainRadarChart 
        domainScores={mockDomainScores} 
        comparisonData={comparisonData}
      />
    )

    // Check for additional radar components
    expect(screen.getByTestId('radar-average')).toBeInTheDocument()
    expect(screen.getByTestId('radar-previous')).toBeInTheDocument()
  })

  it('handles custom colors in domain scores', () => {
    const customColorScores = mockDomainScores.map((score, index) => ({
      ...score,
      color: `#${index}${index}${index}${index}${index}${index}`,
    }))

    render(<DomainRadarChart domainScores={customColorScores} />)

    // Chart should render without errors
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('renders with animation disabled', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} animate={false} />)

    const radar = screen.getByTestId('radar-value')
    expect(radar).toHaveAttribute('isAnimationActive', 'false')
  })

  it('handles decimal scores', () => {
    const decimalScores = [
      {
        domain: 'Engaging_with_AI',
        displayName: 'Engaging with AI',
        score: 85.5,
        color: '#3b82f6',
      },
      {
        domain: 'Creating_with_AI',
        displayName: 'Creating with AI',
        score: 72.3,
        color: '#10b981',
      },
    ]

    render(<DomainRadarChart domainScores={decimalScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData[0].value).toBe(85.5)
    expect(chartData[1].value).toBe(72.3)
  })
})