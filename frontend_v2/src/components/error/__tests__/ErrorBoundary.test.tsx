import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'
import { getErrorTracker } from '@/lib/error-tracking/error-tracker'

// Mock the error tracker
jest.mock('@/lib/error-tracking/error-tracker', () => ({
  getErrorTracker: jest.fn(() => ({
    captureError: jest.fn()
  }))
}))

// Mock console methods to avoid noise in tests
const originalError = console.error
const originalGroup = console.group
const originalGroupEnd = console.groupEnd

beforeAll(() => {
  console.error = jest.fn()
  console.group = jest.fn()
  console.groupEnd = jest.fn()
})

afterAll(() => {
  console.error = originalError
  console.group = originalGroup
  console.groupEnd = originalGroupEnd
})

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="no-error">No error occurred</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="test-content">Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('出現了一些問題')).toBeInTheDocument()
    expect(screen.getByText('抱歉，這個部分無法正常顯示。我們已經記錄了這個問題，並會盡快修復。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新載入頁面' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = (error: Error, errorInfo: React.ErrorInfo) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
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

  it('resets error state when retry is clicked but still shows error if component throws again', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('出現了一些問題')).toBeInTheDocument()

    // Click retry - this resets the internal state but component will throw again
    fireEvent.click(screen.getByRole('button', { name: '重試' }))

    // Component still throws error, so error UI is still shown
    expect(screen.getByText('出現了一些問題')).toBeInTheDocument()
  })

  it('renders reload button that can be clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: '重新載入頁面' })
    expect(reloadButton).toBeInTheDocument()
    
    // Should not throw when clicked
    fireEvent.click(reloadButton)
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
      expect.objectContaining({
        componentStack: expect.any(String)
      })
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

    expect(console.group).toHaveBeenCalledWith('🚨 React Error Boundary')
    expect(console.error).toHaveBeenCalledWith('Error:', expect.any(Error))
    expect(console.error).toHaveBeenCalledWith('Error Info:', expect.any(Object))
    expect(console.groupEnd).toHaveBeenCalled()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('shows error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('顯示錯誤詳細信息 (開發模式)')).toBeInTheDocument()
    // Click to expand details
    fireEvent.click(screen.getByText('顯示錯誤詳細信息 (開發模式)'))
    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('does not show error details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('顯示錯誤詳細信息 (開發模式)')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('tracks error with different levels', () => {
    const mockErrorTracker = { captureError: jest.fn() }
    ;(getErrorTracker as jest.Mock).mockReturnValue(mockErrorTracker)

    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'ErrorBoundary',
        action: 'react_error_boundary',
        level: 'page',
        componentStack: expect.any(String),
        errorBoundary: true
      }),
      'high'
    )
  })

  it('uses default level when not specified', () => {
    const mockErrorTracker = { captureError: jest.fn() }
    ;(getErrorTracker as jest.Mock).mockReturnValue(mockErrorTracker)

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(mockErrorTracker.captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        level: 'component'
      }),
      'high'
    )
  })

  it('provides error info to fallback component', () => {
    const error = new Error('Detailed error message')
    const ErrorComponent = () => {
      throw error
    }

    render(
      <ErrorBoundary
        fallback={(error, errorInfo) => (
          <div>
            <div>Error: {error?.message}</div>
            <div>Has error info: {errorInfo ? 'Yes' : 'No'}</div>
            <div>Stack: {errorInfo?.componentStack ? 'Present' : 'Missing'}</div>
          </div>
        )}
      >
        <ErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Detailed error message')).toBeInTheDocument()
    expect(screen.getByText('Has error info: Yes')).toBeInTheDocument()
    expect(screen.getByText('Stack: Present')).toBeInTheDocument()
  })

  it('handles multiple children correctly', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('No error occurred')).toBeInTheDocument()
  })

  it('catches error from first child when multiple children exist', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
        <div>Child 2</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('出現了一些問題')).toBeInTheDocument()
    expect(screen.queryByText('Child 2')).not.toBeInTheDocument()
  })
})