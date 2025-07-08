import React from 'react'
import { render, screen } from '@testing-library/react'
import { ResponsiveTitle } from '../ResponsiveTitle'

// Mock useMediaQuery hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(),
}))

import { useMediaQuery } from '@/hooks/useMediaQuery'

describe('ResponsiveTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default props', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(<ResponsiveTitle>Test Title</ResponsiveTitle>)
    
    const title = screen.getByText('Test Title')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H1')
  })

  it('renders as specified heading level', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(<ResponsiveTitle as="h3">Heading 3</ResponsiveTitle>)
    
    const title = screen.getByText('Heading 3')
    expect(title.tagName).toBe('H3')
  })

  it('applies custom className', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(
      <ResponsiveTitle className="custom-class text-blue-500">
        Custom Styled Title
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Custom Styled Title')
    expect(title).toHaveClass('custom-class', 'text-blue-500')
  })

  it('renders with mobile styles on small screens', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(true)
    
    render(<ResponsiveTitle>Mobile Title</ResponsiveTitle>)
    
    const title = screen.getByText('Mobile Title')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('renders with desktop styles on large screens', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(<ResponsiveTitle>Desktop Title</ResponsiveTitle>)
    
    const title = screen.getByText('Desktop Title')
    expect(title).toHaveClass('text-4xl', 'lg:text-5xl')
  })

  it('applies size variants correctly', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    const { rerender } = render(
      <ResponsiveTitle size="small">Small Title</ResponsiveTitle>
    )
    
    let title = screen.getByText('Small Title')
    expect(title).toHaveClass('text-xl', 'sm:text-2xl')
    
    rerender(<ResponsiveTitle size="medium">Medium Title</ResponsiveTitle>)
    title = screen.getByText('Medium Title')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
    
    rerender(<ResponsiveTitle size="large">Large Title</ResponsiveTitle>)
    title = screen.getByText('Large Title')
    expect(title).toHaveClass('text-4xl', 'lg:text-5xl')
  })

  it('combines base classes with custom classes', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(
      <ResponsiveTitle 
        className="font-bold text-center" 
        size="medium"
      >
        Combined Classes
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Combined Classes')
    expect(title).toHaveClass('font-bold', 'text-center', 'text-2xl', 'sm:text-3xl')
  })

  it('handles complex children', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(
      <ResponsiveTitle>
        <span>Complex</span> <strong>Children</strong> Content
      </ResponsiveTitle>
    )
    
    expect(screen.getByText('Complex')).toBeInTheDocument()
    expect(screen.getByText('Children')).toBeInTheDocument()
  })

  it('responds to screen size changes', () => {
    const mockUseMediaQuery = useMediaQuery as jest.Mock
    mockUseMediaQuery.mockReturnValue(false)
    
    const { rerender } = render(
      <ResponsiveTitle>Responsive Title</ResponsiveTitle>
    )
    
    let title = screen.getByText('Responsive Title')
    expect(title).toHaveClass('text-4xl')
    
    // Simulate screen size change
    mockUseMediaQuery.mockReturnValue(true)
    rerender(<ResponsiveTitle>Responsive Title</ResponsiveTitle>)
    
    title = screen.getByText('Responsive Title')
    expect(title).toHaveClass('text-2xl')
  })

  it('applies weight variants', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    const { rerender } = render(
      <ResponsiveTitle weight="normal">Normal Weight</ResponsiveTitle>
    )
    
    let title = screen.getByText('Normal Weight')
    expect(title).toHaveClass('font-normal')
    
    rerender(<ResponsiveTitle weight="medium">Medium Weight</ResponsiveTitle>)
    title = screen.getByText('Medium Weight')
    expect(title).toHaveClass('font-medium')
    
    rerender(<ResponsiveTitle weight="semibold">Semibold Weight</ResponsiveTitle>)
    title = screen.getByText('Semibold Weight')
    expect(title).toHaveClass('font-semibold')
    
    rerender(<ResponsiveTitle weight="bold">Bold Weight</ResponsiveTitle>)
    title = screen.getByText('Bold Weight')
    expect(title).toHaveClass('font-bold')
  })

  it('handles gradient text styling', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(
      <ResponsiveTitle gradient>
        Gradient Title
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Gradient Title')
    expect(title).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600', 'bg-clip-text', 'text-transparent')
  })

  it('handles alignment props', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    const { rerender } = render(
      <ResponsiveTitle align="left">Left Aligned</ResponsiveTitle>
    )
    
    let title = screen.getByText('Left Aligned')
    expect(title).toHaveClass('text-left')
    
    rerender(<ResponsiveTitle align="center">Center Aligned</ResponsiveTitle>)
    title = screen.getByText('Center Aligned')
    expect(title).toHaveClass('text-center')
    
    rerender(<ResponsiveTitle align="right">Right Aligned</ResponsiveTitle>)
    title = screen.getByText('Right Aligned')
    expect(title).toHaveClass('text-right')
  })

  it('preserves semantic HTML structure', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    const { container } = render(
      <ResponsiveTitle as="h2" id="main-title" role="heading" aria-level={2}>
        Semantic Title
      </ResponsiveTitle>
    )
    
    const title = container.querySelector('h2')
    expect(title).toHaveAttribute('id', 'main-title')
    expect(title).toHaveAttribute('role', 'heading')
    expect(title).toHaveAttribute('aria-level', '2')
  })

  it('handles responsive breakpoints', () => {
    ;(useMediaQuery as jest.Mock).mockReturnValue(false)
    
    render(
      <ResponsiveTitle 
        className="md:text-6xl xl:text-7xl"
        size="large"
      >
        Breakpoint Title
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Breakpoint Title')
    expect(title).toHaveClass('text-4xl', 'lg:text-5xl', 'md:text-6xl', 'xl:text-7xl')
  })
})