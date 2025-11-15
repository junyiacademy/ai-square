import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db/pool', () => ({
  query: jest.fn(),
  getPool: () => ({
    query: jest.fn(),
    connect: jest.fn(),
  }),
}));

// 更完整的 Vertex AI 模擬
jest.mock('@google-cloud/vertexai', () => {
  class MockModel {
    async generateContent(_: any) {
      return {
        response: {
          candidates: [
            { content: { parts: [{ text: '```json\n{"title":"翻譯後"}\n```' }] } }
          ]
        }
      };
    }
  }
  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      preview: { getGenerativeModel: () => new MockModel() }
    }))
  };
});

describe('API Route: src/app/api/discovery/translate (extended)', () => {
  describe('GET basics', () => {
    it('should list supported locales and running status', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toMatch(/running/i);
      expect(Array.isArray(data.supportedLocales)).toBe(true);
      expect(data.supportedLocales).toContain('en');
    });
  });

  describe('POST behavior', () => {
    it('returns 400 for unsupported locale', async () => {
      const req = new NextRequest('http://localhost/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: { title: 'Test' },
          sourceLocale: 'xx',
          targetLocale: 'en'
        })
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Unsupported locale/i);
    });

    it('returns original content when source and target locales are same', async () => {
      const original = { title: 'Same' };
      const req = new NextRequest('http://localhost/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({ content: original, sourceLocale: 'en', targetLocale: 'en' })
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.translatedContent).toEqual(original);
    });

    it('parses Vertex AI code-block JSON and returns translatedContent', async () => {
      const req = new NextRequest('http://localhost/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: { title: '原文' },
          sourceLocale: 'zh-TW',
          targetLocale: 'en'
        })
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.translatedContent).toEqual({ title: '翻譯後' });
    });

    it('returns original content when JSON parsing fails', async () => {
      // 暫時覆寫模型回傳讓其產生不可解析字串
      const { VertexAI } = jest.requireMock('@google-cloud/vertexai');
      (VertexAI as jest.Mock).mockImplementationOnce(() => ({
        preview: {
          getGenerativeModel: () => ({
            generateContent: async () => ({ response: { candidates: [{ content: { parts: [{ text: 'not json' }] } }] } })
          })
        }
      }));

      const original = { description: '原文描述' };
      const req = new NextRequest('http://localhost/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({ content: original, sourceLocale: 'zh-TW', targetLocale: 'en' })
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.translatedContent).toEqual(original);
    });

    it('returns 500 when Vertex AI throws', async () => {
      const { VertexAI } = jest.requireMock('@google-cloud/vertexai');
      (VertexAI as jest.Mock).mockImplementationOnce(() => ({
        preview: {
          getGenerativeModel: () => ({
            generateContent: async () => { throw new Error('vertex down'); }
          })
        }
      }));

      const req = new NextRequest('http://localhost/api/discovery/translate', {
        method: 'POST',
        body: JSON.stringify({ content: { title: 'x' }, sourceLocale: 'en', targetLocale: 'es' })
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/Translation failed/i);
    });
  });
});
