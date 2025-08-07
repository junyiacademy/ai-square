import React from 'react'
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render'
import { ResponsiveTitle } from '../ResponsiveTitle'

describe('ResponsiveTitle', () => {
  it('renders with default props', async () => {
    renderWithProviders(<ResponsiveTitle>Test Title</ResponsiveTitle>)
    
    const title = screen.getByText('Test Title')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H1')
  })

  it('applies custom className', async () => {
    renderWithProviders(
      <ResponsiveTitle className="custom-class text-blue-500">
        Custom Styled Title
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Custom Styled Title')
    expect(title).toHaveClass('custom-class', 'text-blue-500')
  })

  it('applies default responsive font sizes for normal titles', async () => {
    renderWithProviders(<ResponsiveTitle>Normal Title</ResponsiveTitle>)
    
    const title = screen.getByText('Normal Title')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl', 'font-bold', 'text-center', 'px-4')
  })

  it('adjusts font size for long titles (> 30 chars but <= 40)', async () => {
    const longTitle = 'This is a long title with 35 chars!'
    expect(longTitle.length).toBe(35)
    expect(longTitle.length).toBeGreaterThan(30)
    expect(longTitle.length).toBeLessThanOrEqual(40)
    
    renderWithProviders(<ResponsiveTitle>{longTitle}</ResponsiveTitle>)
    
    const title = screen.getByText(longTitle)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('adjusts font size for very long titles (> 40 chars)', async () => {
    const veryLongTitle = 'This is an extremely long title that definitely exceeds forty characters and should use smaller font'
    renderWithProviders(<ResponsiveTitle>{veryLongTitle}</ResponsiveTitle>)
    
    const title = screen.getByText(veryLongTitle)
    expect(title).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl')
  })

  it('combines base classes with custom classes', async () => {
    renderWithProviders(
      <ResponsiveTitle className="text-blue-600 uppercase">
        Combined Classes
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Combined Classes')
    expect(title).toHaveClass('font-bold', 'text-center', 'px-4', 'text-blue-600', 'uppercase')
  })

  it('updates font size when children change', async () => {
    const { rerender } = renderWithProviders(
      <ResponsiveTitle>Short</ResponsiveTitle>
    )
    
    let title = screen.getByText('Short')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
    
    // Change to a very long title
    const veryLongTitle = 'This title is much longer than forty characters and should trigger smaller font size'
    rerender(<ResponsiveTitle>{veryLongTitle}</ResponsiveTitle>)
    
    title = screen.getByText(veryLongTitle)
    expect(title).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl')
  })

  it('handles edge case of exactly 30 characters', async () => {
    const title30Chars = 'This title has exactly 30 char'
    expect(title30Chars.length).toBe(30)
    
    renderWithProviders(<ResponsiveTitle>{title30Chars}</ResponsiveTitle>)
    
    const title = screen.getByText(title30Chars)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('handles edge case of exactly 40 characters', async () => {
    const title40Chars = 'This title has exactly forty characters!'
    expect(title40Chars.length).toBe(40)
    
    renderWithProviders(<ResponsiveTitle>{title40Chars}</ResponsiveTitle>)
    
    const title = screen.getByText(title40Chars)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('handles empty className prop', async () => {
    renderWithProviders(<ResponsiveTitle className="">Empty Class</ResponsiveTitle>)
    
    const title = screen.getByText('Empty Class')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl', 'font-bold', 'text-center', 'px-4')
    expect(title.className).not.toContain('  ') // No double spaces
  })

  it('maintains consistent padding', async () => {
    renderWithProviders(<ResponsiveTitle>Padded Title</ResponsiveTitle>)
    
    const title = screen.getByText('Padded Title')
    expect(title).toHaveClass('px-4')
  })
})