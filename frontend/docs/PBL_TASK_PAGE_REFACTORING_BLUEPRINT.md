# PBL Task Page Refactoring Blueprint

## Current State Analysis

**File**: `src/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/page.tsx`
**Current Size**: 1943 lines (386% over limit)
**Target Size**: <400 lines
**Reduction Required**: 1543+ lines (79% reduction)

### File Structure Breakdown

```
Lines 1-21:     Imports
Lines 22-78:    Helper functions (getQualitativeRating, getLocalizedField)
Lines 80-111:   Component declaration + State (21 useState/useRef)
Lines 114-132:  Effects (4 useEffect hooks)
Lines 134-306:  loadProgramData() - 173 lines
Lines 307-361:  loadTaskData() - 55 lines
Lines 363-462:  loadTaskHistory() - 100 lines
Lines 464-666:  handleSendMessage() - 203 lines (!!)
Lines 668-754:  handleEvaluate() - 87 lines
Lines 756-798:  handleTranslateEvaluation() - 43 lines
Lines 800-840:  handleCompleteTask() - 41 lines
Lines 842-845:  switchTask() - 4 lines
Lines 847-1943: JSX Return - 1097 lines (56% of file!)
```

### Problem Areas

1. **Massive JSX Block** (1097 lines)
   - Chat panel
   - Task instructions panel
   - Evaluation panel
   - Progress sidebar
   - Mobile view switching logic

2. **Complex Async Functions** (600+ lines total)
   - `handleSendMessage`: 203 lines
   - `loadProgramData`: 173 lines
   - `loadTaskHistory`: 100 lines
   - `handleEvaluate`: 87 lines

3. **State Management** (21 state variables)
   - Scattered across different concerns
   - No logical grouping

## Refactoring Strategy

### Phase 1: Extract Utilities (Target: -56 lines)

**File**: `src/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers.ts`

```typescript
export function getQualitativeRating(score: number): {
  label: "Good" | "Great" | "Perfect";
  color: string;
  i18nKey: string;
};

export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  fieldName: string,
  language: string,
): string;
```

**Tests**: `task-helpers.test.ts`

- Test all score ranges for qualitative rating
- Test multilingual field extraction
- Test edge cases (null, undefined, missing fields)

### Phase 2: Extract Custom Hooks (Target: -600 lines)

#### Hook 1: `useTaskData.ts` (~150 lines)

```typescript
export function useTaskData(
  scenarioId: string,
  programId: string,
  taskId: string,
) {
  // Manages: program, scenario, currentTask, loading states
  // Combines: loadProgramData(), loadTaskData(), loadTaskHistory()

  return {
    program,
    scenario,
    currentTask,
    loading,
    error,
    refetch,
  };
}
```

**Extracts**:

- `loadProgramData()` - 173 lines
- `loadTaskData()` - 55 lines
- `loadTaskHistory()` - 100 lines
- Related state: program, scenario, currentTask, loading, programTasks, taskEvaluations

**Tests**: `useTaskData.test.ts`

- Mock authenticatedFetch responses
- Test loading states
- Test error handling
- Test multilingual data loading

#### Hook 2: `useTaskChat.ts` (~200 lines)

```typescript
export function useTaskChat(
  scenarioId: string,
  programId: string,
  taskId: string,
  currentTask: Task | null,
) {
  // Manages: conversations, userInput, isProcessing
  // Handles: handleSendMessage() logic

  return {
    conversations,
    userInput,
    setUserInput,
    isProcessing,
    sendMessage,
    conversationEndRef,
  };
}
```

**Extracts**:

- `handleSendMessage()` - 203 lines
- Related state: conversations, userInput, isProcessing, showEvaluateButton
- conversationEndRef

**Tests**: `useTaskChat.test.ts`

- Test message sending flow
- Test program ID conversion (temp\_ → actual)
- Test interaction saving
- Test error handling
- Test conversation history

