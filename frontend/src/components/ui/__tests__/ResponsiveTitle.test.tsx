import React from 'react'
import { render, screen } from '@testing-library/react'
import { ResponsiveTitle } from '../ResponsiveTitle'

describe('ResponsiveTitle', () => {
  it('renders with default props', () => {
    render(<ResponsiveTitle>Test Title</ResponsiveTitle>)
    
    const title = screen.getByText('Test Title')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H1')
  })

  it('applies custom className', () => {
    render(
      <ResponsiveTitle className="custom-class text-blue-500">
        Custom Styled Title
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Custom Styled Title')
    expect(title).toHaveClass('custom-class', 'text-blue-500')
  })

  it('applies default responsive font sizes for normal titles', () => {
    render(<ResponsiveTitle>Normal Title</ResponsiveTitle>)
    
    const title = screen.getByText('Normal Title')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl', 'font-bold', 'text-center', 'px-4')
  })

  it('adjusts font size for long titles (> 30 chars but <= 40)', () => {
    const longTitle = 'This is a long title with 35 chars!'
    expect(longTitle.length).toBe(35)
    expect(longTitle.length).toBeGreaterThan(30)
    expect(longTitle.length).toBeLessThanOrEqual(40)
    
    render(<ResponsiveTitle>{longTitle}</ResponsiveTitle>)
    
    const title = screen.getByText(longTitle)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('adjusts font size for very long titles (> 40 chars)', () => {
    const veryLongTitle = 'This is an extremely long title that definitely exceeds forty characters and should use smaller font'
    render(<ResponsiveTitle>{veryLongTitle}</ResponsiveTitle>)
    
    const title = screen.getByText(veryLongTitle)
    expect(title).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl')
  })

  it('combines base classes with custom classes', () => {
    render(
      <ResponsiveTitle className="text-blue-600 uppercase">
        Combined Classes
      </ResponsiveTitle>
    )
    
    const title = screen.getByText('Combined Classes')
    expect(title).toHaveClass('font-bold', 'text-center', 'px-4', 'text-blue-600', 'uppercase')
  })

  it('updates font size when children change', () => {
    const { rerender } = render(
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

  it('handles edge case of exactly 30 characters', () => {
    const title30Chars = 'This title has exactly 30 char'
    expect(title30Chars.length).toBe(30)
    
    render(<ResponsiveTitle>{title30Chars}</ResponsiveTitle>)
    
    const title = screen.getByText(title30Chars)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('handles edge case of exactly 40 characters', () => {
    const title40Chars = 'This title has exactly forty characters!'
    expect(title40Chars.length).toBe(40)
    
    render(<ResponsiveTitle>{title40Chars}</ResponsiveTitle>)
    
    const title = screen.getByText(title40Chars)
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl')
  })

  it('handles empty className prop', () => {
    render(<ResponsiveTitle className="">Empty Class</ResponsiveTitle>)
    
    const title = screen.getByText('Empty Class')
    expect(title).toHaveClass('text-2xl', 'sm:text-3xl', 'font-bold', 'text-center', 'px-4')
    expect(title.className).not.toContain('  ') // No double spaces
  })

  it('maintains consistent padding', () => {
    render(<ResponsiveTitle>Padded Title</ResponsiveTitle>)
    
    const title = screen.getByText('Padded Title')
    expect(title).toHaveClass('px-4')
  })
})