# User Registration Specification

## Overview

Allow new users to create accounts with email and password.

## Endpoint

```
POST /api/auth/register
```

## Request

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation:**
- `email` — valid email format, unique in database
- `password` — minimum 8 characters, at least one uppercase, one lowercase, one number
- `name` — 2-50 characters, optional

## Response

**Success (201 Created):**
```json
{
  "user": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-01-23T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "field": "email"
}
```

**Error (409 Conflict):**
```json
{
  "error": "EMAIL_EXISTS",
  "message": "Email already registered"
}
```

## Business Rules

1. **Email uniqueness** — one account per email
2. **Password security** — hashed with bcrypt (cost factor 10)
3. **Automatic login** — return JWT token on successful registration
4. **Token expiry** — 24 hours from creation

## Security

- Passwords never stored in plaintext
- Passwords never returned in responses
- Rate limiting: 5 attempts per IP per hour
- Input sanitization to prevent injection

## Test Scenarios

### Happy Path
```
GIVEN no existing user with email
WHEN POST /api/auth/register with valid data
THEN status 201
AND user created in database
AND JWT token returned
AND password is hashed
```

### Email Already Exists
```
GIVEN existing user with email "user@example.com"
WHEN POST /api/auth/register with same email
THEN status 409
AND error message "Email already registered"
AND no new user created
```

### Invalid Email Format
```
GIVEN invalid email "not-an-email"
WHEN POST /api/auth/register
THEN status 400
AND error message "Invalid email format"
```

### Weak Password
```
GIVEN password "123"
WHEN POST /api/auth/register
THEN status 400
AND error message includes password requirements
```

### Missing Required Fields
```
GIVEN request without email
WHEN POST /api/auth/register
THEN status 400
AND error message "Email is required"
```

## Implementation Notes

- Use Zod for request validation
- Use bcrypt with cost factor 10
- Use jsonwebtoken for JWT generation
- Store user in PostgreSQL users table
- Log registration events for audit
