import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileEditor from '../FileEditor'

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe('FileEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  it('should render editor with no file selected', () => {
    render(<FileEditor selectedFile={null} />)

    expect(screen.getByText('Select a file to edit')).toBeInTheDocument()
  })

  it('should load and display file content', async () => {
    const mockContent = 'scenario_info:\\n  title: Test Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: mockContent }),
    } as Response)

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith('/api/content?path=test.yaml')
  })

  it('should handle file loading errors', async () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error('Network error')
    )

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByText('Error loading file')).toBeInTheDocument()
    })
  })

  it('should save file content', async () => {
    const mockContent = 'scenario_info:\\n  title: Test Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    // Modify content
    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'modified content' } })

    // Save file
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'test.yaml',
          content: 'modified content',
          message: 'Update test.yaml via CMS',
        }),
      })
    })

    expect(screen.getByText('File saved successfully!')).toBeInTheDocument()
  })

  it('should handle save errors', async () => {
    const mockContent = 'scenario_info:\\n  title: Test Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent }),
      } as Response)
      .mockRejectedValueOnce(new Error('Save failed'))

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Error saving file')).toBeInTheDocument()
    })
  })

  it('should use AI assistance', async () => {
    const mockContent = 'scenario_info:\\n  title: Basic Scenario'
    const mockImprovedContent = 'scenario_info:\\n  title: Enhanced Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, content: mockImprovedContent }),
      } as Response)

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    // Click AI Complete button
    fireEvent.click(screen.getByText('AI Complete'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          content: mockContent,
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockImprovedContent)).toBeInTheDocument()
    })
  })

  it('should handle AI assistance errors', async () => {
    const mockContent = 'scenario_info:\\n  title: Basic Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent }),
      } as Response)
      .mockRejectedValueOnce(new Error('AI service unavailable'))

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('AI Complete'))

    await waitFor(() => {
      expect(screen.getByText('AI assistance failed')).toBeInTheDocument()
    })
  })

  it('should show unsaved changes indicator', async () => {
    const mockContent = 'scenario_info:\\n  title: Test Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: mockContent }),
    } as Response)

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    // Modify content
    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'modified content' } })

    expect(screen.getByText('*')).toBeInTheDocument() // Unsaved indicator
  })

  it('should handle different AI actions', async () => {
    const mockContent = 'scenario_info:\\n  title: Basic Scenario'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, content: 'translated content' }),
      } as Response)

    render(<FileEditor selectedFile=\"test.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('AI Translate'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          content: mockContent,
        }),
      })
    })
  })

  it('should reload file content when selectedFile changes', async () => {
    const mockContent1 = 'file1 content'
    const mockContent2 = 'file2 content'

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: mockContent2 }),
      } as Response)

    const { rerender } = render(<FileEditor selectedFile=\"file1.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent1)).toBeInTheDocument()
    })

    rerender(<FileEditor selectedFile=\"file2.yaml\" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockContent2)).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
