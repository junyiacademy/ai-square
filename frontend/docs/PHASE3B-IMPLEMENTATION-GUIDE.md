# Phase 3B Implementation Guide

**Quick Reference for Pragmatic Page Refactoring**

---

## Quick Start (5-Step Process)

### Step 1: Identify Largest Sections (5 min)

```bash
# View page with line numbers
cat -n src/app/[PATH]/page.tsx | grep -E "(return|<div|<section|function)" | tail -50

# Count lines
wc -l src/app/[PATH]/page.tsx
```

**What to look for**:

- Large JSX blocks (>100 lines)
- Repeated component patterns
- Complex state management
- Data fetching logic

### Step 2: Create Directory Structure (1 min)

```bash
mkdir -p src/app/[PATH]/{components,hooks,utils}
```

### Step 3: Extract Components (15-20 min each)

**Template** (`components/ComponentName.tsx`):

```typescript
interface ComponentNameProps {
  // Add only required props (no optional unless necessary)
  data: Record<string, unknown>;
  onAction: () => void;
}

export function ComponentName({ data, onAction }: ComponentNameProps) {
  // Component implementation
  return (
    <div>
      {/* Paste extracted JSX here */}
    </div>
  );
}

// TODO: Add comprehensive tests
```

### Step 4: Extract Hook (10-15 min, if needed)

**Template** (`hooks/useCustomHook.ts`):

```typescript
export function useCustomHook(param: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Data fetching logic
  }, [param]);

  return { data, loading };
}

// TODO: Add comprehensive tests
```

### Step 5: Update Main Page (10 min)

```typescript
// 1. Import extracted components/hooks
import { ComponentName } from './components/ComponentName';
import { useCustomHook } from './hooks/useCustomHook';

// 2. Use in component
export default function Page() {
  const { data, loading } = useCustomHook(id);

  if (loading) return <div>Loading...</div>;

  return (
    <main>
      <ComponentName data={data} onAction={() => {}} />
    </main>
  );
}
```

---

## Page-by-Page Breakdown

### Page 2: learning-path/page.tsx (725 lines)

**Extract**:

1. `LearningPathHeader` (~150 lines) - Header with progress, filters
2. `LearningPathGrid` (~200 lines) - Grid of learning path cards
3. `ProgressSidebar` (~120 lines) - User progress tracking

**Hook**:

- `useLearningPaths()` - Fetch learning paths and user progress

**Target**: ~400 lines

---

### Page 3: chat/page.tsx (701 lines)

**Extract**:

1. `ChatMessageList` (~250 lines) - Message list with scrolling
2. `ChatInputPanel` (~120 lines) - Input with attachments, send button
3. `ChatSidebar` (~150 lines) - Conversations list

**Hook**:

- `useChatMessages()` - WebSocket/polling for messages
- `useChatInput()` - Input state, file uploads

**Target**: ~400 lines

---

### Page 4: discovery/task page (631 lines)

**Extract**:

1. `TaskInstructionsPanel` (~180 lines) - Task description, instructions
2. `TaskChatPanel` (~200 lines) - Chat interface for task
3. `TaskEvaluationPanel` (~120 lines) - Evaluation results

**Hook**:

- `useTaskData()` - Load task, scenario, program data

**Target**: ~400 lines

---

### Page 5: discovery/complete page (589 lines)

**Extract**:

1. `CompletionSummary` (~150 lines) - Summary card with scores
2. `TaskResultsList` (~200 lines) - List of completed tasks with evaluations
3. `NextStepsPanel` (~100 lines) - Recommendations, next actions

**Hook**:

- `useProgramCompletion()` - Fetch completion data

**Target**: ~400 lines

---

### Page 6: discovery/scenarios page (579 lines)

**Extract**:

1. `ScenarioHeader` (~120 lines) - Similar to PBL, can reuse pattern
2. `ScenarioOverview` (~150 lines) - Objectives, prerequisites
3. `ProgramsList` (~180 lines) - Programs list with progress

**Hook**:

- `useDiscoveryScenario()` - Load scenario and programs

**Target**: ~400 lines

---

### Page 7: dashboard/page.tsx (519 lines)

**Extract**:

1. `DashboardStats` (~120 lines) - Stats cards (programs, scenarios, achievements)
2. `RecentActivity` (~150 lines) - Recent programs, progress
3. `RecommendationsPanel` (~120 lines) - Recommended scenarios

**Hook**:

- `useDashboardData()` - Load all dashboard data

**Target**: ~400 lines

---

