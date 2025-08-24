# Authentication System Migration - 2025-08

## Summary
The AI Square frontend has migrated from a legacy multi-cookie authentication system to a single sessionToken-based system for improved security and simplicity.

## Key Changes

### 1. Cookie Structure
**Before (Legacy):**
- `user` cookie: JSON object with user data
- `isLoggedIn` cookie: boolean flag
- `accessToken` cookie: JWT token (in some places)

**After (New):**
- `sessionToken` cookie: Single encrypted session token (httpOnly, secure)

### 2. Files Modified

#### Core Authentication
- `/src/lib/auth/session.ts` - Removed fallback to old cookies
- `/src/middleware/auth.ts` - Updated to use sessionToken only
- `/src/lib/auth/auth-manager.ts` - Already using sessionToken correctly

#### API Routes
- `/src/app/api/auth/login/route.ts` - Sets sessionToken only
- `/src/app/api/auth/check/route.ts` - Checks sessionToken only
- `/src/app/api/auth/logout/route.ts` - Clears sessionToken only

### 3. Testing
New comprehensive tests have been added to ensure:
- No fallback to old cookies
- Protected routes require sessionToken
- Login/logout work correctly with new system
- No auto-migration from old cookies

Test files:
- `/src/lib/auth/__tests__/auth-integration.test.ts`
- `/src/app/api/auth/__tests__/cookie-migration.test.ts`
- `/tests/integration/auth-flow.test.ts`

## Migration Guide for Users

### If You're Getting 401 Errors:
1. Clear all browser cookies for the site
2. Login again with your credentials
3. The system will create a new sessionToken

### For Developers:
1. Always use `AuthManager` for cookie operations
2. Never access cookies directly
3. Use `getServerSession()` for server-side auth checks
4. For API calls from client, include sessionToken in x-session-token header

## Security Improvements
1. Single token reduces attack surface
2. httpOnly prevents JavaScript access
3. Secure flag ensures HTTPS-only transmission
4. No sensitive data in cookies (only encrypted token)

## Checklist for Verification

### Backend Checks
- [ ] No references to `cookies.get('user')`
- [ ] No references to `cookies.get('isLoggedIn')`
- [ ] No references to `cookies.get('accessToken')`
- [ ] All auth checks use `sessionToken`
- [ ] `getServerSession()` doesn't fall back to old cookies

### Frontend Checks
- [ ] `useAuth` hook works with new system
- [ ] Login flow sets sessionToken
- [ ] Logout clears sessionToken
- [ ] Protected routes redirect properly

### Testing
- [ ] All auth integration tests pass
- [ ] No TypeScript errors related to auth
- [ ] E2E tests work with new auth system

## Common Issues and Solutions

### Issue: "Unauthorized" on protected routes
**Solution:** User needs to login again to get sessionToken

### Issue: API calls failing with 401
**Solution:** Ensure sessionToken is being sent in cookies or x-session-token header

### Issue: Admin routes not accessible
**Solution:** Admin role is inferred from email for demo accounts (admin@example.com)

## Future Improvements
1. Add refresh token mechanism
2. Implement proper role storage in database
3. Add session expiry handling on frontend
4. Implement remember me functionality properly