/**
 * Legal Consent API Route Tests
 * 測試法律同意 API
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db/get-pool';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/db/get-pool');

// Mock console methods
const mockConsoleError = createMockConsoleError();

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe('/api/legal/consent', () => {
  let mockPool: {
    query: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPool = {
      query: jest.fn()
    };
    
    mockGetPool.mockReturnValue(mockPool as any);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  const createMockRequest = (body?: unknown): NextRequest => {
    return new NextRequest('http://localhost:3000/api/legal/consent', {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser',
      },
    });
  };

  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com',
      name: 'Test User'
    , role: 'student' }
  };

  describe('POST - Record Consent', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockGetSession.mockResolvedValue(null);

        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Not authenticated'
        });
      });

      it('should return 401 when session has no user', async () => {
        mockGetSession.mockResolvedValue({} as any);

        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Not authenticated'
        });
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should return 400 for invalid document type', async () => {
        const request = createMockRequest({
          documentType: 'invalid_type',
          documentVersion: '1.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid enum value');
      });

      it('should return 400 for missing document version', async () => {
        const request = createMockRequest({
          documentType: 'privacy_policy',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Required');
      });

      it('should return 400 for missing consent field', async () => {
        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0'
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Required');
      });

      it('should return 400 when consent is false', async () => {
        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          consent: false
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({
          success: false,
          error: 'Consent is required'
        });
      });
    });

    describe('Document Validation', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should return 404 when document not found', async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '2.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({
          success: false,
          error: 'Document not found'
        });

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id FROM legal_documents WHERE type = $1 AND version = $2',
          ['privacy_policy', '2.0']
        );
      });
    });

    describe('Successful Consent Recording', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should successfully record consent for privacy policy', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 'doc-123' }] }) // Document lookup
          .mockResolvedValueOnce({ rows: [] }); // Insert consent

        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          message: 'Consent recorded successfully'
        });

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id FROM legal_documents WHERE type = $1 AND version = $2',
          ['privacy_policy', '1.0']
        );

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO user_consents'),
          [
            'user-123',
            'doc-123',
            'privacy_policy',
            '1.0',
            '192.168.1.1',
            'Mozilla/5.0 Test Browser',
            'click'
          ]
        );
      });

      it('should successfully record consent for terms of service', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 'doc-456' }] })
          .mockResolvedValueOnce({ rows: [] });

        const request = createMockRequest({
          documentType: 'terms_of_service',
          documentVersion: '2.1',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          success: true,
          message: 'Consent recorded successfully'
        });
      });

      it('should handle missing IP headers gracefully', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 'doc-123' }] })
          .mockResolvedValueOnce({ rows: [] });

        const request = new NextRequest('http://localhost:3000/api/legal/consent', {
          method: 'POST',
          body: JSON.stringify({
            documentType: 'privacy_policy',
            documentVersion: '1.0',
            consent: true
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        // Should pass null for IP and user agent
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO user_consents'),
          [
            'user-123',
            'doc-123',
            'privacy_policy',
            '1.0',
            null, // No IP headers
            null, // No user agent
            'click'
          ]
        );
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should handle database errors', async () => {
        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValue(dbError);

        const request = createMockRequest({
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          consent: true
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          success: false,
          error: 'Failed to record consent'
        });

        expect(mockConsoleError).toHaveBeenCalledWith('Record consent error:', dbError);
      });

      it('should handle JSON parsing errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/legal/consent', {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          success: false,
          error: 'Failed to record consent'
        });
      });
    });
  });

  describe('GET - Retrieve Consents', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockGetSession.mockResolvedValue(null);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          success: false,
          error: 'Not authenticated'
        });
      });
    });

    describe('Successful Retrieval', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should return user consents and required consents', async () => {
        const userConsents = [
          {
            document_type: 'privacy_policy',
            document_version: '1.0',
            consented_at: '2025-01-01T00:00:00Z',
            title: 'Privacy Policy',
            effective_date: '2025-01-01T00:00:00Z'
          }
        ];

        const latestDocs = [
          {
            type: 'privacy_policy',
            version: '1.1',
            title: 'Privacy Policy',
            effective_date: '2025-02-01T00:00:00Z'
          },
          {
            type: 'terms_of_service',
            version: '1.0',
            title: 'Terms of Service',
            effective_date: '2025-01-01T00:00:00Z'
          }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: userConsents })
          .mockResolvedValueOnce({ rows: latestDocs });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.consents).toHaveLength(1);
        expect(data.consents[0]).toMatchObject({
          type: 'privacy_policy',
          version: '1.0',
          title: 'Privacy Policy'
        });
        
        expect(data.requiresConsent).toHaveLength(2);
        expect(data.requiresConsent).toContainEqual({
          type: 'privacy_policy',
          version: '1.1',
          title: 'Privacy Policy',
          effectiveDate: '2025-02-01T00:00:00Z'
        });
        expect(data.requiresConsent).toContainEqual({
          type: 'terms_of_service',
          version: '1.0',
          title: 'Terms of Service',
          effectiveDate: '2025-01-01T00:00:00Z'
        });
      });

      it('should return empty arrays when no data exists', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.consents).toEqual([]);
        expect(data.requiresConsent).toEqual([]);
      });

      it('should correctly identify documents not requiring consent', async () => {
        const userConsents = [
          {
            document_type: 'privacy_policy',
            document_version: '1.0',
            consented_at: '2025-01-01T00:00:00Z',
            title: 'Privacy Policy',
            effective_date: '2025-01-01T00:00:00Z'
          },
          {
            document_type: 'terms_of_service',
            document_version: '1.0',
            consented_at: '2025-01-01T00:00:00Z',
            title: 'Terms of Service',
            effective_date: '2025-01-01T00:00:00Z'
          }
        ];

        const latestDocs = [
          {
            type: 'privacy_policy',
            version: '1.0', // Same version as consented
            title: 'Privacy Policy',
            effective_date: '2025-01-01T00:00:00Z'
          },
          {
            type: 'terms_of_service',
            version: '1.0', // Same version as consented
            title: 'Terms of Service',
            effective_date: '2025-01-01T00:00:00Z'
          }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: userConsents })
          .mockResolvedValueOnce({ rows: latestDocs });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.consents).toHaveLength(2);
        expect(data.requiresConsent).toEqual([]); // No new consent required
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(mockSession as any);
      });

      it('should handle database errors', async () => {
        const dbError = new Error('Database query failed');
        mockPool.query.mockRejectedValue(dbError);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          success: false,
          error: 'Failed to get consents'
        });

        expect(mockConsoleError).toHaveBeenCalledWith('Get consents error:', dbError);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle POST request followed by GET request', async () => {
      mockGetSession.mockResolvedValue(mockSession as any);

      // First POST request
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'doc-123' }] }) // Document lookup
        .mockResolvedValueOnce({ rows: [] }); // Insert consent

      const postRequest = createMockRequest({
        documentType: 'privacy_policy',
        documentVersion: '1.0',
        consent: true
      });

      const postResponse = await POST(postRequest);
      expect(postResponse.status).toBe(200);

      // Then GET request
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User consents
        .mockResolvedValueOnce({ rows: [] }); // Latest docs

      const getResponse = await GET();
      expect(getResponse.status).toBe(200);
    });
  });
});