#### Hook 3: `useTaskEvaluation.ts` (~120 lines)

```typescript
export function useTaskEvaluation(
  scenarioId: string,
  programId: string,
  taskId: string,
  currentTask: Task | null,
) {
  // Manages: evaluation, isEvaluating, isTranslating
  // Handles: handleEvaluate(), handleTranslateEvaluation()

  return {
    evaluation,
    isEvaluating,
    isTranslating,
    evaluate,
    translateEvaluation,
    isEvaluateDisabled,
  };
}
```

**Extracts**:

- `handleEvaluate()` - 87 lines
- `handleTranslateEvaluation()` - 43 lines
- Related state: evaluation, isEvaluating, isTranslating, isEvaluateDisabled

**Tests**: `useTaskEvaluation.test.ts`

- Test evaluation request/response
- Test translation flow
- Test disabled states
- Test error handling

#### Hook 4: `useTaskProgress.ts` (~80 lines)

```typescript
export function useTaskProgress(
  scenario: Scenario | null,
  currentTask: Task | null,
  programId: string,
) {
  // Manages: progress tracking, task completion, task switching
  // Handles: handleCompleteTask(), switchTask()

  return {
    taskIndex,
    progress,
    completeTask,
    switchTask,
    isProgressCollapsed,
    setIsProgressCollapsed,
  };
}
```

**Extracts**:

- `handleCompleteTask()` - 41 lines
- `switchTask()` - 4 lines
- Related state: isProgressCollapsed
- Progress calculation logic

**Tests**: `useTaskProgress.test.ts`

- Test task completion
- Test task switching
- Test progress calculation

### Phase 3: Extract UI Components (Target: -800 lines)

#### Component 1: `ChatPanel.tsx` (~250 lines)

```typescript
interface ChatPanelProps {
  conversations: ConversationEntry[];
  userInput: string;
  setUserInput: (value: string) => void;
  onSendMessage: () => void;
  isProcessing: boolean;
  conversationEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  showEvaluateButton: boolean;
  onEvaluate: () => void;
  isEvaluateDisabled: boolean;
  domain: DomainType;
}

export function ChatPanel(props: ChatPanelProps) {
  // Renders chat interface with messages and input
}
```

**Extracts**: Lines ~1450-1700 from JSX (chat panel section)

**Tests**: `ChatPanel.test.tsx`

- Render with messages
- Test message input
- Test send button states
- Test evaluate button visibility

#### Component 2: `TaskInstructionsPanel.tsx` (~200 lines)

```typescript
interface TaskInstructionsPanelProps {
  currentTask: Task;
  scenario: Scenario;
  language: string;
}

export function TaskInstructionsPanel(props: TaskInstructionsPanelProps) {
  // Renders task instructions, description, expected outcome
}
```

**Extracts**: Lines ~1100-1300 from JSX (task content section)

**Tests**: `TaskInstructionsPanel.test.tsx`

- Render task details
- Test multilingual content
- Test instruction processing

#### Component 3: `TaskEvaluationPanel.tsx` (~150 lines)

```typescript
interface TaskEvaluationPanelProps {
  evaluation: TaskEvaluation | null;
  isTranslating: boolean;
  onTranslate: () => void;
  language: string;
}

export function TaskEvaluationPanel(props: TaskEvaluationPanelProps) {
  // Renders evaluation results with scores and feedback
}
```

**Extracts**: Lines ~1300-1450 from JSX (evaluation display)

**Tests**: `TaskEvaluationPanel.test.tsx`

- Render evaluation results
- Test rating display
- Test translation button
- Test score visualization

#### Component 4: `ProgressSidebar.tsx` (~120 lines)

```typescript
interface ProgressSidebarProps {
  scenario: Scenario;
  currentTask: Task;
  taskEvaluations: Record<string, TaskEvaluation>;
  programTasks: Array<{ id: string; taskIndex: number }>;
  onSwitchTask: (taskId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ProgressSidebar(props: ProgressSidebarProps) {
  // Renders task list with progress indicators
}
```

