import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../loading-spinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
    
    // Check for sr-only loading text
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('renders with medium size', () => {
    render(<LoadingSpinner size="md" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-6', 'w-6')
  })

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class text-red-500" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('custom-class', 'text-red-500')
  })

  it('renders inline version', () => {
    render(<LoadingSpinner inline />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('inline-block')
  })

  it('renders centered version', () => {
    render(<LoadingSpinner center />)
    
    const container = screen.getByRole('status').parentElement
    expect(container).toHaveClass('flex', 'justify-center', 'items-center')
  })

  it('renders with custom loading text', () => {
    render(<LoadingSpinner loadingText="Please wait..." />)
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('maintains accessibility with aria-label', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })

  it('combines multiple props correctly', () => {
    render(
      <LoadingSpinner 
        size="lg" 
        className="text-blue-500" 
        center 
        loadingText="Processing..."
      />
    )
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-8', 'w-8', 'text-blue-500')
    
    const container = spinner.parentElement
    expect(container).toHaveClass('flex', 'justify-center', 'items-center')
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })
})