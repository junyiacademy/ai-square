# AI Square V2 - Unified Learning Interface

## Overview

The V2 interface provides a unified learning experience that supports three modes:
- **Problem-Based Learning (PBL)** - Guided scenarios with AI tutoring
- **Discovery Mode** - Open exploration with AI companionship  
- **Smart Assessment** - Adaptive testing with instant feedback

## Architecture

### Pages
- `/v2` - Landing page for V2 features
- `/v2/scenarios` - Scenario list grouped by type
- `/v2/scenarios/[scenarioId]` - Program selection (existing or new)
- `/v2/scenarios/[scenarioId]/programs/[programId]` - Three-panel learning interface

### Components
- `ScenarioList` - Displays scenarios grouped by type
- `ProgramSelector` - Shows existing programs or creates new ones
- `LearningInterface` - Main three-panel learning UI
- `TaskPanel` - Left panel showing task list and progress
- `ContentPanel` - Middle panel showing task content
- `ActionPanel` - Right panel for interactions and evaluation

### Services
- `PBLServiceV2` - Handles PBL scenarios and AI chat
- `DiscoveryServiceV2` - Manages discovery exploration
- `AssessmentServiceV2` - Handles assessments and evaluation

### Storage
- Uses localStorage for demo (can switch to GCS)
- Stores program metadata, task logs, and completions
- Organized by user/scenario/program hierarchy

## Features

1. **Multi-language Support**
   - Dynamic language switching
   - Lazy translation loading
   - Supports 14 languages

2. **Progress Tracking**
   - Task completion status
   - Program progress visualization
   - Session history

3. **Logging System**
   - All actions logged with timestamps
   - Task completions tracked
   - Program completions recorded

4. **Three-Panel Interface**
   - Responsive layout
   - Clear task navigation
   - Real-time interaction

## Usage

1. Navigate to `/v2` or `/v2/scenarios`
2. Select a scenario from any type
3. Choose existing program or create new
4. Work through tasks in the three-panel interface
5. All progress is automatically saved

## Development

### Adding New Scenarios
Add scenarios to `/public/v2/scenarios/demo_scenarios.json`:

```json
{
  "pbl": [...],
  "discovery": [...],
  "assessment": [...]
}
```

### Extending Services
Services are in `/src/lib/services/v2/`. Each service handles:
- Loading scenarios
- Processing interactions
- Evaluating responses

### Custom Storage
Implement the storage interface in `/src/lib/abstractions/implementations/`
to add new storage backends (e.g., GCS, Firebase).

## API Routes

- `/api/v2/pbl/chat` - PBL chat interactions
- `/api/v2/pbl/evaluate` - PBL task evaluation
- `/api/v2/discovery/explore` - Discovery mode queries
- `/api/v2/discovery/summarize` - Discovery session summary
- `/api/v2/assessment/evaluate` - Assessment answer evaluation

## Testing

Access the V2 interface at `/v2/scenarios` to test all features.
Demo data is included for immediate testing.