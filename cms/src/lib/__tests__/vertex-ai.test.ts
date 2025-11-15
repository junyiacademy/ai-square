import * as vertexAI from '../vertex-ai'

// Mock VertexAI
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
  SchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
    NUMBER: 'number',
  },
}))

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn(),
}))

jest.mock('js-yaml', () => ({
  load: jest.fn(),
  dump: jest.fn(),
}))

jest.mock('../utils/yaml-order', () => ({
  sortPBLScenario: jest.fn((data) => data),
}))

jest.mock('../utils/ksa-codes-loader', () => ({
  formatKSACodesForPrompt: jest.fn(() => 'KSA Codes Reference'),
}))

describe('Vertex AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the module to clear any cached instances
    jest.resetModules()
  })

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const { VertexAI } = require('@google-cloud/vertexai')
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Generated content' }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { generateContent } = require('../vertex-ai')
      const result = await generateContent('Test prompt')

      expect(result).toBe('Generated content')
      expect(mockGenerateContent).toHaveBeenCalledWith('Test prompt')
    })

    it('should handle system prompt', async () => {
      const { VertexAI } = require('@google-cloud/vertexai')
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Generated content with system prompt' }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { generateContent } = require('../vertex-ai')
      await generateContent('Test prompt', 'System prompt')

      expect(mockGenerateContent).toHaveBeenCalledWith('System prompt\\n\\nUser: Test prompt')
    })

    it('should handle generation errors', async () => {
      const { VertexAI } = require('@google-cloud/vertexai')
      const mockGenerateContent = jest.fn().mockRejectedValue(new Error('AI Error'))

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { generateContent } = require('../vertex-ai')

      await expect(generateContent('Test prompt')).rejects.toThrow('Failed to generate content')
    })

    it('should handle empty response', async () => {
      const { VertexAI } = require('@google-cloud/vertexai')
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: []
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { generateContent } = require('../vertex-ai')
      const result = await generateContent('Test prompt')

      expect(result).toBe('')
    })
  })

  describe('completeYAMLContent', () => {
    it('should complete YAML content successfully', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockReturnValue({
        scenario_info: { id: 'test', title: 'Test Scenario' }
      })
      yaml.dump.mockReturnValue('completed: yaml\\ncontent: true')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({
                scenario_info: {
                  id: 'test',
                  title: 'Test Scenario',
                  description: 'Completed description'
                },
                tasks: []
              }) }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { completeYAMLContent } = require('../vertex-ai')
      const result = await completeYAMLContent('scenario_info:\\n  id: test')

      expect(result).toBe('completed: yaml\\ncontent: true')
      expect(yaml.load).toHaveBeenCalled()
      expect(yaml.dump).toHaveBeenCalled()
    })

    it('should handle invalid YAML input', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML')
      })
      yaml.dump.mockReturnValue('completed: yaml\\ncontent: true')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({
                scenario_info: { id: 'new', title: 'New Scenario' },
                tasks: []
              }) }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { completeYAMLContent } = require('../vertex-ai')
      const result = await completeYAMLContent('invalid: yaml: content')

      expect(result).toBe('completed: yaml\\ncontent: true')
    })

    it('should fallback to non-JSON mode on error', async () => {
      const { VertexAI } = require('@google-cloud/vertexai')

      const mockGenerateContent = jest.fn()
        .mockRejectedValueOnce(new Error('JSON mode failed'))
        .mockResolvedValueOnce({
          response: {
            candidates: [{
              content: {
                parts: [{ text: 'fallback: yaml\\ncontent: true' }]
              }
            }]
          }
        })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { completeYAMLContent } = require('../vertex-ai')
      const result = await completeYAMLContent('test: yaml')

      expect(result).toBe('fallback: yaml\\ncontent: true')
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    })
  })

  describe('translateYAMLContent', () => {
    it('should translate YAML content', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockReturnValue({
        scenario_info: {
          title: 'Test Scenario',
          description: 'Test description'
        }
      })
      yaml.dump.mockReturnValue('translated: yaml\\ncontent: true')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({
                scenario_info: {
                  title: 'Test Scenario',
                  title_zh: '測試情境',
                  description: 'Test description',
                  description_zh: '測試描述'
                }
              }) }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { translateYAMLContent } = require('../vertex-ai')
      const result = await translateYAMLContent('scenario_info:\\n  title: Test')

      expect(result).toBe('translated: yaml\\ncontent: true')
    })
  })

  describe('improveYAMLContent', () => {
    it('should improve YAML content', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockReturnValue({
        scenario_info: {
          title: 'Basic Scenario'
        }
      })
      yaml.dump.mockReturnValue('improved: yaml\\ncontent: true')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({
                scenario_info: {
                  title: 'Enhanced Scenario with Better Learning Outcomes'
                }
              }) }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { improveYAMLContent } = require('../vertex-ai')
      const result = await improveYAMLContent('scenario_info:\\n  title: Basic')

      expect(result).toBe('improved: yaml\\ncontent: true')
    })
  })

  describe('mapKSAContent', () => {
    it('should map KSA codes successfully', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      const testScenario = {
        scenario_info: {
          title: 'AI Ethics Scenario',
          learning_objectives: ['Understand AI bias', 'Learn fairness principles']
        },
        tasks: []
      }

      yaml.load.mockReturnValue(testScenario)
      yaml.dump.mockReturnValue('mapped: yaml\\nksa_mapping:\\n  knowledge: [K1.1]')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({
                ksa_mapping: {
                  knowledge: ['K1.1', 'K2.3'],
                  skills: ['S1.2', 'S3.1'],
                  attitudes: ['A1.1', 'A2.2']
                }
              }) }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { mapKSAContent } = require('../vertex-ai')
      const result = await mapKSAContent('scenario_info:\\n  title: AI Ethics')

      expect(result).toBe('mapped: yaml\\nksa_mapping:\\n  knowledge: [K1.1]')
    })

    it('should handle malformed JSON response', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockReturnValue({ scenario_info: { title: 'Test' } })
      yaml.dump.mockReturnValue('fallback: yaml')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'invalid json response' }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { mapKSAContent } = require('../vertex-ai')
      const result = await mapKSAContent('scenario_info:\\n  title: Test')

      expect(result).toBe('fallback: yaml')
    })

    it('should extract JSON from markdown code blocks', async () => {
      const yaml = require('js-yaml')
      const { VertexAI } = require('@google-cloud/vertexai')

      yaml.load.mockReturnValue({ scenario_info: { title: 'Test' } })
      yaml.dump.mockReturnValue('extracted: yaml')

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{ text: '```json\\n{"ksa_mapping": {"knowledge": ["K1.1"], "skills": ["S1.1"], "attitudes": ["A1.1"]}}\\n```' }]
            }
          }]
        }
      })

      VertexAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      }))

      const { mapKSAContent } = require('../vertex-ai')
      const result = await mapKSAContent('scenario_info:\\n  title: Test')

      expect(result).toBe('extracted: yaml')
    })
  })
})
