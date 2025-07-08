import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock localStorage before importing ThemeContext
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

import { ThemeProvider, useTheme } from '../ThemeContext'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Test component that uses the theme hook
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
  })

  it('should provide theme context to children', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toBeInTheDocument()
  })

  it('should use system preference when no saved preference exists', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('should use saved theme preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('should toggle theme when toggleTheme is called', async () => {
    const user = userEvent.setup()
    localStorageMock.getItem.mockReturnValue('light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')

    await act(async () => {
      await user.click(screen.getByText('Toggle Theme'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-square-theme', 'dark')
  })

  it('should toggle from dark to light', async () => {
    const user = userEvent.setup()
    localStorageMock.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')

    await act(async () => {
      await user.click(screen.getByText('Toggle Theme'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-square-theme', 'light')
  })

  it('should apply theme class to document element', () => {
    localStorageMock.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should remove dark class when theme is light', () => {
    localStorageMock.getItem.mockReturnValue('light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should throw error when useTheme is used outside of ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })
})