# Manual Testing Guide - Onboarding Flow

## 🎯 Test Purpose
Verify that the onboarding goals page successfully creates an assessment program and navigates to it.

## 🚀 Prerequisites
1. Next.js development server running on port 3004 ✅
2. PostgreSQL database running and accessible ✅

## 📋 Manual Test Steps

### Test 1: Unauthenticated User (Expected Behavior)
1. **Navigate to**: http://localhost:3004/onboarding/goals
2. **Select a goal**: Click on any learning goal (🧠, 🚀, etc.)
3. **Click**: "Continue to Assessment" button
4. **Expected Result**: 
   - Alert message: "請先完成登入，然後選擇評估項目開始您的 AI 學習之旅！"
   - Redirect to: http://localhost:3004/assessment/scenarios

### Test 2: Authenticated User (Ideal Behavior)
1. **First login**: http://localhost:3004/auth/login (if available)
2. **Navigate to**: http://localhost:3004/onboarding/goals
3. **Select a goal**: Click on any learning goal
4. **Click**: "Continue to Assessment" button
5. **Expected Result**: 
   - Redirect to: http://localhost:3004/assessment/scenarios/[scenario-id]/programs/[program-id]
   - Should see assessment task page

## 🔍 Debug Information

### API Endpoints to Check
1. **Auth Check**: `curl http://localhost:3004/api/auth/check`
2. **Scenarios List**: `curl "http://localhost:3004/api/assessment/scenarios?lang=en"`
3. **Program Creation**: Should be called automatically via button click

### Browser DevTools
1. **Open DevTools** → Console tab
2. **Look for logs**:
   - "🔐 User not authenticated, redirecting..."
   - "✅ Creating program for scenario..."
   - API request logs

### Network Tab
1. **Watch for API calls**:
   - `/api/auth/check`
   - `/api/assessment/scenarios`
   - `/api/assessment/scenarios/[id]/programs` (POST)

## ✅ Success Criteria

### Minimum (Unauthenticated)
- [x] Page loads without errors
- [x] Button click triggers authentication check
- [x] Friendly fallback message shown
- [x] Redirects to scenarios page

### Ideal (Authenticated)
- [ ] Auto-creates program for first scenario
- [ ] Redirects to program task page
- [ ] No console errors
- [ ] Database has new program record

## 🛠️ Implementation Notes

The onboarding goals page (`src/app/onboarding/goals/page.tsx`) has been modified to:

1. **Check authentication** when "Continue to Assessment" is clicked
2. **Fetch first scenario** from assessment scenarios API
3. **Create program** via POST to `/api/assessment/scenarios/[id]/programs`
4. **Navigate to program** or fallback to scenarios list

## 🎯 Test Results

**Manual Test Date**: [Fill in when tested]
**Test Result**: [Pass/Fail]
**Notes**: [Add observations]