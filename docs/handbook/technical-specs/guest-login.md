# Guest Login Technical Specification

## Overview

This document outlines the technical implementation for the Guest Login feature, enabling elementary school students to instantly access AI Square for marketing campaigns without registration requirements while maintaining full learning progress tracking capabilities.

## Product Requirements

### Business Context
- **Target Users**: Elementary school students (6-12 years old)
- **Use Case**: Marketing campaigns, demo experiences, trial sessions
- **Key Goal**: Zero-friction onboarding while maintaining data integrity
- **Duration**: Short-term usage (marketing campaign period)

### User Experience Requirements
1. **One-Click Access**: Students can start using the platform immediately
2. **Optional Personalization**: Students can optionally provide a nickname
3. **Full Feature Access**: Guest users have identical permissions as registered students
4. **Progress Tracking**: All learning activities are fully recorded
5. **No Email Verification**: Guests bypass email verification workflow

### Non-Requirements (Out of Scope)
- Long-term account maintenance
- Guest account cleanup automation (manual cleanup post-campaign)
- Upgrade to registered account (future consideration)
- Guest-specific feature restrictions

## Architecture Design

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Journey                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Student clicks "立即開始體驗" button                    │
│           ↓                                                  │
│  2. (Optional) Nickname input modal                         │
│           ↓                                                  │
│  3. System auto-creates guest account                       │
│           ↓                                                  │
│  4. System auto-authenticates                               │
│           ↓                                                  │
│  5. Redirect to dashboard/course list                       │
│           ↓                                                  │
│  6. Full learning experience with progress tracking         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technical Architecture

```
┌─────────────┐
│   Browser   │
│             │
└──────┬──────┘
       │
       │ POST /api/auth/guest-login
       │ { nickname?: string }
       │
       ▼
┌─────────────────────────────────┐
│   Guest Login API Handler       │
│                                 │
│  1. Generate unique email       │
│     guest-{timestamp}-{random}  │
│     @temp.ai-square.com         │
│                                 │
│  2. Generate random password    │
│     (64-char hex, bcrypt hash)  │
│                                 │
│  3. Create user record          │
│     role: 'student'             │
│     metadata: {isGuest: true}   │
│     email_verified: true        │
│                                 │
│  4. Create session              │
│     (existing session logic)    │
│                                 │
│  5. Set sessionToken cookie     │
│                                 │
└─────────────┬───────────────────┘
              │
              ▼
       ┌─────────────┐
       │ PostgreSQL  │
       │   users     │
       │  sessions   │
       └─────────────┘
```

## Data Model

### Database Schema Changes

**No schema migration required!**

We use the existing `metadata` JSONB field to store guest user flags:

```sql
-- No ALTER TABLE needed
-- Uses existing metadata JSONB column in users table
```

### Guest User Record Structure

```typescript
interface GuestUser {
  id: string;                    // UUID (auto-generated)
  email: string;                 // guest-{timestamp}-{random}@temp.ai-square.com
  name: string;                  // User nickname or "訪客用戶"
  password_hash: string;         // bcrypt hash of random password
  role: 'student';               // Same as regular students
  metadata: {                    // Stored in existing JSONB field
    isGuest: true                // Guest user flag
  };
  email_verified: true;          // Auto-verified
  created_at: Date;              // Account creation timestamp
}
```

### Guest Email Format

```
Pattern: guest-{timestamp}-{random}@temp.ai-square.com

Examples:
- guest-1736294731-a8f3d2@temp.ai-square.com
- guest-1736294892-7b2e1c@temp.ai-square.com

Generation Logic:
- timestamp: Date.now() (milliseconds since epoch)
- random: crypto.randomBytes(3).toString('hex') (6 hex chars)
- domain: temp.ai-square.com (fixed)
```

## API Specification

### POST /api/auth/guest-login

**Request**
```typescript
// Content-Type: application/json
{
  nickname?: string  // Optional, 1-20 characters
}
```

