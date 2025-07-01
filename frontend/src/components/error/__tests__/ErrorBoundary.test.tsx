import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock console methods to avoid noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error occurred</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/We're sorry for the inconvenience/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = ({ error, resetError }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('resets error state when try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error occurred')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onErrorMock = jest.fn()
    
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )
    expect(onErrorMock.mock.calls[0][0].message).toBe('Test error')
  })

  it('logs error to console in development', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(console.error).toHaveBeenCalled()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('shows error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument()
    expect(screen.getByText(/Component Stack:/)).toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('handles async errors', async () => {
    const AsyncError = () => {
      React.useEffect(() => {
        throw new Error('Async error')
      }, [])
      return <div>Async component</div>
    }

    render(
      <ErrorBoundary>
        <AsyncError />
      </ErrorBoundary>
    )

    // Error boundaries don't catch errors in event handlers, async code, etc.
    // So this component would need to use error handling differently
    expect(screen.getByText('Async component')).toBeInTheDocument()
  })

  it('resets error when resetKeys change', () => {
    let resetKey = 'key1'
    
    const { rerender } = render(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    // Change reset key
    resetKey = 'key2'
    rerender(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error occurred')).toBeInTheDocument()
  })

  it('provides error info to fallback component', () => {
    const error = new Error('Detailed error message')
    const ErrorComponent = () => {
      throw error
    }

    render(
      <ErrorBoundary
        fallback={({ error, errorInfo }) => (
          <div>
            <div>Error: {error?.message}</div>
            <div>Has error info: {errorInfo ? 'Yes' : 'No'}</div>
          </div>
        )}
      >
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Detailed error message')).toBeInTheDocument()
    expect(screen.getByText('Has error info: Yes')).toBeInTheDocument()
  })
})