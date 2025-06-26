# Authentication & SSO Technical Specification

## Overview

This document outlines the technical implementation for the authentication and Single Sign-On (SSO) system for AI Square, supporting OAuth2 integration with Google and GitHub providers.

## Architecture Design

### Authentication Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────>│  Next.js    │────>│  FastAPI    │
│             │     │  Frontend   │     │  Backend    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    ▼
       │                    │            ┌─────────────┐
       │                    │            │ PostgreSQL  │
       │                    │            │   Users DB  │
       │                    │            └─────────────┘
       │                    ▼
       └─────────>┌─────────────────┐
                  │ OAuth Providers │
                  │ • Google        │
                  │ • GitHub        │
                  └─────────────────┘
```

## Technical Requirements

### Frontend (Next.js)
- NextAuth.js v5 for authentication management
- Session management with JWT tokens
- Secure cookie handling
- CSRF protection

### Backend (FastAPI)
- OAuth2 token validation
- User profile management
- Session synchronization
- API key management for service accounts

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(provider, provider_id)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Details

### 1. OAuth2 Configuration

#### Google OAuth2
```typescript
// frontend/lib/auth/providers/google.ts
export const googleProvider = {
  id: 'google',
  name: 'Google',
  type: 'oauth',
  authorization: {
    params: {
      prompt: 'consent',
      access_type: 'offline',
      response_type: 'code',
      scope: 'openid email profile'
    }
  },
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  wellKnown: 'https://accounts.google.com/.well-known/openid-configuration'
}
```

#### GitHub OAuth2
```typescript
// frontend/lib/auth/providers/github.ts
export const githubProvider = {
  id: 'github',
  name: 'GitHub',
  type: 'oauth',
  authorization: {
    params: {
      scope: 'read:user user:email'
    }
  },
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: profile.name || profile.login,
      email: profile.email,
      image: profile.avatar_url
    }
  }
}
```

### 2. NextAuth.js Configuration

```typescript
// frontend/lib/auth/config.ts
import { NextAuthConfig } from 'next-auth'
import { googleProvider } from './providers/google'
import { githubProvider } from './providers/github'

export const authConfig: NextAuthConfig = {
  providers: [googleProvider, githubProvider],
  
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        // First login
        const backendUser = await createOrUpdateUser({
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          provider: account.provider,
          provider_id: account.providerAccountId
        })
        
        token.userId = backendUser.id
        token.accessToken = account.access_token
      }
      return token
    },
    
    async session({ session, token }) {
      session.userId = token.userId
      session.accessToken = token.accessToken
      return session
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  }
}
```

### 3. Backend API Integration

```python
# backend/auth/oauth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self, db_session):
        self.db = db_session
        
    async def create_or_update_user(self, user_data: dict):
        """Create or update user from OAuth provider data"""
        user = await self.db.users.find_one({
            "provider": user_data["provider"],
            "provider_id": user_data["provider_id"]
        })
        
        if user:
            # Update existing user
            user.update({
                "last_login_at": datetime.utcnow(),
                "name": user_data.get("name", user.name),
                "avatar_url": user_data.get("avatar_url", user.avatar_url)
            })
        else:
            # Create new user
            user = {
                "email": user_data["email"],
                "name": user_data.get("name"),
                "avatar_url": user_data.get("avatar_url"),
                "provider": user_data["provider"],
                "provider_id": user_data["provider_id"],
                "created_at": datetime.utcnow(),
                "last_login_at": datetime.utcnow(),
                "is_active": True
            }
            
        await self.db.users.save(user)
        return user
        
    async def verify_token(self, token: str):
        """Verify JWT token from frontend"""
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials"
                )
            return user_id
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
```

### 4. Protected Routes

```typescript
// frontend/middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/auth/signin'
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/protected/:path*',
    '/learning/:path*',
    '/assessment/:path*'
  ]
}
```

## API Specifications

### Authentication Endpoints

#### POST /api/auth/signin
Initiates OAuth flow
```json
{
  "provider": "google" | "github",
  "callbackUrl": "/dashboard"
}
```

#### GET /api/auth/callback/{provider}
OAuth callback handler

#### POST /api/auth/signout
Signs out current user

#### GET /api/auth/session
Returns current session
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "image": "https://avatar.url"
  },
  "expires": "2024-02-01T00:00:00.000Z"
}
```

### User Management Endpoints

#### GET /api/users/profile
Returns authenticated user profile

#### PATCH /api/users/profile
Updates user profile
```json
{
  "name": "New Name",
  "language": "zh-TW",
  "theme": "dark"
}
```

## Security Considerations

### 1. Token Security
- Use secure, httpOnly cookies for session tokens
- Implement CSRF protection with double-submit cookies
- Rotate refresh tokens on each use
- Set appropriate token expiration times

### 2. OAuth Security
- Validate state parameter to prevent CSRF
- Use PKCE for public clients
- Validate redirect URIs
- Store client secrets securely (environment variables)

### 3. Session Management
- Implement session invalidation on logout
- Monitor for concurrent sessions
- Implement device tracking
- Add rate limiting for auth endpoints

### 4. Data Protection
- Hash sensitive data before storage
- Encrypt tokens at rest
- Use HTTPS for all communications
- Implement proper CORS policies

## Performance Requirements

### Response Times
- Login flow: < 2 seconds
- Session validation: < 100ms
- Profile fetch: < 200ms

### Scalability
- Support 10,000 concurrent sessions
- Handle 100 auth requests/second
- Session storage with Redis for horizontal scaling

### Caching Strategy
- Cache user profiles (TTL: 5 minutes)
- Cache session validation results (TTL: 1 minute)
- Use Redis for distributed session storage

## Error Handling

### Common Error Scenarios
1. **OAuth Provider Errors**
   - Provider unavailable
   - Invalid credentials
   - Scope denied

2. **Session Errors**
   - Expired session
   - Invalid token
   - Concurrent session conflict

3. **User Errors**
   - Account disabled
   - Email already exists
   - Invalid profile data

### Error Response Format
```json
{
  "error": {
    "code": "AUTH_PROVIDER_ERROR",
    "message": "Unable to authenticate with Google",
    "details": {
      "provider": "google",
      "reason": "invalid_grant"
    }
  }
}
```

## Future Enhancements

### Phase 2 (Q2 2025)
- Add Microsoft/Azure AD integration
- Implement two-factor authentication (2FA)
- Add passwordless authentication options
- Support for SAML 2.0

### Phase 3 (Q3 2025)
- Biometric authentication support
- Single Sign-On for enterprise
- Custom OAuth provider support
- Advanced session management

### Phase 4 (Q4 2025)
- Blockchain-based identity verification
- Decentralized identity support
- Zero-knowledge proof authentication
- Advanced fraud detection

## Testing Requirements

### Unit Tests
- OAuth provider configuration
- Token generation and validation
- User creation/update logic
- Session management

### Integration Tests
- Full OAuth flow testing
- Session persistence
- API endpoint authentication
- Error handling scenarios

### E2E Tests
- Complete login flow
- Protected route access
- Logout functionality
- Session timeout handling

## Monitoring & Logging

### Key Metrics
- Authentication success/failure rates
- Average login time
- Session duration
- Provider-specific metrics

### Logging Requirements
- Log all authentication attempts
- Track OAuth errors
- Monitor session creation/destruction
- Audit user profile changes

### Alerts
- High authentication failure rate
- OAuth provider downtime
- Unusual login patterns
- Session storage issues