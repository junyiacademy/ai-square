# Authentication System Simplification Plan

## Overview
This document outlines the plan to simplify AI Square's authentication system from multiple overlapping mechanisms to a single, secure session-based system.

## Current State (Before Simplification)
- Multiple auth mechanisms: JWT, session-simple, token-manager, auth-manager
- Insecure base64 session tokens
- Complex client/server synchronization
- Multiple fallback mechanisms causing confusion

## Target State (After Simplification)
- Single source of truth: sessionToken cookie
- Secure hex token generation (crypto.randomBytes)
- Server-side session storage
- Simplified auth utilities
- Clear separation of concerns

## Phase 1: Fix Critical Bug ✅
- Fixed `isValidSessionToken` to accept hex tokens instead of base64
- Users can now access protected routes
- Immediate problem solved

## Phase 2: Simplify System (Current)

### New Components Created:
1. **`secure-session.ts`** - Secure session management
   - Replaces insecure base64 tokens
   - Server-side session storage
   - Token expiration handling
   - Multi-session management

2. **`auth-utils-simplified.ts`** - Simplified auth extraction
   - Only checks sessionToken cookie
   - Removes multiple fallback mechanisms
   - Clear and simple interface

3. **Simplified API Routes**
   - `route-simplified.ts` versions for login/check/logout
   - Remove JWT generation
   - Use SecureSession instead

### Migration Steps:

#### Step 1: Test New System (Parallel Run)
```bash
# Test new endpoints
POST /api/auth/login-new
GET /api/auth/check-new
POST /api/auth/logout-new
```

#### Step 2: Database Migration
```sql
-- Add session storage table (if using DB instead of in-memory)
CREATE TABLE sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

#### Step 3: Switch Routes
```typescript
// Rename files
mv route-simplified.ts route.ts
mv auth-utils-simplified.ts auth-utils.ts
```

#### Step 4: Remove Old Files
```bash
# Files to remove
rm src/lib/auth/jwt.ts
rm src/lib/auth/jwt.test.ts
rm src/lib/auth/token-manager.ts
rm src/lib/auth/token-manager.test.ts
rm src/lib/auth/session-simple.ts
rm src/lib/auth/session-simple.test.ts
rm src/app/api/auth/refresh/route.ts
```

#### Step 5: Update Client Code
```typescript
// Update useAuth hook to remove refresh logic
// Update AuthContext to remove JWT handling
```

## Phase 3: Future Enhancements

### Option 1: Production-Ready Session Store
```typescript
// Use Redis for session storage
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Replace Map with Redis
sessionStore.set(token, data) → redis.setex(token, ttl, JSON.stringify(data))
sessionStore.get(token) → JSON.parse(await redis.get(token))
```

### Option 2: Migrate to NextAuth.js
- Industry-standard authentication
- OAuth provider support
- Built-in session management
- Database adapters

## Testing Strategy

### Unit Tests
- [x] SecureSession token generation
- [x] Session CRUD operations
- [x] Token validation
- [x] Session expiration
- [ ] Auth utilities
- [ ] API routes

### E2E Tests
- [ ] Login flow with new system
- [ ] Protected route access
- [ ] Session persistence
- [ ] Logout flow
- [ ] Parallel testing with old system

## Rollback Plan
If issues arise:
1. Keep old files as backups
2. Switch route names back
3. Monitor error logs
4. Fix forward if possible

## Success Metrics
- Zero authentication-related redirects
- Reduced code complexity (LOC)
- Improved security (no plaintext tokens)
- Faster auth checks (single source)
- Easier debugging

## Timeline
- Phase 1: ✅ Complete (Bug fix)
- Phase 2: In Progress (Simplification)
  - Week 1: Create new components
  - Week 2: Parallel testing
  - Week 3: Migration
  - Week 4: Cleanup
- Phase 3: Future (NextAuth.js evaluation)

## Notes
- Always test in staging first
- Keep backups of old system
- Monitor logs during migration
- Communicate changes to team
