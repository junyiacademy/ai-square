import { GET } from '../route'
import { NextRequest } from 'next/server'
import * as pblUserPrograms from '@/app/api/pbl/user-programs/route'

// Mock the pbl user-programs module
jest.mock('@/app/api/pbl/user-programs/route', () => ({
  GET: jest.fn()
}))

describe('/api/user/programs', () => {
  const mockPblGet = pblUserPrograms.GET as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delegate to pbl user-programs and return response', async () => {
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ programs: [] }),
      status: 200
    }
    mockPblGet.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/user/programs')
    const response = await GET(request)
    const data = await response.json()

    expect(mockPblGet).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
    expect(data).toEqual({ programs: [] })
  })

  it('should handle json parsing errors gracefully', async () => {
    const mockResponse = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      status: 500
    }
    mockPblGet.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/user/programs')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ success: false })
  })

  it('should pass through successful response from pbl', async () => {
    const mockPrograms = [
      { id: '1', title: 'Program 1' },
      { id: '2', title: 'Program 2' }
    ]
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ programs: mockPrograms, success: true }),
      status: 200
    }
    mockPblGet.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/user/programs?userId=test@example.com')
    const response = await GET(request)
    const data = await response.json()

    expect(mockPblGet).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
    expect(data.programs).toEqual(mockPrograms)
    expect(data.success).toBe(true)
  })

  it('should handle error responses from pbl', async () => {
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ error: 'Not found' }),
      status: 404
    }
    mockPblGet.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/user/programs')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })
})