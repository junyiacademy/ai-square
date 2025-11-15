import { formatKSACodesForPrompt } from '../ksa-codes-loader'

// Mock the KSA codes data
jest.mock('../../data/ksa-codes', () => ({
  KSA_CODES: {
    knowledge: {
      'K1.1': 'Understanding AI fundamentals',
      'K1.2': 'Recognizing AI applications',
      'K2.1': 'Data processing concepts',
      'K2.2': 'Algorithm basics'
    },
    skills: {
      'S1.1': 'Using AI tools effectively',
      'S1.2': 'Evaluating AI outputs',
      'S2.1': 'Data preparation skills',
    },
    attitudes: {
      'A1.1': 'Ethical AI usage',
      'A1.2': 'Critical thinking about AI',
      'A2.1': 'Responsible innovation',
      'A2.2': 'Collaborative AI development'
    }
  }
}))

describe('ksa-codes-loader utils', () => {
  describe('formatKSACodesForPrompt', () => {
    it('should format KSA codes into a readable prompt format', () => {
      const result = formatKSACodesForPrompt()

      // Check that the result contains the expected structure
      expect(result).toContain('KSA (Knowledge, Skills, Attitudes) Competency Codes Reference:')

      // Check Knowledge section
      expect(result).toContain('Knowledge (K):')
      expect(result).toContain('K1.1: Understanding AI fundamentals')
      expect(result).toContain('K1.2: Recognizing AI applications')
      expect(result).toContain('K2.1: Data processing concepts')
      expect(result).toContain('K2.2: Algorithm basics')

      // Check Skills section
      expect(result).toContain('Skills (S):')
      expect(result).toContain('S1.1: Using AI tools effectively')
      expect(result).toContain('S1.2: Evaluating AI outputs')
      expect(result).toContain('S2.1: Data preparation skills')

      // Check Attitudes section
      expect(result).toContain('Attitudes (A):')
      expect(result).toContain('A1.1: Ethical AI usage')
      expect(result).toContain('A1.2: Critical thinking about AI')
      expect(result).toContain('A2.1: Responsible innovation')
      expect(result).toContain('A2.2: Collaborative AI development')
    })

    it('should format codes in sorted order', () => {
      const result = formatKSACodesForPrompt()

      // Check that K1.1 comes before K1.2
      const k11Index = result.indexOf('K1.1:')
      const k12Index = result.indexOf('K1.2:')
      expect(k11Index).toBeLessThan(k12Index)

      // Check that K1.2 comes before K2.1
      const k21Index = result.indexOf('K2.1:')
      expect(k12Index).toBeLessThan(k21Index)

      // Check that Skills section comes after Knowledge section
      const knowledgeIndex = result.indexOf('Knowledge (K):')
      const skillsIndex = result.indexOf('Skills (S):')
      expect(knowledgeIndex).toBeLessThan(skillsIndex)

      // Check that Attitudes section comes after Skills section
      const attitudesIndex = result.indexOf('Attitudes (A):')
      expect(skillsIndex).toBeLessThan(attitudesIndex)
    })

    it('should include proper line formatting', () => {
      const result = formatKSACodesForPrompt()

      // Check that sections are separated by double newlines
      expect(result).toContain('\\n\\nKnowledge (K):')
      expect(result).toContain('\\n\\nSkills (S):')
      expect(result).toContain('\\n\\nAttitudes (A):')

      // Check that individual codes are separated by single newlines
      expect(result).toContain('K1.1: Understanding AI fundamentals\\n')
      expect(result).toContain('S1.1: Using AI tools effectively\\n')
      expect(result).toContain('A1.1: Ethical AI usage\\n')
    })

    it('should handle empty KSA codes gracefully', () => {
      // Temporarily mock empty KSA codes
      jest.doMock('../../data/ksa-codes', () => ({
        KSA_CODES: {
          knowledge: {},
          skills: {},
          attitudes: {}
        }
      }))

      // Re-import the function
      const { formatKSACodesForPrompt: emptyFormatter } = require('../ksa-codes-loader')

      const result = emptyFormatter()

      expect(result).toContain('KSA (Knowledge, Skills, Attitudes) Competency Codes Reference:')
      expect(result).toContain('Knowledge (K):')
      expect(result).toContain('Skills (S):')
      expect(result).toContain('Attitudes (A):')

      // Restore original mock
      jest.dontMock('../../data/ksa-codes')
    })

    it('should include usage guidelines', () => {
      const result = formatKSACodesForPrompt()

      expect(result).toContain('KSA (Knowledge, Skills, Attitudes) Competency Codes Reference:')

      // The function should provide clear structure for AI models to understand
      expect(result.split('\\n').length).toBeGreaterThan(10) // Should have multiple lines

      // Each section should be clearly marked
      const lines = result.split('\\n')
      const knowledgeLine = lines.find(line => line.includes('Knowledge (K):'))
      const skillsLine = lines.find(line => line.includes('Skills (S):'))
      const attitudesLine = lines.find(line => line.includes('Attitudes (A):'))

      expect(knowledgeLine).toBeDefined()
      expect(skillsLine).toBeDefined()
      expect(attitudesLine).toBeDefined()
    })

    it('should have consistent code format (letter + number + dot + number)', () => {
      const result = formatKSACodesForPrompt()

      // Check Knowledge codes format
      expect(result).toMatch(/K\\d+\\.\\d+:/g)

      // Check Skills codes format
      expect(result).toMatch(/S\\d+\\.\\d+:/g)

      // Check Attitudes codes format
      expect(result).toMatch(/A\\d+\\.\\d+:/g)
    })
  })
})