**Extracts**: Lines ~925-1045 from JSX (progress sidebar)

**Tests**: `ProgressSidebar.test.tsx`

- Render task list
- Test current task highlighting
- Test task switching
- Test collapse functionality

#### Component 5: `TaskHeader.tsx` (~80 lines)

```typescript
interface TaskHeaderProps {
  scenario: Scenario;
  currentTask: Task;
  taskIndex: number;
  totalTasks: number;
}

export function TaskHeader(props: TaskHeaderProps) {
  // Renders breadcrumb, title, progress bar
}
```

**Extracts**: Lines ~872-952 from JSX (header section)

**Tests**: `TaskHeader.test.tsx`

- Render header elements
- Test breadcrumb links
- Test progress display

#### Component 6: `MobileViewSwitcher.tsx` (~80 lines)

```typescript
interface MobileViewSwitcherProps {
  view: "progress" | "task" | "chat";
  onViewChange: (view: "progress" | "task" | "chat") => void;
}

export function MobileViewSwitcher(props: MobileViewSwitcherProps) {
  // Renders mobile navigation tabs
}
```

**Extracts**: Mobile view switching UI from JSX

**Tests**: `MobileViewSwitcher.test.tsx`

- Render view tabs
- Test view switching
- Test active state

### Phase 4: Refactor Main Page (Target: 350 lines)

**Final page.tsx structure**:

```typescript
'use client';

import { /* minimal imports */ } from 'react';
import { useTaskData } from './hooks/useTaskData';
import { useTaskChat } from './hooks/useTaskChat';
import { useTaskEvaluation } from './hooks/useTaskEvaluation';
import { useTaskProgress } from './hooks/useTaskProgress';
import { ChatPanel } from './components/ChatPanel';
import { TaskInstructionsPanel } from './components/TaskInstructionsPanel';
import { TaskEvaluationPanel } from './components/TaskEvaluationPanel';
import { ProgressSidebar } from './components/ProgressSidebar';
import { TaskHeader } from './components/TaskHeader';
import { MobileViewSwitcher } from './components/MobileViewSwitcher';

export default function ProgramLearningPage() {
  // ~50 lines: params, refs, mobile view state

  const { program, scenario, currentTask, loading } = useTaskData(
    scenarioId, programId, taskId
  );

  const {
    conversations,
    userInput,
    setUserInput,
    sendMessage,
    isProcessing,
    conversationEndRef,
  } = useTaskChat(scenarioId, programId, taskId, currentTask);

  const {
    evaluation,
    isEvaluating,
    isTranslating,
    evaluate,
    translateEvaluation,
    isEvaluateDisabled,
  } = useTaskEvaluation(scenarioId, programId, taskId, currentTask);

  const {
    taskIndex,
    switchTask,
    completeTask,
    isProgressCollapsed,
    setIsProgressCollapsed,
  } = useTaskProgress(scenario, currentTask, programId);

  // ~20 lines: Loading/error states

  // ~200 lines: Layout JSX using components
  return (
    <main>
      <TaskHeader scenario={scenario} currentTask={currentTask} />
      <div className="layout">
        <ProgressSidebar
          scenario={scenario}
          currentTask={currentTask}
          onSwitchTask={switchTask}
        />
        <div className="main-content">
          <TaskInstructionsPanel currentTask={currentTask} />
          <TaskEvaluationPanel evaluation={evaluation} />
        </div>
        <ChatPanel
          conversations={conversations}
          onSendMessage={sendMessage}
          onEvaluate={evaluate}
        />
      </div>
      <MobileViewSwitcher view={mobileView} onViewChange={setMobileView} />
    </main>
  );
}
```

**Target**: ~350 lines

## Implementation Steps (TDD)

### Step 1: Utilities

