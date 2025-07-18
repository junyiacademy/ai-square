# Visual UI Test Plan for Unified Learning Architecture

## Test Date: 2025-07-18

## Overview
This document outlines the UI pages to test across all three learning modules (PBL, Assessment, Discovery) following the 5-stage unified architecture.

## Pages to Test

### 1. PBL Module
- [ ] `/pbl/scenarios` - Scenarios list page
- [ ] `/pbl/scenarios/{id}` - Scenario detail page
- [ ] `/pbl/scenarios/{id}/programs/{programId}/tasks/{taskId}/learn` - Task learning page
- [ ] `/pbl/scenarios/{id}/programs/{programId}/complete` - Completion page

### 2. Assessment Module
- [ ] `/assessment` - Assessment landing page
- [ ] `/assessment/scenarios/{id}` - Assessment detail page (with past attempts)
- [ ] `/assessment/scenarios/{id}/programs/{programId}/tasks/{taskId}` - Assessment questions page
- [ ] `/assessment/scenarios/{id}/programs/{programId}/results` - Results page

### 3. Discovery Module
- [ ] `/discovery` - Discovery landing page
- [ ] `/discovery/scenarios` - Discovery scenarios list
- [ ] `/discovery/scenarios/{id}` - Scenario detail page
- [ ] `/discovery/scenarios/{id}/programs/{programId}/tasks/{taskId}` - Task page
- [ ] `/discovery/scenarios/{id}/programs/{programId}/complete` - Journey completion

## Testing Checklist for Each Page

### Visual Elements
- [ ] Proper layout and spacing
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Consistent theme and colors
- [ ] Readable typography

### Internationalization (i18n)
- [ ] All UI text properly translated
- [ ] Language switcher works
- [ ] No hardcoded text in any language
- [ ] RTL support for Arabic (if applicable)

### User Experience
- [ ] Loading states
- [ ] Error handling
- [ ] Navigation clarity
- [ ] Call-to-action buttons
- [ ] Progress indicators

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus indicators

## Specific Test Cases

### PBL Module
1. Navigate to scenarios list
2. Select "Climate Change Research" scenario
3. Start new program
4. Interact with AI tutor
5. Complete task
6. View completion report

### Assessment Module
1. Navigate to assessment page
2. View past attempts
3. Start new assessment
4. Answer questions
5. Submit assessment
6. View results and feedback

### Discovery Module
1. Browse career options
2. Select a career path
3. Start discovery journey
4. Complete exploration tasks
5. View career insights

## Known Issues to Verify

1. **PBL**: Chat interface not connecting to AI
2. **Assessment**: Start button may fail due to auth
3. **Discovery**: Task navigation may be broken
4. **All**: Language switching consistency

## Screenshots Needed

For each page, capture:
1. Full page view
2. Mobile responsive view
3. Any interactive states (hover, active, etc.)
4. Error states (if applicable)
5. Loading states

## Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Device Testing
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## Notes
- Test in both English and Traditional Chinese
- Check for any console errors
- Note any performance issues
- Document any unexpected behavior