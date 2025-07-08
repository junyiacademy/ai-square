# AI Square V2 Architecture

## Overview

The V2 architecture is a complete rewrite of AI Square's backend, designed with scalability, maintainability, and clear separation of concerns in mind.

## Core Architecture

### TRACK → PROGRAM → TASK → LOG

The V2 system follows a hierarchical learning structure with flexible patterns:

1. **Track**: High-level learning paths (e.g., "AI Literacy", "Prompt Engineering")
   - `structure_type`: Controls how programs and tasks are organized
     - `standard`: Traditional multi-program structure (PBL scenarios)
     - `single_program`: One program per track (Discovery mode)
     - `direct_task`: Virtual program with direct tasks (Assessments)
     
2. **Program**: Specific courses within a track (e.g., "Beginner", "Intermediate")
   - `is_virtual`: Indicates auto-generated programs
   - `auto_generated`: True for system-created programs
   
3. **Task**: Individual learning activities within a program
   - `task_type`: Core type (learning, practice, assessment)
   - `task_variant`: Specific implementation (standard, question, exploration, assessment)
   
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
│   ├── track-repository.ts
│   ├── program-repository.ts
│   ├── task-repository.ts
│   └── user-repository.ts
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

### Structure Types

1. **Standard Structure** (PBL Scenarios)
   ```
   Track (AI Literacy)
   ├── Program 1 (Beginner)
   │   ├── Task 1
   │   ├── Task 2
   │   └── Task 3
   └── Program 2 (Intermediate)
       ├── Task 1
       └── Task 2
   ```

2. **Single Program Structure** (Discovery Mode)
   ```
   Track (Exploring AI Ethics)
   └── Program (Auto-generated)
       ├── Task 1 (Explore basics)
       ├── Task 2 (Hands-on practice)
       └── Task 3 (Reflection)
   ```

3. **Direct Task Structure** (Quick Assessments)
   ```
   Track (AI Knowledge Assessment)
   └── Program (Virtual)
       ├── Question 1
       ├── Question 2
       └── Question 3
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

### tracks_v2
```sql
CREATE TABLE tracks_v2 (
  id VARCHAR(255) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  structure_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

### programs_v2
```sql
CREATE TABLE programs_v2 (
  id VARCHAR(255) PRIMARY KEY,
  track_id VARCHAR(255) REFERENCES tracks_v2(id),
  code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_hours INTEGER,
  difficulty_level VARCHAR(50),
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_virtual BOOLEAN DEFAULT false,
  auto_generated BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(track_id, code)
);
```

### tasks_v2
```sql
CREATE TABLE tasks_v2 (
  id VARCHAR(255) PRIMARY KEY,
  program_id VARCHAR(255) REFERENCES programs_v2(id),
  code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  evaluation_criteria TEXT[],
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  task_type VARCHAR(50) NOT NULL,
  task_variant VARCHAR(50) DEFAULT 'standard',
  estimated_minutes INTEGER,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(program_id, code)
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

### Track Management
- `POST /api/v2/tracks` - Create a new track with flexible structure
- `GET /api/v2/tracks` - List all tracks (supports filtering by structure_type)
- `GET /api/v2/tracks/[id]` - Get track with full hierarchy

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