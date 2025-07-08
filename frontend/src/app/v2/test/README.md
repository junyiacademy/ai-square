# V2 System Test Page

This test page demonstrates the flexible scenario architecture of the V2 system, showcasing all three structure types:

## Access the Test Page

Navigate to: `http://localhost:3000/v2/test`

## Structure Types

### 1. PBL (Standard Structure)
- **Pattern**: Scenario → Multiple Programs → Multiple Tasks
- **Use Case**: Traditional learning paths with structured progression
- **Example**: AI Job Search training with Foundation and Advanced programs

### 2. Discovery (Multiple Programs)
- **Pattern**: Scenario → Multiple Scenario Programs → Exploration Tasks
- **Use Case**: Career exploration through role-playing scenarios
- **Example**: AI Product Manager with Daily Routine, Challenge, and Career Growth scenarios

### 3. Assessment (Direct Task)
- **Pattern**: Scenario → Virtual Program → Direct Question Tasks
- **Use Case**: Quick evaluations and assessments
- **Example**: AI Literacy Foundation Assessment

## Features Demonstrated

1. **Scenario Creation**: Create scenarios using different structure types
2. **Hierarchy Visualization**: Visual tree view showing the full structure
3. **Virtual Programs**: See how single-program and direct-task structures use virtual programs
4. **Task Variants**: Different task types (standard, question, exploration)
5. **Metadata Display**: View scenario metadata including difficulty, domains, etc.

## Test Scenarios

### Creating a PBL Scenario
1. Select the PBL tab
2. Choose a project from the dropdown
3. Click "Create PBL Scenario"
4. Observe the multi-program structure

### Creating a Discovery Scenario
1. Select the Discovery tab
2. Review the pre-configured topic
3. Click "Start Discovery Scenario"
4. See the single-program structure with exploration tasks

### Creating Assessments
1. Select the Assessment tab
2. Choose from three assessment types:
   - Quick Assessment (5 questions)
   - Adaptive Assessment (difficulty adjusts based on performance)
   - Certification Assessment (comprehensive evaluation)
3. Observe the direct-task structure

## Understanding the Visualization

- **Folders**: Represent programs (yellow icons)
- **Files**: Represent tasks with color-coded icons:
  - Blue book: Learning tasks
  - Orange play: Practice tasks
  - Purple check: Assessment tasks
  - Green book: Exploration tasks
  - Purple file: Question tasks
- **Virtual label**: Indicates auto-generated programs
- **Expandable tree**: Click programs to see their tasks
- **Metadata panel**: Shows raw scenario metadata at the bottom

## Mock Data

The test page uses mock data defined in `/lib/v2/utils/mock-data.ts`. In a real implementation, these would interact with actual database services.

## Error Handling

The page includes error handling for:
- Missing project selection
- Service failures
- Loading states

## Next Steps

After testing the structures, you can:
1. Click on tasks to simulate navigation (logs to console)
2. Clear all scenarios and start fresh
3. Reset to default mock scenarios
4. Examine the metadata to understand the data model