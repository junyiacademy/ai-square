import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OptimizedImage } from '../optimized-image'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: jest.fn(({ alt, onLoad, onError, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} onLoad={onLoad} onError={onError} {...props} />
  }),
}))

describe('OptimizedImage', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image',
    width: 300,
    height: 200,
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

  it('shows loading skeleton initially', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const skeleton = screen.getByTestId('image-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('hides skeleton after image loads', async () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    const skeleton = screen.getByTestId('image-skeleton')
    
    expect(skeleton).toBeInTheDocument()
    
    // Simulate image load
    fireEvent.load(image)
    
    await waitFor(() => {
      expect(skeleton).not.toBeInTheDocument()
    })
  })

  it('shows fallback on error', async () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Simulate image error
    fireEvent.error(image)
    
    await waitFor(() => {
      const fallback = screen.getByTestId('image-fallback')
      expect(fallback).toBeInTheDocument()
      expect(fallback).toHaveTextContent('Failed to load image')
    })
  })

  it('renders with custom fallback', async () => {
    const CustomFallback = () => <div>Custom error message</div>
    
    render(
      <OptimizedImage 
        {...defaultProps} 
        fallback={<CustomFallback />}
      />
    )
    
    const image = screen.getByAltText('Test image')
    fireEvent.error(image)
    
    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    render(
      <OptimizedImage 
        {...defaultProps} 
        className="custom-image-class rounded-lg"
      />
    )
    
    const container = screen.getByTestId('image-container')
    expect(container).toHaveClass('custom-image-class', 'rounded-lg')
  })

  it('handles priority loading', () => {
    render(<OptimizedImage {...defaultProps} priority />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('priority', 'true')
  })

  it('supports different object fit options', () => {
    render(<OptimizedImage {...defaultProps} objectFit="contain" />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveStyle({ objectFit: 'contain' })
  })

  it('handles responsive sizes', () => {
    render(
      <OptimizedImage 
        {...defaultProps} 
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    )
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute(
      'sizes', 
      '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
    )
  })

  it('supports lazy loading by default', () => {
    render(<OptimizedImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('disables lazy loading when priority is set', () => {
    render(<OptimizedImage {...defaultProps} priority />)
    
    const image = screen.getByAltText('Test image')
    expect(image).not.toHaveAttribute('loading', 'lazy')
  })

  it('handles blur placeholder', () => {
    render(
      <OptimizedImage 
        {...defaultProps} 
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
      />
    )
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('placeholder', 'blur')
    expect(image).toHaveAttribute('blurDataURL', 'data:image/jpeg;base64,...')
  })

  it('calls onLoad callback when provided', async () => {
    const onLoadMock = jest.fn()
    
    render(<OptimizedImage {...defaultProps} onLoad={onLoadMock} />)
    
    const image = screen.getByAltText('Test image')
    fireEvent.load(image)
    
    await waitFor(() => {
      expect(onLoadMock).toHaveBeenCalled()
    })
  })

  it('calls onError callback when provided', async () => {
    const onErrorMock = jest.fn()
    
    render(<OptimizedImage {...defaultProps} onError={onErrorMock} />)
    
    const image = screen.getByAltText('Test image')
    fireEvent.error(image)
    
    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalled()
    })
  })
})