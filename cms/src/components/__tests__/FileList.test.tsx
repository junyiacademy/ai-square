import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileList from '../FileList'

// Mock fetch
global.fetch = jest.fn()

describe('FileList', () => {
  const mockOnFileSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  it('should render loading state initially', () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<FileList onFileSelect={mockOnFileSelect} />)
    
    expect(screen.getByText('Loading files...')).toBeInTheDocument()
  })

  it('should render files list after loading', async () => {
    const mockFiles = [
      { name: 'scenario1.yaml', type: 'file', path: 'scenario1.yaml' },
      { name: 'scenario2.yaml', type: 'file', path: 'scenario2.yaml' },
      { name: 'subdirectory', type: 'dir', path: 'subdirectory' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('scenario1.yaml')).toBeInTheDocument()
      expect(screen.getByText('scenario2.yaml')).toBeInTheDocument()
      expect(screen.getByText('subdirectory')).toBeInTheDocument()
    })
  })

  it('should handle file selection', async () => {
    const mockFiles = [
      { name: 'scenario1.yaml', type: 'file', path: 'scenario1.yaml' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('scenario1.yaml')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('scenario1.yaml'))
    
    expect(mockOnFileSelect).toHaveBeenCalledWith('scenario1.yaml')
  })

  it('should handle directory navigation', async () => {
    const mockFiles = [
      { name: 'subdirectory', type: 'dir', path: 'subdirectory' },
    ]

    const mockSubFiles = [
      { name: 'subfile.yaml', type: 'file', path: 'subdirectory/subfile.yaml' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockFiles }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: mockSubFiles }),
      } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('subdirectory')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('subdirectory'))

    await waitFor(() => {
      expect(screen.getByText('subfile.yaml')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith('/api/files?directory=subdirectory')
  })

  it('should handle back navigation', async () => {
    const mockSubFiles = [
      { name: 'subfile.yaml', type: 'file', path: 'subdirectory/subfile.yaml' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockSubFiles }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} currentDirectory="subdirectory" />)

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument()
    })

    const mockRootFiles = [
      { name: 'scenario1.yaml', type: 'file', path: 'scenario1.yaml' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: mockRootFiles }),
    } as Response)

    fireEvent.click(screen.getByText('← Back'))

    await waitFor(() => {
      expect(screen.getByText('scenario1.yaml')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors', async () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error('Network error')
    )

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Error loading files')).toBeInTheDocument()
    })
  })

  it('should handle API errors', async () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error' }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Error loading files')).toBeInTheDocument()
    })
  })

  it('should display empty state when no files', async () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('No files found')).toBeInTheDocument()
    })
  })

  it('should refresh files list', async () => {
    const mockFiles = [
      { name: 'scenario1.yaml', type: 'file', path: 'scenario1.yaml' },
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ files: mockFiles }),
    } as Response)

    render(<FileList onFileSelect={mockOnFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('scenario1.yaml')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})