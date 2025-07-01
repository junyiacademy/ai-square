import { renderHook, act } from '@testing-library/react'
import { useAuthenticatedFetch } from '../useAuthenticatedFetch'
import { getTokenManager } from '@/lib/auth/token-manager'

// Mock the token manager module
jest.mock('@/lib/auth/token-manager', () => ({
  getTokenManager: jest.fn()
}))

describe('useAuthenticatedFetch', () => {
  const mockAuthenticatedFetch = jest.fn()
  const mockTokenManager = {
    authenticatedFetch: mockAuthenticatedFetch
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getTokenManager as jest.Mock).mockReturnValue(mockTokenManager)
  })

  it('should return a function', () => {
    const { result } = renderHook(() => useAuthenticatedFetch())
    
    expect(typeof result.current).toBe('function')
  })

  it('should call tokenManager.authenticatedFetch with correct arguments', async () => {
    const url = 'https://api.example.com/data'
    const options = {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    }

    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success' })
    })

    const { result } = renderHook(() => useAuthenticatedFetch())

    await act(async () => {
      await result.current(url, options)
    })

    expect(getTokenManager).toHaveBeenCalled()
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(url, options)
  })

  it('should call tokenManager.authenticatedFetch without options', async () => {
    const url = 'https://api.example.com/data'

    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success' })
    })

    const { result } = renderHook(() => useAuthenticatedFetch())

    await act(async () => {
      await result.current(url)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(url, undefined)
  })

  it('should return the response from authenticatedFetch', async () => {
    const url = 'https://api.example.com/data'
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    }

    mockAuthenticatedFetch.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuthenticatedFetch())

    let response: any
    await act(async () => {
      response = await result.current(url)
    })

    expect(response).toBe(mockResponse)
  })

  it('should handle errors from authenticatedFetch', async () => {
    const url = 'https://api.example.com/data'
    const mockError = new Error('Network error')

    mockAuthenticatedFetch.mockRejectedValue(mockError)

    const { result } = renderHook(() => useAuthenticatedFetch())

    await expect(result.current(url)).rejects.toThrow('Network error')
  })

  it('should maintain stable function reference', () => {
    const { result, rerender } = renderHook(() => useAuthenticatedFetch())
    
    const firstRender = result.current
    
    rerender()
    
    const secondRender = result.current
    
    expect(firstRender).toBe(secondRender)
  })

  it('should work with different HTTP methods', async () => {
    const url = 'https://api.example.com/resource'
    
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    const { result } = renderHook(() => useAuthenticatedFetch())

    // Test GET
    await act(async () => {
      await result.current(url, { method: 'GET' })
    })
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(url, { method: 'GET' })

    // Test POST
    await act(async () => {
      await result.current(url, { method: 'POST', body: '{}' })
    })
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(url, { method: 'POST', body: '{}' })

    // Test PUT
    await act(async () => {
      await result.current(url, { method: 'PUT', body: '{}' })
    })
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(url, { method: 'PUT', body: '{}' })

    // Test DELETE
    await act(async () => {
      await result.current(url, { method: 'DELETE' })
    })
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(url, { method: 'DELETE' })
  })

  it('should pass through custom headers', async () => {
    const url = 'https://api.example.com/data'
    const customHeaders = {
      'X-Custom-Header': 'custom-value',
      'Authorization': 'Bearer custom-token'
    }

    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    const { result } = renderHook(() => useAuthenticatedFetch())

    await act(async () => {
      await result.current(url, { headers: customHeaders })
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(url, { headers: customHeaders })
  })

  it('should handle non-ok responses', async () => {
    const url = 'https://api.example.com/data'
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Unauthorized' })
    }

    mockAuthenticatedFetch.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuthenticatedFetch())

    let response: any
    await act(async () => {
      response = await result.current(url)
    })

    expect(response.ok).toBe(false)
    expect(response.status).toBe(401)
  })

  it('should work with FormData', async () => {
    const url = 'https://api.example.com/upload'
    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'test.txt')

    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uploaded: true })
    })

    const { result } = renderHook(() => useAuthenticatedFetch())

    await act(async () => {
      await result.current(url, {
        method: 'POST',
        body: formData
      })
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      body: formData
    })
  })
})