import { POST } from '../route'
import * as vertexAI from '@/lib/vertex-ai'

// Mock vertex-ai functions
jest.mock('@/lib/vertex-ai')

describe('/api/ai/assist', () => {
  const mockCompleteYAMLContent = vertexAI.completeYAMLContent as jest.MockedFunction<typeof vertexAI.completeYAMLContent>
  const mockTranslateYAMLContent = vertexAI.translateYAMLContent as jest.MockedFunction<typeof vertexAI.translateYAMLContent>
  const mockImproveYAMLContent = vertexAI.improveYAMLContent as jest.MockedFunction<typeof vertexAI.improveYAMLContent>
  const mockMapKSAContent = vertexAI.mapKSAContent as jest.MockedFunction<typeof vertexAI.mapKSAContent>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - complete action', () => {
    it('should complete YAML content successfully', async () => {
      const completedContent = 'scenario_info:\\n  title: Completed Scenario\\n  description: AI-generated description'
      mockCompleteYAMLContent.mockResolvedValue(completedContent)

      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          content: 'scenario_info:\\n  title: Basic Scenario',
          context: 'Educational AI scenario'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBe(completedContent)
      expect(mockCompleteYAMLContent).toHaveBeenCalledWith(
        'scenario_info:\\n  title: Basic Scenario',
        'Educational AI scenario'
      )
    })
  })

  describe('POST - translate action', () => {
    it('should translate YAML content successfully', async () => {
      const translatedContent = 'scenario_info:\\n  title: Test\\n  title_zh: 測試'
      mockTranslateYAMLContent.mockResolvedValue(translatedContent)

      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          content: 'scenario_info:\\n  title: Test'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBe(translatedContent)
      expect(mockTranslateYAMLContent).toHaveBeenCalledWith('scenario_info:\\n  title: Test')
    })
  })

  describe('POST - improve action', () => {
    it('should improve YAML content successfully', async () => {
      const improvedContent = 'scenario_info:\\n  title: Enhanced Learning Scenario'
      mockImproveYAMLContent.mockResolvedValue(improvedContent)

      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          content: 'scenario_info:\\n  title: Basic Scenario'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBe(improvedContent)
      expect(mockImproveYAMLContent).toHaveBeenCalledWith('scenario_info:\\n  title: Basic Scenario')
    })
  })

  describe('POST - map-ksa action', () => {
    it('should map KSA content successfully', async () => {
      const mappedContent = 'scenario_info:\\n  title: Test\\nksa_mapping:\\n  knowledge: [K1.1]'
      mockMapKSAContent.mockResolvedValue(mappedContent)

      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'map-ksa',
          content: 'scenario_info:\\n  title: Test'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBe(mappedContent)
      expect(mockMapKSAContent).toHaveBeenCalledWith('scenario_info:\\n  title: Test')
    })
  })

  describe('POST - error handling', () => {
    it('should handle missing required fields', async () => {
      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete'
          // missing content
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Action and content are required')
    })

    it('should handle invalid action', async () => {
      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalid-action',
          content: 'test content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action. Supported actions: complete, translate, improve, map-ksa')
    })

    it('should handle AI service errors', async () => {
      mockCompleteYAMLContent.mockRejectedValue(new Error('AI service unavailable'))

      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          content: 'test content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('AI assistance failed')
    })

    it('should handle invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
    })
  })
})