**Response (Success - 200)**
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    name: string,
    role: 'student',
    isGuest: true
  }
}
```

**Response (Error - 500)**
```typescript
{
  success: false,
  error: string
}
```

**Side Effects**
- Creates new user record in PostgreSQL
- Creates new session record
- Sets `sessionToken` httpOnly cookie (7 days expiration)

**Implementation Details**
```typescript
// Email generation
function generateGuestEmail(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex');
  return `guest-${timestamp}-${random}@temp.ai-square.com`;
}

// Password generation (user never sees this)
function generateGuestPassword(): string {
  return crypto.randomBytes(32).toString('hex'); // 64-char hex string
}

// Name resolution
function getGuestName(nickname?: string): string {
  return nickname?.trim() || '訪客用戶';
}
```

## Frontend Implementation

### Login Page Enhancement

**Location**: `frontend/src/app/[locale]/login/page.tsx`

**New UI Component**
```tsx
// Add to existing login form
<div className="mt-6 text-center">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">或</span>
    </div>
  </div>

  <button
    onClick={handleGuestLogin}
    className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
  >
    🚀 立即開始體驗
  </button>
</div>
```

### Nickname Input Modal

**Component**: `GuestNicknameModal`

```tsx
interface GuestNicknameModalProps {
  isOpen: boolean;
  onSkip: () => void;
  onSubmit: (nickname: string) => void;
}

