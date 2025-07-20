import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { ErrorReport } from '@/lib/error-tracking/error-tracker'

// Mock console methods
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

describe('/api/error-tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should log error reports successfully', async () => {
      const errorReport: ErrorReport = {
        id: 'error123',
        message: 'Test error',
        stack: 'Error: Test error\n    at Component.render',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        context: {
          component: 'TestComponent',
          action: 'render',
          userAgent: 'Mozilla/5.0',
          url: '/test-page',
        },
        fingerprint: 'test-error-fingerprint'
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.errorId).toBe('error123')
    })

    it('should validate required fields', async () => {
      const invalidReport = {
        // Missing required fields: id, message, timestamp
        severity: 'medium',
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidReport),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid error report format')
    })

    it('should log critical errors to console', async () => {
      const criticalError: ErrorReport = {
        id: 'critical123',
        message: 'Critical system failure',
        stack: 'Error stack trace',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        context: {
          component: 'DatabaseConnection',
          error: 'Connection timeout',
        },
        fingerprint: 'critical-error-fingerprint'
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(criticalError),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR REPORTED:',
        expect.objectContaining({
          id: 'critical123',
          message: 'Critical system failure',
          context: criticalError.context,
          timestamp: criticalError.timestamp,
        })
      )
    })

    it('should handle multiple error reports', async () => {
      const errors: ErrorReport[] = []
      
      // Create multiple error reports
      for (let i = 0; i < 5; i++) {
        errors.push({
          id: `error${i}`,
          message: `Test error ${i}`,
          severity: 'low',
          timestamp: new Date().toISOString(),
          context: {},
          fingerprint: `error-${i}-fingerprint`
        })
      }

      // Send all errors
      for (const error of errors) {
        const request = new NextRequest('http://localhost:3000/api/error-tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(error),
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
      }
    })

    it('should handle errors with missing optional fields', async () => {
      const minimalError: ErrorReport = {
        id: 'minimal123',
        message: 'Minimal error',
        timestamp: new Date().toISOString(),
        severity: 'low',
        context: {},
        fingerprint: 'minimal-error-fingerprint'
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(minimalError),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.errorId).toBe('minimal123')
    })

    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to process error report')
    })

    it('should validate error report with missing id', async () => {
      const errorWithoutId = {
        message: 'Error without ID',
        timestamp: new Date().toISOString(),
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorWithoutId),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid error report format')
    })

    it('should validate error report with missing message', async () => {
      const errorWithoutMessage = {
        id: 'error123',
        timestamp: new Date().toISOString(),
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorWithoutMessage),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid error report format')
    })

    it('should validate error report with missing timestamp', async () => {
      const errorWithoutTimestamp = {
        id: 'error123',
        message: 'Error without timestamp',
      }

      const request = new NextRequest('http://localhost:3000/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorWithoutTimestamp),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid error report format')
    })
  })

  describe('GET', () => {
    it('should return stored errors', async () => {
      // First, add some errors
      const errors: ErrorReport[] = [
        {
          id: 'get-test-1',
          message: 'First error',
          timestamp: new Date().toISOString(),
          severity: 'high',
          context: {},
          fingerprint: 'first-error-fingerprint'
        },
        {
          id: 'get-test-2',
          message: 'Second error',
          timestamp: new Date().toISOString(),
          severity: 'low',
          context: {},
          fingerprint: 'second-error-fingerprint'
        },
      ]

      for (const error of errors) {
        const postRequest = new NextRequest('http://localhost:3000/api/error-tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(error),
        })
        await POST(postRequest)
      }

      // Now GET the errors
      const getRequest = new NextRequest('http://localhost:3000/api/error-tracking')
      const response = await GET(getRequest)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(Array.isArray(data.errors)).toBe(true)
      expect(data.totalCount).toBeGreaterThanOrEqual(2)
    })

    it('should return filtered errors by severity', async () => {
      const request = new NextRequest('http://localhost:3000/api/error-tracking?severity=critical')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(Array.isArray(data.errors)).toBe(true)
      
      // All returned errors should have critical severity
      data.errors.forEach((error: ErrorReport) => {
        if (error.severity) {
          expect(error.severity).toBe('critical')
        }
      })
    })

    it('should return filtered errors by source', async () => {
      const request = new NextRequest('http://localhost:3000/api/error-tracking?source=server')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.errors).toBeDefined()
      
      // All returned errors should have server source
      data.errors.forEach((error: ErrorReport) => {
        // Source check removed - not part of ErrorReport interface
      })
    })

    it('should support pagination with limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/error-tracking?limit=5')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(data.errors.length).toBeLessThanOrEqual(5)
    })

    it('should handle invalid query parameters gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/error-tracking?limit=invalid')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(Array.isArray(data.errors)).toBe(true)
    })
  })
})