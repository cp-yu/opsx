# User Login Specification

## Overview

Allow existing users to authenticate with email and password.

## Endpoint

```
POST /api/auth/login
```

## Request

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation:**
- `email` — required, valid email format
- `password` — required, non-empty string

## Response

**Success (200 OK):**
```json
{
  "user": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-24T10:30:00Z"
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

**Error (429 Too Many Requests):**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts. Try again in 15 minutes."
}
```

## Business Rules

1. **Credential validation** — verify email exists and password matches hash
2. **Generic error messages** — don't reveal if email exists (security)
3. **Token generation** — create JWT with 24-hour expiry
4. **Rate limiting** — 5 failed attempts per IP per 15 minutes
5. **Audit logging** — log all login attempts (success and failure)

## Security

- Use constant-time comparison for password verification
- Never reveal whether email exists in error messages
- Lock account after 10 failed attempts in 1 hour
- Log IP address and user agent for security monitoring
- Use secure JWT signing algorithm (HS256 minimum)

## Test Scenarios

### Successful Login
```
GIVEN existing user with email "user@example.com"
AND correct password
WHEN POST /api/auth/login
THEN status 200
AND JWT token returned
AND token contains user ID
AND token expires in 24 hours
```

### Invalid Password
```
GIVEN existing user with email "user@example.com"
AND incorrect password
WHEN POST /api/auth/login
THEN status 401
AND error message "Invalid email or password"
AND login attempt logged
```

### Non-existent Email
```
GIVEN no user with email "nonexistent@example.com"
WHEN POST /api/auth/login
THEN status 401
AND error message "Invalid email or password"
AND no indication that email doesn't exist
```

### Rate Limiting
```
GIVEN 5 failed login attempts from same IP
WHEN POST /api/auth/login (6th attempt)
THEN status 429
AND error message about rate limit
AND retry-after header set
```

### Account Locked
```
GIVEN user account locked due to failed attempts
WHEN POST /api/auth/login with correct credentials
THEN status 401
AND error message "Account temporarily locked"
```

### Missing Fields
```
GIVEN request without password
WHEN POST /api/auth/login
THEN status 400
AND error message "Password is required"
```

## Implementation Notes

- Use bcrypt.compare() for password verification
- Use jsonwebtoken.sign() for token generation
- Store failed attempts in Redis with TTL
- Use middleware for rate limiting
- Log to audit table with timestamp, IP, user agent
- Return same error message for invalid email and password
