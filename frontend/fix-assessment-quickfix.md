# Quick Fix for Assessment Module

## Problem
The assessment module shows "Failed to load assessment data" because:
1. The program was created by one user
2. You're trying to access it as a different user
3. The API returns 403 Forbidden due to user mismatch

## Quick Solutions

### Solution 1: Clear Browser Data (Easiest)
1. Open browser DevTools (F12)
2. Go to Application tab > Storage
3. Click "Clear site data"
4. Refresh the page
5. Start a fresh assessment

### Solution 2: Use Console Commands
Open browser console and run:
```javascript
// Clear all local data
localStorage.clear();
sessionStorage.clear();

// Set a new user
document.cookie = 'user=' + encodeURIComponent(JSON.stringify({
  email: 'testuser' + Date.now() + '@example.com',
  name: 'Test User'
})) + '; path=/';
document.cookie = 'isLoggedIn=true; path=/';

// Reload
location.reload();
```

### Solution 3: Start Fresh Assessment
1. Go to http://localhost:3000/assessment
2. Click on "AI Literacy Assessment"
3. Click "Start New Assessment"
4. Complete all 4 tasks (12 questions total)
5. View results on completion page

## Why This Happens
- Each program is tied to a specific user email
- If your browser cookie changes, you lose access to old programs
- The system enforces strict user ownership for security

## Permanent Fix (Developer)
To implement a proper fix:
1. Add user account system with proper authentication
2. Use JWT tokens instead of simple cookies
3. Implement proper session management
4. Add admin tools to manage/reset data

## Testing Tips
- Always use the same user throughout a session
- Use incognito/private browsing for clean tests
- Check browser console for the current user:
  ```javascript
  console.log(document.cookie);
  ```