# AI Square V2 Architecture

## Overview

The V2 architecture is a complete rewrite of AI Square's backend, designed with scalability, maintainability, and clear separation of concerns in mind.

## Core Architecture

### SCENARIO → PROGRAM → TASK → LOG

The V2 system follows a hierarchical learning structure with flexible patterns:

1. **Scenario**: User's learning journey for a specific project/exam/career
   - Each user has one active scenario per learning project
   - Tracks the overall progress and status
   - Examples:
     - PBL: "John's AI Job Search Learning Journey"
     - Discovery: "Exploring AI PM Career Path"
     - Assessment: "Mary's AI Literacy Assessment Journey"
     
2. **Program**: Specific phases or attempts within a scenario
   - PBL: Learning stages (Foundation → Advanced)
   - Discovery: Different career scenarios (Daily → Crisis → Growth)
   - Assessment: Test attempts (Practice 1 → Practice 2 → Formal)
   
3. **Task**: Individual learning activities within a program
   - PBL: Learning tasks with AI evaluation
   - Discovery: Experience tasks (can be dynamically added)
   - Assessment: Quiz questions with standard answers
   
4. **Log**: Detailed activity logs for each task (chat, submissions, evaluations)

## Directory Structure

```
v2/
├── core/                 # Base classes and interfaces
│   ├── base-repository.ts
│   ├── base-service.ts
│   └── base-api-handler.ts
├── types/               # TypeScript type definitions
│   └── index.ts
├── repositories/        # Data access layer
│   ├── scenario-repository.ts
│   ├── program-repository.ts
│   ├── task-repository.ts
│   └── log-repository.ts
├── services/           # Business logic layer
│   ├── storage-service.ts
│   ├── base-learning-service.ts
│   ├── pbl-service.ts
│   ├── discovery-service.ts
│   └── assessment-service.ts
├── utils/             # Utility functions
│   └── database.ts
└── index.ts          # Main export file
```

## Key Features

### 1. Type Safety
- Full TypeScript support with strict typing
- No `any` types in production code
- Comprehensive interfaces for all entities

### 2. Layered Architecture
- **Repository Layer**: Handles data persistence
- **Service Layer**: Contains business logic
- **API Layer**: Handles HTTP requests/responses

### 3. Consistent API Design
- All V2 routes use `/api/v2/` prefix
- Standardized response format
- Built-in pagination support
- Comprehensive error handling

### 4. Database Design
- All tables use `_v2` suffix
- Consistent timestamp columns (created_at, updated_at)
- UUID-based IDs with entity prefixes
- Support for soft deletes

### 5. Storage Integration
- Google Cloud Storage for file storage
- Signed URLs for secure access
- Organized folder structure by user/entity

## Flexible Architecture (Plan C)

The V2 architecture implements a flexible learning structure that accommodates different learning patterns:

### Learning Patterns

1. **PBL Structure** (Multi-stage learning)
   ```
   Project: "AI-Powered Job Search"
   └── Scenario: "John's Learning Journey"
       ├── Program 1: "Foundation"
       │   ├── Task 1: Understanding AI Tools
       │   ├── Task 2: Resume Optimization
       │   └── Task 3: Job Matching
       └── Program 2: "Advanced"
           ├── Task 1: Advanced AI Tools
           ├── Task 2: Portfolio Building
           └── Task 3: Interview Preparation
   ```

2. **Discovery Structure** (Dynamic exploration)
   ```
   Career: "AI Product Manager"
   └── Scenario: "Exploring AI PM Career"
       ├── Program 1: "Day in the Life"
       │   ├── Task 1: Morning Briefing
       │   ├── Task 2: Feature Planning
       │   └── Task 3: Stakeholder Meeting
       └── Program 2: "Crisis Management"
           ├── Task 1: Problem Analysis
           ├── Task 2: Solution Design
           └── Task 3: Crisis Communication
   ```

3. **Assessment Structure** (Multiple attempts)
   ```
   Exam: "AI Literacy Assessment"
   └── Scenario: "Mary's Assessment Journey"
       ├── Program 1: "Practice Round 1"
       │   ├── Question 1: Score 80%
       │   ├── Question 2: Score 60%
       │   └── Question 3: Score 100%
       └── Program 2: "Formal Assessment"
           ├── Question 1: Score 100%
           ├── Question 2: Score 90%
           └── Question 3: Score 100%
   ```

### Service Architecture

- **BaseLearningServiceV2**: Abstract base providing common functionality
- **PBLServiceV2**: Implements standard multi-program scenarios
- **DiscoveryServiceV2**: Implements single-program exploration
- **AssessmentServiceV2**: Implements direct task assessments

## Usage Examples

### Creating a Standard PBL Track

