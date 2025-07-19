//
//  * This test file has been temporarily disabled due to GCS v2 removal.
//  * TODO: Update to use PostgreSQL repositories
//
//
//
//
//  * @jest-environment node
//
//
// import { NextRequest } from 'next/server';
// import { GET, PATCH } from '../route';
// import { getServerSession } from '@/lib/auth/session';
// import { 
//   getProgramRepository,
//   getTaskRepository,
//   getEvaluationRepository,
//   getScenarioRepository 
// } from '@/lib/implementations/gcs-v2';
// import { VertexAIService } from '@/lib/ai/vertex-ai-service';
//
// // Mock dependencies
// jest.mock('@/lib/auth/session');
// jest.mock('@/lib/implementations/gcs-v2');
// jest.mock('@/lib/ai/vertex-ai-service');
// jest.mock('@/lib/services/discovery-yaml-loader');
//
// const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
// const mockGetProgramRepository = getProgramRepository as jest.MockedFunction<typeof getProgramRepository>;
// const mockGetTaskRepository = getTaskRepository as jest.MockedFunction<typeof getTaskRepository>;
// const mockGetEvaluationRepository = getEvaluationRepository as jest.MockedFunction<typeof getEvaluationRepository>;
// const mockGetScenarioRepository = getScenarioRepository as jest.MockedFunction<typeof getScenarioRepository>;
//
// describe('/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]', () => {
//   const mockProgramRepo = {
//     findById: jest.fn(),
//     update: jest.fn(),
//     updateProgress: jest.fn(),
//     complete: jest.fn()
//   };
//
//   const mockTaskRepo = {
//     findById: jest.fn(),
//     addInteraction: jest.fn(),
//     complete: jest.fn(),
//     updateStatus: jest.fn(),
//     findByProgram: jest.fn()
//   };
//
//   const mockEvaluationRepo = {
//     create: jest.fn()
//   };
//
//   const mockScenarioRepo = {
//     findById: jest.fn()
//   };
//
//   const mockSession = {
//     user: { email: 'test@example.com' }
//   };
//
//   beforeEach(() => {
//     jest.clearAllMocks();
//     mockGetProgramRepository.mockReturnValue(mockProgramRepo as any);
//     mockGetTaskRepository.mockReturnValue(mockTaskRepo as any);
//     mockGetEvaluationRepository.mockReturnValue(mockEvaluationRepo as any);
//     mockGetScenarioRepository.mockReturnValue(mockScenarioRepo as any);
//     mockGetServerSession.mockResolvedValue(mockSession as any);
//   });
//
//   describe('GET task', () => {
//     it('should return task data for authorized user', async () => {
//       const mockProgram = {
//         id: 'program-1',
//         userId: 'test@example.com',
//         scenarioId: 'scenario-1'
//       };
//
//       const mockTask = {
//         id: 'task-1',
//         title: 'Understand Algorithms',
//         type: 'analysis',
//         status: 'active',
//         content: {
//           instructions: 'Learn about algorithms'
//         },
//         interactions: [],
//         programId: 'program-1'
//       };
//
//       const mockScenario = {
//         id: 'scenario-1',
//         sourceRef: {
//           metadata: {
//             careerType: 'content_creator'
//           }
//         }
//       };
//
//       mockProgramRepo.findById.mockResolvedValue(mockProgram);
//       mockTaskRepo.findById.mockResolvedValue(mockTask);
//       mockScenarioRepo.findById.mockResolvedValue(mockScenario);
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1');
//       const response = await GET(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(200);
//       expect(data.id).toBe('task-1');
//       expect(data.title).toBe('Understand Algorithms');
//       expect(data.careerType).toBe('content_creator');
//     });
//
//     it('should return 403 for unauthorized access', async () => {
//       const mockProgram = {
//         id: 'program-1',
//         userId: 'other@example.com', // Different user
//         scenarioId: 'scenario-1'
//       };
//
//       mockProgramRepo.findById.mockResolvedValue(mockProgram);
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1');
//       const response = await GET(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(403);
//       expect(data.error).toBe('Forbidden');
//     });
//
//     it('should return 404 for non-existent task', async () => {
//       const mockProgram = {
//         id: 'program-1',
//         userId: 'test@example.com',
//         scenarioId: 'scenario-1'
//       };
//
//       mockProgramRepo.findById.mockResolvedValue(mockProgram);
//       mockTaskRepo.findById.mockResolvedValue(null);
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1');
//       const response = await GET(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(404);
//       expect(data.error).toBe('Task not found');
//     });
//   });
//
//   describe('PATCH task submission', () => {
//     const mockProgram = {
//       id: 'program-1',
//       userId: 'test@example.com',
//       scenarioId: 'scenario-1',
//       metadata: { language: 'zhTW' }
//     };
//
//     const mockTask = {
//       id: 'task-1',
//       title: 'Understand Algorithms',
//       programId: 'program-1',
//       content: {
//         instructions: 'Learn about algorithms',
//         context: { xp: 100 }
//       },
//       interactions: []
//     };
//
//     beforeEach(() => {
//       mockProgramRepo.findById.mockResolvedValue(mockProgram);
//       mockTaskRepo.findById.mockResolvedValue(mockTask);
//     });
//
//     it('should process task submission with AI evaluation', async () => {
//       const mockAIResponse = {
//         content: JSON.stringify({
//           feedback: 'Great work!',
//           completed: true,
//           xpEarned: 95,
//           strengths: ['Good analysis'],
//           improvements: [],
//           skillsImproved: ['critical_thinking']
//         })
//       };
//
//       const mockVertexAI = {
//         sendMessage: jest.fn().mockResolvedValue(mockAIResponse)
//       };
//       (VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => mockVertexAI as any);
//
//       const requestBody = {
//         action: 'submit',
//         content: {
//           response: 'I will use AI tools to verify information',
//           timeSpent: 300
//         }
//       };
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1', {
//         method: 'PATCH',
//         body: JSON.stringify(requestBody),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//
//       const response = await PATCH(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(200);
//       expect(data.success).toBe(true);
//       expect(data.completed).toBe(true);
//       expect(data.feedback).toBe('Great work!');
//       expect(data.xpEarned).toBe(95);
//       expect(mockTaskRepo.addInteraction).toHaveBeenCalledTimes(1); // User interaction only
//     });
//
//     it('should handle confirm-complete action', async () => {
//       // Setup task with passed interactions
//       const taskWithPassedAttempts = {
//         ...mockTask,
//         interactions: [
//           {
//             timestamp: '2023-01-01T00:00:00Z',
//             type: 'user_input',
//             content: { response: 'First attempt' }
//           },
//           {
//             timestamp: '2023-01-01T00:01:00Z',
//             type: 'ai_response',
//             content: { 
//               completed: true, 
//               xpEarned: 90,
//               feedback: 'Good work!',
//               strengths: ['Analysis'],
//               improvements: [],
//               skillsImproved: ['critical_thinking']
//             }
//           }
//         ]
//       };
//
//       mockTaskRepo.findById.mockResolvedValue(taskWithPassedAttempts);
//       mockTaskRepo.findByProgram.mockResolvedValue([taskWithPassedAttempts]);
//       mockEvaluationRepo.create.mockResolvedValue({
//         id: 'eval-1',
//         score: 90
//       });
//
//       const requestBody = {
//         action: 'confirm-complete'
//       };
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1', {
//         method: 'PATCH',
//         body: JSON.stringify(requestBody),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//
//       const response = await PATCH(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(200);
//       expect(data.success).toBe(true);
//       expect(data.taskCompleted).toBe(true);
//       expect(mockTaskRepo.complete).toHaveBeenCalledWith('task-1');
//       expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
//         expect.objectContaining({
//           targetType: 'task',
//           targetId: 'task-1',
//           evaluationType: 'discovery_task'
//         })
//       );
//     });
//
//     it('should return 400 for confirm-complete without passed attempts', async () => {
//       // Task with no passed interactions
//       const taskWithoutPass = {
//         ...mockTask,
//         interactions: [
//           {
//             timestamp: '2023-01-01T00:00:00Z',
//             type: 'ai_response',
//             content: { completed: false }
//           }
//         ]
//       };
//
//       mockTaskRepo.findById.mockResolvedValue(taskWithoutPass);
//
//       const requestBody = {
//         action: 'confirm-complete'
//       };
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1', {
//         method: 'PATCH',
//         body: JSON.stringify(requestBody),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//
//       const response = await PATCH(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(400);
//       expect(data.error).toBe('Task has not been passed yet');
//     });
//
//     it('should handle start action', async () => {
//       const requestBody = {
//         action: 'start'
//       };
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1', {
//         method: 'PATCH',
//         body: JSON.stringify(requestBody),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//
//       const response = await PATCH(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(200);
//       expect(data.success).toBe(true);
//       expect(data.status).toBe('active');
//       expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-1', 'active');
//     });
//
//     it('should handle AI evaluation errors gracefully', async () => {
//       const mockVertexAI = {
//         sendMessage: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
//       };
//       (VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => mockVertexAI as any);
//
//       const requestBody = {
//         action: 'submit',
//         content: {
//           response: 'Test response',
//           timeSpent: 300
//         }
//       };
//
//       const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-1/programs/program-1/tasks/task-1', {
//         method: 'PATCH',
//         body: JSON.stringify(requestBody),
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });
//
//       const response = await PATCH(request, {
//         params: Promise.resolve({
//           id: 'scenario-1',
//           programId: 'program-1',
//           taskId: 'task-1'
//         })
//       });
//
//       const data = await response.json();
//
//       expect(response.status).toBe(200);
//       expect(data.success).toBe(false);
//       expect(data.error).toBe('AI evaluation failed');
//       expect(data.canComplete).toBe(false);
//     });
//   });
// });
//
//