### Page 8: relations/page.tsx (493 lines)

**Extract**:

1. `RelationsGraph` (~180 lines) - Graph visualization
2. `RelationsFilter` (~80 lines) - Filters for graph
3. `RelationDetails` (~100 lines) - Selected relation details

**Hook**:

- `useRelations()` - Load relations data

**Target**: ~400 lines

---

### Page 9-12: Simpler Pages (461-442 lines)

For pages already close to target:

- Extract 1-2 largest components (~100-150 lines each)
- **No hooks** unless complex data fetching
- **Minimal changes** to reduce risk

**Target**: ~400 lines each

---

## Code Patterns to Reuse

### 1. Data Fetching Hook Pattern

```typescript
export function useData(id: string, language: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `/api/.../${id}?lang=${language}`,
        );
        if (!ignore && response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (error) {
        if (!ignore) console.error("Error:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [id, language]);

  return { data, loading };
}
```

### 2. Component Extraction Pattern

```typescript
// Before (in main page)
<div className="bg-white p-6 rounded-lg">
  <h2>Title</h2>
  <p>{data.description}</p>
  {/* 100+ more lines */}
</div>

// After (extracted component)
<ComponentName data={data} />
```

### 3. Props Interface Pattern

```typescript
interface Props {
  // Required props (no optional unless really needed)
  data: DataType;
  onAction: (id: string) => void;

  // Optional props (only if truly optional)
  className?: string;
  isLoading?: boolean;
}

export function Component({ data, onAction, className, isLoading }: Props) {
  // Implementation
}
```

---

## Quality Checklist (Minimum)

### Before Committing

```bash
# 1. TypeScript check
npx tsc --noEmit | grep -E "(error|[PATH])"

# 2. Build check
npm run build | grep -E "(error|warning)" | grep "[PATH]"

# 3. Line count check
wc -l src/app/[PATH]/page.tsx
# Should be ~400 or less

# 4. Git status
git status
# Should only show relevant files
```

### Commit Template

```bash
git commit -m "refactor(pragmatic): [page name] ([before]→[after] lines, -[%])

Pragmatic extraction:
- Component: [Name] (~[N] lines)
- Component: [Name] (~[N] lines)
- Hook: [name] (~[N] lines) [if applicable]

⚠️ TODO: Add comprehensive tests

Results:
- Line reduction: [N] lines ([%]%)
- TypeScript errors: 0
- Build: success

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Time Estimates

### Per Page (Pragmatic Approach)

- Analysis: 5 min
- Directory setup: 1 min
- Extract components (2-3): 30-45 min
- Extract hook (if needed): 15 min
- Update main page: 10 min
- Quality gates: 5 min
- Commit: 2 min

**Total**: ~70-80 minutes per page

### Full Phase 3B (11 Pages)

- **Optimistic**: 11 pages × 70 min = 12.8 hours (~2 days)
- **Realistic**: 11 pages × 80 min = 14.7 hours (~2-3 days)
- **With breaks**: ~3-4 days

---

## Tips for Speed

1. **Batch Similar Pages**: Do all scenario detail pages together, reuse patterns
2. **Copy-Paste First**: Extract JSX, adjust imports later
3. **Skip Optimization**: Don't optimize during refactoring
4. **Minimal Props**: Only pass what's needed, no prop drilling
5. **TODO Tests**: Always add TODO comment, don't write tests now
6. **Commit Often**: Commit after each page, don't batch

---

## Common Pitfalls

### ❌ DON'T

1. **Don't optimize**: Focus on extraction, not perfection
2. **Don't add features**: Only refactor existing code
3. **Don't over-engineer**: 2-3 components max per page
4. **Don't write tests now**: Mark as TODO for Phase 3C
5. **Don't batch commits**: Commit after each page

### ✅ DO

1. **Keep it simple**: Extract obvious chunks
2. **Preserve functionality**: Don't change behavior
3. **Use TypeScript**: But don't fight type errors too long
4. **Copy patterns**: Reuse successful extractions
5. **Commit frequently**: One page = one commit

---

## Need Help?

### Quick Reference

- **Pattern**: See Page 1 (`src/app/pbl/scenarios/[id]/`)
- **Tests**: See `__tests__/` examples (for Phase 3C)
- **Status**: Check `REFACTORING-PHASE3-STATUS.md`
- **Questions**: Ping #frontend-refactoring channel

---

**Good luck! You've got this! 🚀**

---

**Version**: 1.0
**Last Updated**: 2025-11-30
**Next Review**: After Phase 3B completion