1. Create `task-helpers.test.ts`
2. Implement `task-helpers.ts`
3. Verify tests pass
4. Commit: "refactor(pbl): extract task helper utilities"

### Step 2: Hooks (one at a time)

For each hook:

1. Create `useX.test.ts` with comprehensive tests
2. Implement `useX.ts`
3. Verify tests pass
4. Update page.tsx to use hook
5. Verify build and existing tests still pass
6. Commit: "refactor(pbl): extract useX hook"

Order:

1. useTaskData (most foundational)
2. useTaskProgress (depends on useTaskData)
3. useTaskEvaluation (independent)
4. useTaskChat (uses some state from useTaskData)

### Step 3: Components (one at a time)

For each component:

1. Create `ComponentX.test.tsx`
2. Implement `ComponentX.tsx`
3. Verify tests pass
4. Update page.tsx to use component
5. Verify build and visual appearance
6. Commit: "refactor(pbl): extract ComponentX"

Order:

1. TaskHeader (simplest, least dependencies)
2. MobileViewSwitcher (simple, independent)
3. ProgressSidebar (uses task data)
4. TaskInstructionsPanel (uses task data)
5. TaskEvaluationPanel (uses evaluation data)
6. ChatPanel (most complex, uses multiple hooks)

### Step 4: Final Cleanup

1. Remove unused imports
2. Remove commented code
3. Organize imports
4. Run prettier
5. Commit: "refactor(pbl): finalize task page cleanup"

### Step 5: Quality Gates

1. Run `npm run test:ci` - ensure 70%+ coverage
2. Run `npx tsc --noEmit` - zero errors
3. Run `npm run lint` - zero errors
4. Run `npm run build` - success
5. Manual test: verify all functionality works
6. Commit: "test(pbl): verify refactored task page quality"

## Success Metrics

- [ ] page.tsx reduced from 1943 → <400 lines (79%+ reduction)
- [ ] All tests passing with 70%+ coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Build succeeds
- [ ] All functionality preserved
- [ ] Performance maintained or improved

## File Tree (Target)

```
src/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/
├── page.tsx                              (350 lines) ✓
├── components/
│   ├── ChatPanel.tsx                     (250 lines)
│   ├── ChatPanel.test.tsx                (150 lines)
│   ├── TaskInstructionsPanel.tsx         (200 lines)
│   ├── TaskInstructionsPanel.test.tsx    (120 lines)
│   ├── TaskEvaluationPanel.tsx           (150 lines)
│   ├── TaskEvaluationPanel.test.tsx      (100 lines)
│   ├── ProgressSidebar.tsx               (120 lines)
│   ├── ProgressSidebar.test.tsx          (80 lines)
│   ├── TaskHeader.tsx                    (80 lines)
│   ├── TaskHeader.test.tsx               (60 lines)
│   ├── MobileViewSwitcher.tsx            (80 lines)
│   └── MobileViewSwitcher.test.tsx       (50 lines)
├── hooks/
│   ├── useTaskData.ts                    (150 lines)
│   ├── useTaskData.test.ts               (120 lines)
│   ├── useTaskChat.ts                    (200 lines)
│   ├── useTaskChat.test.ts               (150 lines)
│   ├── useTaskEvaluation.ts              (120 lines)
│   ├── useTaskEvaluation.test.ts         (80 lines)
│   ├── useTaskProgress.ts                (80 lines)
│   └── useTaskProgress.test.ts           (60 lines)
└── utils/
    ├── task-helpers.ts                   (60 lines)
    └── task-helpers.test.ts              (80 lines)
```

**Total**: ~2,900 lines across 25 files vs. 1943 lines in 1 file
**Benefit**: Maintainable, testable, reusable, follows single responsibility principle

---

**Status**: Ready for implementation
**Assigned**: TDD-driven refactoring with agents-manager coordination
**Priority**: Critical (Phase 2 of refactoring roadmap)
