import { sortPBLScenario } from '../yaml-order'

describe('yaml-order utils', () => {
  describe('sortPBLScenario', () => {
    it('should sort scenario fields in correct order', () => {
      const input = {
        tasks: [
          {
            id: 'task1',
            resources: ['resource1'],
            title: 'Task 1',
            description: 'Task description',
            category: 'analysis' as const,
            instructions: ['instruction1'],
            expected_outcome: 'outcome1'
          }
        ],
        ksa_mapping: {
          attitudes: ['A1.1'],
          knowledge: ['K1.1'],
          skills: ['S1.1']
        },
        scenario_info: {
          id: 'test-scenario',
          learning_objectives: ['objective1'],
          title: 'Test Scenario',
          description: 'Test description',
          difficulty: 'beginner' as const,
          estimated_duration: 60,
          target_domains: ['engaging_with_ai' as const],
          prerequisites: ['prerequisite1']
        }
      }

      const result = sortPBLScenario(input)

      // Check scenario_info is first and fields are in correct order
      const keys = Object.keys(result)
      expect(keys[0]).toBe('scenario_info')
      expect(keys[1]).toBe('ksa_mapping')
      expect(keys[2]).toBe('tasks')

      // Check scenario_info field order
      const scenarioKeys = Object.keys(result.scenario_info)
      expect(scenarioKeys.indexOf('id')).toBeLessThan(scenarioKeys.indexOf('title'))
      expect(scenarioKeys.indexOf('title')).toBeLessThan(scenarioKeys.indexOf('description'))
      expect(scenarioKeys.indexOf('description')).toBeLessThan(scenarioKeys.indexOf('difficulty'))
      expect(scenarioKeys.indexOf('difficulty')).toBeLessThan(scenarioKeys.indexOf('estimated_duration'))
      expect(scenarioKeys.indexOf('estimated_duration')).toBeLessThan(scenarioKeys.indexOf('target_domains'))
      expect(scenarioKeys.indexOf('target_domains')).toBeLessThan(scenarioKeys.indexOf('prerequisites'))
      expect(scenarioKeys.indexOf('prerequisites')).toBeLessThan(scenarioKeys.indexOf('learning_objectives'))

      // Check ksa_mapping field order
      const ksaKeys = Object.keys(result.ksa_mapping!)
      expect(ksaKeys.indexOf('knowledge')).toBeLessThan(ksaKeys.indexOf('skills'))
      expect(ksaKeys.indexOf('skills')).toBeLessThan(ksaKeys.indexOf('attitudes'))

      // Check task field order
      const taskKeys = Object.keys(result.tasks[0])
      expect(taskKeys.indexOf('id')).toBeLessThan(taskKeys.indexOf('title'))
      expect(taskKeys.indexOf('title')).toBeLessThan(taskKeys.indexOf('description'))
      expect(taskKeys.indexOf('description')).toBeLessThan(taskKeys.indexOf('category'))
      expect(taskKeys.indexOf('category')).toBeLessThan(taskKeys.indexOf('instructions'))
      expect(taskKeys.indexOf('instructions')).toBeLessThan(taskKeys.indexOf('expected_outcome'))
    })

    it('should handle missing optional fields', () => {
      const input = {
        scenario_info: {
          id: 'test',
          title: 'Test',
          description: 'Test description',
          difficulty: 'beginner' as const,
          estimated_duration: 60,
          target_domains: ['engaging_with_ai' as const],
          prerequisites: [],
          learning_objectives: []
        },
        tasks: []
      }

      const result = sortPBLScenario(input)

      expect(result.scenario_info.id).toBe('test')
      expect(result.tasks).toEqual([])
      expect(result.ksa_mapping).toBeUndefined()
    })

    it('should preserve all field values', () => {
      const input = {
        scenario_info: {
          id: 'preserve-test',
          title: 'Preservation Test',
          title_zh: '保存測試',
          description: 'Testing value preservation',
          description_zh: '測試值保存',
          difficulty: 'intermediate' as const,
          estimated_duration: 120,
          target_domains: ['creating_with_ai' as const, 'managing_with_ai' as const],
          prerequisites: ['basic knowledge'],
          prerequisites_zh: ['基礎知識'],
          learning_objectives: ['learn X', 'understand Y'],
          learning_objectives_zh: ['學習 X', '理解 Y']
        },
        ksa_mapping: {
          knowledge: ['K1.1', 'K2.2'],
          skills: ['S1.3', 'S2.1'],
          attitudes: ['A1.2']
        },
        tasks: [
          {
            id: 'task1',
            title: 'Task One',
            title_zh: '任務一',
            description: 'First task',
            description_zh: '第一個任務',
            category: 'creation' as const,
            instructions: ['do this', 'do that'],
            instructions_zh: ['做這個', '做那個'],
            expected_outcome: 'good result',
            expected_outcome_zh: '好結果',
            time_limit: 30,
            resources: ['resource1'],
            resources_zh: ['資源1'],
            assessment_focus: {
              primary: ['creativity'],
              secondary: ['technical skill']
            },
            ai_module: {
              role: 'assistant' as const,
              model: 'gemini-pro',
              persona: 'helpful tutor',
              initial_prompt: 'Hello!'
            }
          }
        ]
      }

      const result = sortPBLScenario(input)

      // Check all values are preserved
      expect(result.scenario_info.title).toBe('Preservation Test')
      expect(result.scenario_info.title_zh).toBe('保存測試')
      expect(result.scenario_info.difficulty).toBe('intermediate')
      expect(result.scenario_info.estimated_duration).toBe(120)
      expect(result.scenario_info.target_domains).toEqual(['creating_with_ai', 'managing_with_ai'])
      
      expect(result.ksa_mapping?.knowledge).toEqual(['K1.1', 'K2.2'])
      expect(result.ksa_mapping?.skills).toEqual(['S1.3', 'S2.1'])
      expect(result.ksa_mapping?.attitudes).toEqual(['A1.2'])

      expect(result.tasks[0].title).toBe('Task One')
      expect(result.tasks[0].title_zh).toBe('任務一')
      expect(result.tasks[0].time_limit).toBe(30)
      expect(result.tasks[0].assessment_focus?.primary).toEqual(['creativity'])
      expect(result.tasks[0].ai_module?.role).toBe('assistant')
    })

    it('should handle empty input gracefully', () => {
      const input = {
        scenario_info: {
          id: '',
          title: '',
          description: '',
          difficulty: 'beginner' as const,
          estimated_duration: 0,
          target_domains: [],
          prerequisites: [],
          learning_objectives: []
        },
        tasks: []
      }

      const result = sortPBLScenario(input)

      expect(result.scenario_info.id).toBe('')
      expect(result.scenario_info.title).toBe('')
      expect(result.tasks).toEqual([])
    })

    it('should sort multiple tasks', () => {
      const input = {
        scenario_info: {
          id: 'multi-task',
          title: 'Multi Task Scenario',
          description: 'Scenario with multiple tasks',
          difficulty: 'advanced' as const,
          estimated_duration: 180,
          target_domains: ['designing_with_ai' as const],
          prerequisites: [],
          learning_objectives: []
        },
        tasks: [
          {
            id: 'task2',
            title: 'Second Task',
            description: 'Second task description',
            category: 'interaction' as const,
            instructions: ['second instruction'],
            expected_outcome: 'second outcome'
          },
          {
            id: 'task1',
            title: 'First Task',
            description: 'First task description',
            category: 'research' as const,
            instructions: ['first instruction'],
            expected_outcome: 'first outcome'
          }
        ]
      }

      const result = sortPBLScenario(input)

      expect(result.tasks).toHaveLength(2)
      expect(result.tasks[0].id).toBe('task2')
      expect(result.tasks[1].id).toBe('task1')

      // Check each task has correct field order
      result.tasks.forEach(task => {
        const taskKeys = Object.keys(task)
        expect(taskKeys.indexOf('id')).toBeLessThan(taskKeys.indexOf('title'))
        expect(taskKeys.indexOf('title')).toBeLessThan(taskKeys.indexOf('description'))
        expect(taskKeys.indexOf('description')).toBeLessThan(taskKeys.indexOf('category'))
      })
    })
  })
})