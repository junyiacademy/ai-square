import React from 'react'
import { render, screen } from '@testing-library/react'
import DomainRadarChart from '../DomainRadarChart'

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
    Tooltip: ({ content }: any) => <div data-testid="tooltip">{content && typeof content === 'function' ? content({}) : content}</div>,
  }
})

describe('DomainRadarChart', () => {
  const mockDomainScores = {
    engaging_with_ai: 85,
    creating_with_ai: 72,
    managing_with_ai: 90,
    designing_with_ai: 68
  }

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

  it('renders with default height', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('renders without errors when no className provided', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('shows title when provided', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} title="Domain Performance" />)

    expect(screen.getByText('Domain Performance')).toBeInTheDocument()
    expect(screen.getByText('Domain Performance')).toHaveClass('text-xl', 'font-semibold')
  })

  it('renders chart when not loading', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('handles zero domain scores', () => {
    const zeroScores = {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0
    }
    render(<DomainRadarChart domainScores={zeroScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData).toHaveLength(4)
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

  it('renders with title when provided', () => {
    render(
      <DomainRadarChart 
        domainScores={mockDomainScores} 
        title="Domain Analysis"
      />
    )

    expect(screen.getByText('Domain Analysis')).toBeInTheDocument()
  })

  it('handles scores above 100', () => {
    const highScores = {
      engaging_with_ai: 120,
      creating_with_ai: 100,
      managing_with_ai: 100,
      designing_with_ai: 100
    }

    render(<DomainRadarChart domainScores={highScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Score should be capped at 100
    expect(chartData[0].value).toBe(100)
  })

  it('handles negative scores', () => {
    const negativeScores = {
      engaging_with_ai: -10,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0
    }

    render(<DomainRadarChart domainScores={negativeScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    // Score should be set to 0
    expect(chartData[0].value).toBe(0)
  })

  it('renders with default theme', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('renders without comparison data', () => {
    render(
      <DomainRadarChart 
        domainScores={mockDomainScores}
      />
    )

    // Check that main radar component exists
    expect(screen.getByTestId('radar-value')).toBeInTheDocument()
  })

  it('handles domain scores as object', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    // Chart should render without errors
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('renders with default animation', () => {
    render(<DomainRadarChart domainScores={mockDomainScores} />)

    const radar = screen.getByTestId('radar-value')
    expect(radar).toBeInTheDocument()
  })

  it('handles decimal scores', () => {
    const decimalScores = {
      engaging_with_ai: 85.5,
      creating_with_ai: 72.3,
      managing_with_ai: 90.7,
      designing_with_ai: 68.4
    }

    render(<DomainRadarChart domainScores={decimalScores} />)

    const chartElement = screen.getByTestId('radar-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]')

    expect(chartData[0].value).toBe(85.5)
    expect(chartData[1].value).toBe(72.3)
  })
})