# Assessment History Display Fix

## Issue Summary
Only one completed assessment was showing in the assessment history, even when users had completed multiple assessments.

## Root Cause
The API route for fetching assessment programs had a logical flaw in `/api/assessment/scenarios/[id]/programs/route.ts`:

1. It first filtered programs by exact scenario ID match
2. Only if NO exact matches were found would it show all completed assessments
3. This meant once a user completed one assessment for a specific scenario, they would never see their other completed assessments in the history

## The Fix
Changed the logic to:
1. First check if the current scenario is an assessment type
2. If it's an assessment, always show ALL completed assessments from the user
3. If it's not an assessment (e.g., PBL scenario), only show programs specific to that scenario

## Code Changes
In `/api/assessment/scenarios/[id]/programs/route.ts`:

### Before:
```typescript
// First try to find programs with exact scenario ID match
let userPrograms = allUserPrograms.filter(p => p.scenarioId === id);

// If no direct matches and this is an assessment scenario, include all completed assessments
if (userPrograms.length === 0 && allUserPrograms.length > 0) {
  // ... check if assessment and include all completed
}
```

### After:
```typescript
// Check if this is an assessment scenario
let scenario = await scenarioRepo.findById(id);

let userPrograms;
if (scenario && scenario.sourceType === 'assessment') {
  // For assessment scenarios, show all completed assessments from this user
  userPrograms = allUserPrograms.filter(p => 
    p.status === 'completed' && p.score !== undefined
  );
} else {
  // For non-assessment scenarios, only show programs for this specific scenario
  userPrograms = allUserPrograms.filter(p => p.scenarioId === id);
}
```

## Testing
Added comprehensive unit tests to verify:
1. Assessment scenarios show ALL completed assessments
2. Non-assessment scenarios only show scenario-specific programs

## Result
Users can now see their complete assessment history across all assessments when viewing any assessment scenario detail page.