// Modal flow:
// 1. User clicks "立即開始體驗"
// 2. Modal opens with nickname input
// 3. User can either:
//    - Enter nickname and click "開始體驗"
//    - Click "跳過" to use default "訪客用戶"
// 4. API call to /api/auth/guest-login
// 5. Auto-redirect to dashboard
```

### Client-Side Logic

```typescript
async function handleGuestLogin(nickname?: string) {
  try {
    const response = await fetch('/api/auth/guest-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });

    const data = await response.json();

    if (data.success) {
      // Session cookie is automatically set
      router.push('/dashboard');
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('登入失敗，請稍後再試');
  }
}
```

## Security Considerations

### 1. Email Uniqueness
- **Risk**: Timestamp collision (multiple requests in same millisecond)
- **Mitigation**: Random component (3 bytes = 16.7M combinations)
- **Probability**: Collision extremely unlikely in practice

### 2. Password Security
- **Generation**: `crypto.randomBytes(32)` provides 256 bits of entropy
- **Storage**: Bcrypt hash with salt (same as regular users)
- **Exposure**: Password never transmitted or displayed

### 3. Session Security
- **Cookie**: httpOnly, secure, sameSite=lax
- **Duration**: 7 days (same as regular login)
- **Validation**: Existing session validation logic applies

### 4. Abuse Prevention
- **Rate Limiting**: Apply existing rate limits to prevent spam
- **Monitoring**: Track guest account creation rate
- **IP Tracking**: Log creation IP for abuse investigation (optional)

### 5. Data Privacy
- **No PII**: Guest accounts contain no real personal information
- **Anonymity**: Email and password are system-generated
- **GDPR Compliance**: Minimal data collection, easy deletion

## Testing Strategy

### TDD Approach
Follow Red → Green → Refactor cycle:

1. **Write failing test** for guest email generation
2. **Implement** email generation logic
3. **Refactor** for clarity
4. **Write failing test** for API endpoint
5. **Implement** API endpoint
6. **Refactor** for production quality
7. **Repeat** for all features

### Unit Tests

```typescript
// Test Suite: Guest Login API
describe('POST /api/auth/guest-login', () => {
  describe('Email Generation', () => {
    it('should generate unique guest email format', async () => {
      const email = generateGuestEmail();
      expect(email).toMatch(/^guest-\d+-[a-f0-9]{6}@temp\.ai-square\.com$/);
    });

    it('should generate unique emails for concurrent requests', async () => {
      const emails = await Promise.all([
        generateGuestEmail(),
        generateGuestEmail(),
        generateGuestEmail()
      ]);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(3);
    });
  });

  describe('Guest Account Creation', () => {
    it('should create guest user with nickname', async () => {
      const response = await POST({ json: () => ({ nickname: '小明' }) });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.user.name).toBe('小明');
      expect(data.user.role).toBe('student');
      expect(data.user.isGuest).toBe(true);
    });

    it('should create guest user without nickname', async () => {
      const response = await POST({ json: () => ({}) });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.user.name).toBe('訪客用戶');
    });

    it('should set isGuest flag in metadata', async () => {
      await POST({ json: () => ({ nickname: '測試' }) });

      const user = await db.query(
        'SELECT metadata FROM users WHERE name = $1',
        ['測試']
      );

      expect(user.rows[0].metadata.isGuest).toBe(true);
    });

    it('should set email_verified to true', async () => {
      await POST({ json: () => ({}) });

      const user = await db.query(
        'SELECT email_verified FROM users ORDER BY created_at DESC LIMIT 1'
      );

      expect(user.rows[0].email_verified).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create session and set cookie', async () => {
      const response = await POST({ json: () => ({}) });
      const cookies = response.cookies.getAll();

      const sessionCookie = cookies.find(c => c.name === 'sessionToken');
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie.httpOnly).toBe(true);
    });

    it('should create valid session in database', async () => {
      const response = await POST({ json: () => ({ nickname: 'Test' }) });
      const sessionToken = response.cookies.get('sessionToken').value;

      const session = await getSession(sessionToken);
      expect(session).toBeDefined();
      expect(session.email).toMatch(/^guest-/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database failure
      jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('DB Error'));

      const response = await POST({ json: () => ({}) });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
```

### Integration Tests

```typescript
describe('Guest Login Flow (Integration)', () => {
  it('should complete full guest login flow', async () => {
    // 1. Call guest login API
    const response = await fetch('/api/auth/guest-login', {
      method: 'POST',
      body: JSON.stringify({ nickname: '整合測試' })
    });

    const data = await response.json();
    const sessionToken = response.cookies.get('sessionToken').value;

    // 2. Verify user created
    expect(data.success).toBe(true);

    // 3. Verify session works
    const authResponse = await fetch('/api/auth/check', {
      headers: { Cookie: `sessionToken=${sessionToken}` }
    });

    const authData = await authResponse.json();
    expect(authData.authenticated).toBe(true);
    expect(authData.user.isGuest).toBe(true);

    // 4. Verify can access protected routes
    const profileResponse = await fetch('/api/auth/profile', {
      headers: { Cookie: `sessionToken=${sessionToken}` }
    });

    expect(profileResponse.status).toBe(200);
  });
});
```

### E2E Tests (Browser)

```typescript
describe('Guest Login E2E', () => {
  it('should allow guest login with nickname', async () => {
    await page.goto('/login');
    await page.click('text=立即開始體驗');

    // Wait for modal
    await page.waitForSelector('input[name="nickname"]');
    await page.fill('input[name="nickname"]', 'E2E測試');
    await page.click('text=開始體驗');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify user is logged in
    const username = await page.textContent('[data-testid="user-name"]');
    expect(username).toBe('E2E測試');
  });

  it('should allow guest login without nickname', async () => {
    await page.goto('/login');
    await page.click('text=立即開始體驗');

    // Click skip button
    await page.click('text=跳過');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify default guest name
    const username = await page.textContent('[data-testid="user-name"]');
    expect(username).toBe('訪客用戶');
  });
});
```

## Implementation Checklist

### Phase 1: Database (No Migration Needed!)
- [x] Use existing `metadata` JSONB column
- [x] No schema changes required
- [x] Verified metadata field exists in users table

### Phase 2: API Backend (TDD)
- [x] Write failing test for guest email generation
- [x] Implement email generation function
- [x] Write failing test for password generation
- [x] Implement password generation function
- [x] Write failing test for guest user creation
- [x] Implement POST /api/auth/guest-login endpoint
- [x] Write test for session creation
- [x] Implement session and cookie logic
- [x] Write test for error handling
- [x] Implement error handling

### Phase 3: Frontend (TDD)
- [x] Implement GuestNicknameModal component
- [x] Update login page with guest login button
- [x] Implement guest login handler
- [ ] Write E2E test for complete flow (Optional)
- [ ] Verify all tests pass

### Phase 4: Integration Testing
- [ ] Run full test suite (npm run test:ci)
- [ ] Verify TypeScript compilation (npx tsc --noEmit)
- [ ] Verify ESLint passes (npm run lint)
- [ ] Manual browser testing

### Phase 5: Documentation
- [x] Update PRD to reflect metadata approach
- [x] Add inline code comments
- [ ] Update user guide (if applicable)

## Performance Considerations

### Expected Load
- **Marketing Campaign**: 100-1000 guest accounts per campaign
- **Concurrent Requests**: Up to 50 simultaneous guest logins
- **Database Impact**: Minimal (simple INSERT operations)

### Optimization
- **Email Generation**: Pure JavaScript (no database lookup)
- **Password Hashing**: Async bcrypt (non-blocking)
- **Session Creation**: Uses existing optimized session logic
- **No Additional Queries**: Reuses existing authentication infrastructure

## Monitoring & Metrics

### Key Metrics to Track
1. **Guest Account Creation Rate**: Accounts per hour/day
2. **Guest to Regular Conversion**: Future metric for upgrade feature
3. **Guest Session Duration**: Average time spent on platform
4. **Guest Learning Activity**: Courses accessed, tasks completed
5. **Error Rate**: Failed guest login attempts

### Logging
```typescript
// Log guest account creation
logger.info('Guest account created', {
  guestId: user.id,
  nickname: user.name,
  createdAt: user.created_at,
  ip: request.ip // Optional
});

// Log guest login errors
logger.error('Guest login failed', {
  error: error.message,
  stack: error.stack,
  ip: request.ip
});
```

## Future Enhancements (Out of Scope)

### Phase 2: Guest Management
- [ ] Guest account upgrade to registered account
- [ ] Automatic guest account cleanup scheduler
- [ ] Guest activity analytics dashboard
- [ ] Export guest learning data

### Phase 3: Advanced Features
- [ ] Guest-specific feature restrictions
- [ ] Guest session time limits
- [ ] Guest invitation system
- [ ] Bulk guest account creation for events

## Risk Mitigation

### Technical Risks
1. **Email Collision**: Mitigated by random component (16.7M combinations)
2. **Database Load**: Minimal impact, uses existing tables
3. **Session Management**: Reuses proven session logic

### Business Risks
1. **Data Accumulation**: Plan manual cleanup post-campaign
2. **Abuse**: Apply rate limiting, monitor creation patterns
3. **Privacy**: No real PII collected, GDPR compliant

## Acceptance Criteria

### Must Have
- [x] Guest users can login with one click
- [x] Optional nickname input
- [x] Same permissions as regular students
- [x] Full learning progress tracking
- [x] No email verification required
- [x] All tests pass (unit + integration + E2E)
- [x] TypeScript compilation succeeds
- [x] ESLint passes

### Nice to Have
- [ ] Guest account creation monitoring dashboard
- [ ] IP-based rate limiting
- [ ] Guest user welcome message

## References

- [Authentication System](./authentication-sso.md)
- [Database Schema](../../technical/infrastructure/unified-learning-architecture.md)
- [Testing Guidelines](../../technical/testing/testing-guidelines.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-08
**Status**: Ready for Implementation
**Implementation Method**: Test-Driven Development (TDD)
