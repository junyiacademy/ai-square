import React from 'react'
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render'
import { LoadingSpinner } from '../loading-spinner'

describe('LoadingSpinner', () => {
  it('renders with default props', async () => {
    renderWithProviders(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
    
    // Check for sr-only loading text (Chinese text)
    expect(screen.getByText('載入中...')).toBeInTheDocument()
  })

  it('renders with large size', async () => {
    renderWithProviders(<LoadingSpinner size="lg" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-12', 'w-12')
  })

  it('renders with small size', async () => {
    renderWithProviders(<LoadingSpinner size="sm" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('renders with medium size (default)', async () => {
    renderWithProviders(<LoadingSpinner size="md" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('renders with custom className', async () => {
    renderWithProviders(<LoadingSpinner className="mt-4 mb-4" />)
    
    const container = screen.getByRole('status').parentElement
    expect(container).toHaveClass('mt-4', 'mb-4')
  })

  it('maintains accessibility with aria-label', async () => {
    renderWithProviders(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', '載入中')
  })

  it('combines size and className props correctly', async () => {
    renderWithProviders(
      <LoadingSpinner 
        size="lg" 
        className="text-blue-500" 
      />
    )
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-12', 'w-12')
    
    const container = spinner.parentElement
    expect(container).toHaveClass('text-blue-500')
  })

  it('has correct default spinner styling', async () => {
    renderWithProviders(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-b-2', 'border-blue-600')
  })

  it('renders with flex container for centering', async () => {
    renderWithProviders(<LoadingSpinner />)
    
    const container = screen.getByRole('status').parentElement
    expect(container).toHaveClass('flex', 'items-center', 'justify-center')
  })
})