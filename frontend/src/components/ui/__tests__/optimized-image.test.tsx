import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OptimizedImage } from '../optimized-image'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: jest.fn(({ alt, onLoad, onError, priority, placeholder, blurDataURL, ...props }) => {
    // Filter out Next.js specific props that shouldn't be on DOM elements
    const imgProps = {
      ...props,
      alt,
      onLoad,
      onError,
    }
    
    // Add loading attribute based on priority
    if (priority) {
      imgProps.loading = 'eager'
    } else if (props.loading) {
      imgProps.loading = props.loading
    }
    
    // Add placeholder and blurDataURL as data attributes for testing
    if (placeholder) {
      imgProps['data-placeholder'] = placeholder
    }
    if (blurDataURL) {
      imgProps['data-blur'] = blurDataURL
    }
    
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} />
  }),
}))

describe('OptimizedImage', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with required props', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/test-image.jpg')
  })

  it('renders with default dimensions', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('width', '400')
    expect(image).toHaveAttribute('height', '300')
  })

  it('renders with custom dimensions', () => {
    render(<OptimizedImage {...defaultProps} width={600} height={400} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('width', '600')
    expect(image).toHaveAttribute('height', '400')
  })

  it('shows loading state initially', () => {
    const { container } = render(<OptimizedImage {...defaultProps} />)
    
    // Check for the loading skeleton div
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('bg-gray-200')
  })

  it('hides loading state after image loads', async () => {
    const { container } = render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Check initial state
    expect(image).toHaveClass('opacity-0')
    
    // Simulate image load
    fireEvent.load(image)
    
    await waitFor(() => {
      expect(image).toHaveClass('opacity-100')
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).not.toBeInTheDocument()
    })
  })

  it('shows fallback image on error', async () => {
    render(<OptimizedImage {...defaultProps} fallback="/custom-fallback.png" />)
    
    const image = screen.getByAltText('Test image')
    
    // Simulate image error
    fireEvent.error(image)
    
    await waitFor(() => {
      expect(image).toHaveAttribute('src', '/custom-fallback.png')
    })
  })

  it('uses default fallback when not specified', async () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Simulate image error
    fireEvent.error(image)
    
    await waitFor(() => {
      expect(image).toHaveAttribute('src', '/images/placeholder.png')
    })
  })

  it('applies custom className to container', () => {
    const { container } = render(
      <OptimizedImage 
        {...defaultProps} 
        className="custom-image-class rounded-lg"
      />
    )
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('relative', 'custom-image-class', 'rounded-lg')
  })

  it('handles priority loading', () => {
    render(<OptimizedImage {...defaultProps} priority />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'eager')
  })

  it('uses lazy loading by default', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('always uses blur placeholder', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('data-placeholder', 'blur')
    // The component includes a hardcoded blurDataURL
    expect(image).toHaveAttribute('data-blur')
  })

  it('transitions opacity on load', async () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Initially opacity-0
    expect(image).toHaveClass('opacity-0', 'transition-opacity', 'duration-300')
    
    // Simulate load
    fireEvent.load(image)
    
    await waitFor(() => {
      expect(image).toHaveClass('opacity-100', 'transition-opacity', 'duration-300')
    })
  })

  it('removes loading state on error', async () => {
    const { container } = render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Initially has loading skeleton
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    
    // Simulate error
    fireEvent.error(image)
    
    await waitFor(() => {
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).not.toBeInTheDocument()
    })
  })
})