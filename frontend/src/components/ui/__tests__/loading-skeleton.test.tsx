import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSkeleton, CardSkeleton, TextSkeleton, TableSkeleton } from '../loading-skeleton'

describe('LoadingSkeleton', () => {
  describe('LoadingSkeleton base component', () => {
    it('renders with default props', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200')
    })

    it('renders with custom className', () => {
      render(<LoadingSkeleton className="custom-class h-10" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('custom-class', 'h-10', 'animate-pulse')
    })

    it('renders with custom width and height', () => {
      render(<LoadingSkeleton width="200px" height="50px" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveStyle({ width: '200px', height: '50px' })
    })

    it('renders circular variant', () => {
      render(<LoadingSkeleton variant="circular" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('rounded-full')
    })

    it('renders rectangular variant', () => {
      render(<LoadingSkeleton variant="rectangular" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).not.toHaveClass('rounded')
    })

    it('renders with dark theme', () => {
      render(<LoadingSkeleton theme="dark" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('bg-gray-700')
    })
  })

  describe('CardSkeleton', () => {
    it('renders card skeleton with correct structure', () => {
      render(<CardSkeleton />)
      
      const card = screen.getByTestId('card-skeleton')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('border', 'rounded-lg', 'p-4')
      
      // Check for header, content lines, and footer
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons.length).toBeGreaterThan(3)
    })

    it('renders with custom className', () => {
      render(<CardSkeleton className="custom-card-class" />)
      
      const card = screen.getByTestId('card-skeleton')
      expect(card).toHaveClass('custom-card-class')
    })

    it('renders correct number of content lines', () => {
      render(<CardSkeleton lines={5} />)
      
      // Header + 5 content lines + footer = 7 skeletons
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons.length).toBe(7)
    })

    it('renders without footer', () => {
      render(<CardSkeleton showFooter={false} />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      // Should have fewer skeletons without footer
      expect(skeletons.length).toBeLessThan(6)
    })
  })

  describe('TextSkeleton', () => {
    it('renders single line by default', () => {
      render(<TextSkeleton />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons).toHaveLength(1)
    })

    it('renders multiple lines', () => {
      render(<TextSkeleton lines={3} />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons).toHaveLength(3)
    })

    it('renders with custom width for each line', () => {
      render(<TextSkeleton lines={3} width={['100%', '80%', '60%']} />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons[0]).toHaveStyle({ width: '100%' })
      expect(skeletons[1]).toHaveStyle({ width: '80%' })
      expect(skeletons[2]).toHaveStyle({ width: '60%' })
    })

    it('renders with heading variant', () => {
      render(<TextSkeleton variant="heading" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('h-8')
    })

    it('renders with body variant', () => {
      render(<TextSkeleton variant="body" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('h-4')
    })

    it('renders with caption variant', () => {
      render(<TextSkeleton variant="caption" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('h-3')
    })
  })

  describe('TableSkeleton', () => {
    it('renders table skeleton with default props', () => {
      render(<TableSkeleton />)
      
      const table = screen.getByTestId('table-skeleton')
      expect(table).toBeInTheDocument()
      expect(table).toHaveClass('w-full')
      
      // Check for header and body rows
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(6) // 1 header + 5 body rows
    })

    it('renders with custom number of rows', () => {
      render(<TableSkeleton rows={10} />)
      
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(11) // 1 header + 10 body rows
    })

    it('renders with custom number of columns', () => {
      render(<TableSkeleton columns={3} />)
      
      const headerCells = screen.getAllByRole('columnheader')
      expect(headerCells.length).toBe(3)
      
      const firstRow = screen.getAllByRole('row')[1] // First body row
      const cells = firstRow.querySelectorAll('td')
      expect(cells.length).toBe(3)
    })

    it('renders without header', () => {
      render(<TableSkeleton showHeader={false} />)
      
      const headerCells = screen.queryAllByRole('columnheader')
      expect(headerCells.length).toBe(0)
    })

    it('applies custom className', () => {
      render(<TableSkeleton className="custom-table-class" />)
      
      const table = screen.getByTestId('table-skeleton')
      expect(table).toHaveClass('custom-table-class')
    })
  })
})