```typescript
import { PBLServiceV2 } from '@/lib/v2';
import { getMockDatabase } from '@/lib/v2/utils/database';

const db = getMockDatabase();
const pblService = new PBLServiceV2(db);

const scenario = await pblService.createPBLScenario({
  code: 'ai-job-search',
  title: 'AI-Powered Job Search',
  description: 'Learn to use AI tools for job searching',
  difficulty: 'intermediate',
  domains: ['Creating_with_AI', 'Managing_with_AI'],
  programs: [
    {
      code: 'research',
      title: 'Research Phase',
      description: 'Learn to research with AI',
      difficulty_level: 'beginner',
      tasks: [
        {
          code: 'task-1',
          title: 'Understanding AI Job Tools',
          description: 'Explore AI-powered job search platforms',
          instructions: 'Research and compare different AI job search tools...',
          task_type: 'learning',
          ai_modules: ['research_assistant']
        }
      ]
    }
  ]
});
```

### Starting a Discovery Session

```typescript
const discoveryService = new DiscoveryServiceV2(db);

const discovery = await discoveryService.startDiscovery({
  topic: 'Machine Learning Basics',
  language: 'en',
  difficulty: 'beginner',
  user_context: 'I am a software developer interested in ML'
});
```

### Creating a Quick Assessment

```typescript
const assessmentService = new AssessmentServiceV2(db);

const assessment = await assessmentService.createQuickAssessment({
  title: 'AI Ethics Knowledge Check',
  description: 'Test your understanding of AI ethics',
  difficulty: 'intermediate',
  questions: [
    {
      question: 'What is algorithmic bias?',
      type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'B'
    },
    {
      question: 'Explain the importance of AI transparency',
      type: 'short_answer'
    }
  ],
  time_limit: 30,
  domains: ['AI_Ethics']
});
```

### API Route Example

```typescript
import { BaseApiHandler } from '@/lib/v2';

class MyApiHandler extends BaseApiHandler {
  protected async handleGet(request: NextRequest) {
    const filters = this.getQueryFilters(request);
    const data = await this.service.findMany(filters);
    return this.success(data);
  }
}
```

### Storage Service Usage

```typescript
import { StorageService } from '@/lib/v2';

const storage = new StorageService();
const file = new File(['content'], 'test.txt');
const result = await storage.upload(file, 'users/123/documents/test.txt');
```

## Migration from V1

The V2 system is designed to run alongside V1 during the migration period:

1. All V2 tables have `_v2` suffix
2. V2 API routes use `/api/v2/` prefix
3. V2 storage uses separate bucket or folder structure
4. No shared code between V1 and V2

## Database Schema

### learning_projects_v2
```sql
CREATE TABLE learning_projects_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### scenarios_v2
```sql
CREATE TABLE scenarios_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES learning_projects_v2(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'pbl', 'discovery', 'assessment'
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'created',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### programs_v2
```sql
CREATE TABLE programs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios_v2(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  program_order INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id, program_order)
);
```

### tasks_v2
```sql
CREATE TABLE tasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs_v2(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  task_order INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  required_ksa TEXT[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(program_id, task_order)
);
```

### logs_v2
```sql
CREATE TABLE logs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios_v2(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs_v2(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_type VARCHAR(50) NOT NULL,
  activity VARCHAR(100) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

1. **Always use TypeScript types** - No `any` types
2. **Handle errors gracefully** - Use try-catch in services
3. **Validate input data** - Check required fields
4. **Use transactions** - For multi-step operations
5. **Log important events** - For debugging and monitoring
6. **Write tests** - Aim for 80%+ coverage
7. **Document APIs** - Include examples and edge cases

## API Endpoints

### Scenario Management
- `POST /api/v2/scenarios` - Start a new scenario for a project
- `GET /api/v2/scenarios` - List user's active scenarios
- `GET /api/v2/scenarios/[id]` - Get scenario with full hierarchy

### Task Management
- `POST /api/v2/tasks/[taskId]/submit` - Submit task response
- `GET /api/v2/tasks/[taskId]/logs` - Get task activity logs

### Quick Actions
- `POST /api/v2/quick-assessment` - Create a quick assessment
- `POST /api/v2/discovery/start` - Start a discovery session

### Request/Response Examples

#### Create Standard PBL Track
```http
POST /api/v2/tracks
Content-Type: application/json

{
  "trackData": {
    "code": "ai-literacy",
    "title": "AI Literacy Fundamentals",
    "description": "Learn the basics of AI",
    "structure_type": "standard"
  },
  "options": {
    "structure_type": "standard",
    "programs": [...]
  }
}
```

#### Create Quick Assessment
```http
POST /api/v2/quick-assessment
Content-Type: application/json

{
  "title": "AI Knowledge Check",
  "description": "Test your AI understanding",
  "difficulty": "beginner",
  "questions": [
    {
      "question": "What is AI?",
      "type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }
  ]
}
```

## Future Enhancements

- [ ] Real database implementation (PostgreSQL)
- [ ] Redis caching layer
- [ ] WebSocket support for real-time updates
- [ ] Advanced search with Elasticsearch
- [ ] Multi-tenant support
- [ ] API versioning strategy
- [ ] Performance monitoring integration
- [ ] AI content generation for Discovery mode
- [ ] Adaptive assessment algorithms
- [ ] Learning path recommendations