# Database Initialization Guide for AI Square

## Overview

AI Square uses a unified learning architecture where all three learning modes (Assessment, PBL, Discovery) share the same database schema. This guide explains how to initialize and create scenarios in the database.

## Database Schema Structure

The unified schema follows this hierarchy:
```
Scenarios (source: YAML files) 
  → Programs (user instances)
    → Tasks (learning activities)
      → Evaluations (AI assessments)
```

## Methods to Initialize Scenarios

### 1. Automatic YAML Import (Recommended for Production)

The system can automatically import scenarios from YAML files in the `public/` directory:

```bash
# Initialize all scenarios from YAML files
cd frontend
npm run init:scenarios

# Initialize specific modules only
npm run init:scenarios -- --pbl          # PBL only
npm run init:scenarios -- --discovery    # Discovery only  
npm run init:scenarios -- --assessment   # Assessment only

# Dry run to see what would be created
npm run init:scenarios -- --dry-run

# Force update existing scenarios
npm run init:scenarios -- --force
```

**YAML File Locations:**
- PBL: `frontend/public/pbl_data/scenarios/*/[scenario_id]_scenario.yaml`
- Discovery: `frontend/public/discovery_data/*/[career_type]_[lang].yml`
- Assessment: `frontend/public/assessment_data/*/[assessment]_questions_[lang].yaml`

### 2. API Endpoint for Staging (Quick Testing)

For staging environments, use the admin initialization endpoint:

```bash
# Initialize staging database with sample scenarios
curl -X POST https://ai-square-staging-m7s4ucbgba-de.a.run.app/api/admin/init-db
```

This creates:
- 1 test user: `staging-test@ai-square.com`
- 2 PBL scenarios
- 1 Assessment scenario
- 1 Discovery scenario

### 3. Direct Database Creation (Development)

For custom scenarios or development, create scenarios directly via the repository:

```typescript
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

const scenarioRepo = repositoryFactory.getScenarioRepository();

// Create a PBL scenario
const pblScenario = await scenarioRepo.create({
  mode: 'pbl',
  status: 'active',
  version: '1.0',
  sourceType: 'manual',
  title: { 
    en: 'AI Marketing Campaign', 
    zh: 'AI 行銷活動'
  },
  description: { 
    en: 'Learn to create marketing campaigns with AI',
    zh: '學習使用 AI 創建行銷活動' 
  },
  objectives: [
    'Understand AI tools for marketing',
    'Create engaging content',
    'Analyze campaign performance'
  ],
  difficulty: 'intermediate',
  estimatedMinutes: 45,
  taskTemplates: [
    {
      id: 'task-1',
      title: 'Research Target Audience',
      type: 'analysis'
    },
    {
      id: 'task-2', 
      title: 'Generate Campaign Ideas',
      type: 'creation'
    },
    {
      id: 'task-3',
      title: 'Create Content with AI',
      type: 'chat'
    }
  ],
  pblData: {
    ksaMapping: {
      knowledge: ['K1.1', 'K2.3'],
      skills: ['S1.2', 'S3.1'],
      attitudes: ['A1.1', 'A2.2']
    },
    aiMentorGuidelines: 'Guide students through marketing principles'
  },
  // ... other required fields
});

// Create an Assessment scenario
const assessmentScenario = await scenarioRepo.create({
  mode: 'assessment',
  status: 'active',
  version: '1.0',
  sourceType: 'manual',
  title: { en: 'AI Ethics Assessment' },
  description: { en: 'Test your understanding of AI ethics' },
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  assessmentData: {
    totalQuestions: 15,
    timeLimit: 20,
    passingScore: 70,
    domains: ['engaging_with_ai', 'managing_ai'],
    questionBank: [] // Questions loaded separately
  },
  // ... other required fields
});

// Create a Discovery scenario
const discoveryScenario = await scenarioRepo.create({
  mode: 'discovery',
  status: 'active',
  version: '1.0',
  sourceType: 'manual',
  title: { en: 'Game Developer Journey' },
  description: { en: 'Explore game development with AI' },
  difficulty: 'beginner',
  estimatedMinutes: 60,
  discoveryData: {
    careerType: 'game_developer',
    category: 'creator',
    skillTree: {
      core: ['programming', 'game_design'],
      ai: ['procedural_generation', 'npc_behavior']
    },
    milestoneQuests: []
  },
  xpRewards: { completion: 200 },
  // ... other required fields
});
```

## Database Migration

For fresh installations or updates:

```bash
# Run the schema migration
cd frontend
psql -h localhost -U postgres -d ai_square_db < src/lib/repositories/postgresql/schema-v3.sql

# For staging environment
bash scripts/migrate-staging-db.sh
```

## Required Fields for Each Mode

### PBL Scenarios
- **mode**: 'pbl'
- **pblData**: Must contain `ksaMapping` with knowledge, skills, attitudes arrays
- **taskTemplates**: Array of task definitions (chat, creation, analysis types)
- **aiModules**: AI mentor configuration

### Assessment Scenarios  
- **mode**: 'assessment'
- **assessmentData**: Must contain:
  - `totalQuestions`: Number of questions
  - `timeLimit`: Time limit in minutes
  - `passingScore`: Pass threshold (0-100)
  - `questionBank`: Array of questions

### Discovery Scenarios
- **mode**: 'discovery'
- **discoveryData**: Must contain:
  - `careerType`: Type of career path
  - `category`: 'creator', 'analyst', etc.
  - `skillTree`: Skills to develop
- **xpRewards**: XP points for completion

## Validation

The database enforces:
1. **Mode propagation**: Programs inherit mode from scenarios, tasks inherit from programs
2. **Required data validation**: Each mode must have its specific data fields
3. **Multi-language support**: Titles and descriptions stored as JSONB

## Best Practices

1. **Use YAML import for production** - Maintains consistency with content files
2. **Test in staging first** - Use the staging initialization endpoint
3. **Include all languages** - Provide translations in title/description fields
4. **Set proper difficulty** - beginner, intermediate, advanced, expert
5. **Define clear objectives** - Help users understand learning outcomes
6. **Configure AI modules** - Especially important for PBL scenarios

## Troubleshooting

### Common Issues

1. **"Scenario already exists"**
   - Use `--force` flag with init script
   - Or manually delete from database first

2. **"Mode-specific data validation failed"**
   - Ensure required fields for each mode are provided
   - Check the schema validation triggers

3. **"YAML file not found"**
   - Verify file paths match expected patterns
   - Check file permissions

### Debug Commands

```bash
# Check existing scenarios
psql -d ai_square_db -c "SELECT id, mode, title->>'en' as title FROM scenarios;"

# Check scenario counts by mode
psql -d ai_square_db -c "SELECT mode, COUNT(*) FROM scenarios GROUP BY mode;"

# View scenario details
psql -d ai_square_db -c "SELECT * FROM scenarios WHERE mode = 'pbl' LIMIT 1;"
```

## API Endpoints

After scenarios are created, they're accessible via:
- `/api/pbl/scenarios` - List PBL scenarios
- `/api/assessment/scenarios` - List assessment scenarios  
- `/api/discovery/scenarios` - List discovery scenarios

Each endpoint supports language parameter: `?lang=zh` for translations.