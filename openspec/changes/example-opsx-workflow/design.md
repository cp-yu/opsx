# Technical Design: User Authentication

## Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────────────────┐
│      API Layer (Express)        │
│  ┌──────────────────────────┐  │
│  │  Auth Routes             │  │
│  │  - POST /auth/register   │  │
│  │  - POST /auth/login      │  │
│  │  - POST /auth/logout     │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│    Auth Service Layer           │
│  ┌──────────────────────────┐  │
│  │  - validateCredentials() │  │
│  │  - hashPassword()        │  │
│  │  - generateToken()       │  │
│  │  - verifyToken()         │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│      Data Layer                 │
│  ┌──────────────────────────┐  │
│  │  PostgreSQL              │  │
│  │  - users table           │  │
│  │  - sessions table        │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  Redis                   │  │
│  │  - rate limiting         │  │
│  │  - session cache         │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  locked_until TIMESTAMP,
  failed_attempts INT DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Audit Log Table

```sql
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_audit_created_at ON auth_audit_log(created_at);
```

## File Structure

```
src/
├── auth/
│   ├── index.ts                 # Exports
│   ├── routes.ts                # Express routes
│   ├── service.ts               # Business logic
│   ├── validation.ts            # Zod schemas
│   ├── middleware.ts            # Auth middleware
│   └── types.ts                 # TypeScript types
├── database/
│   ├── migrations/
│   │   └── 001_create_auth_tables.sql
│   └── client.ts                # DB connection
└── utils/
    ├── jwt.ts                   # JWT utilities
    └── rate-limit.ts            # Rate limiting
```

## Key Components

### 1. Registration Flow

```typescript
// POST /api/auth/register
async function register(req, res) {
  // 1. Validate input
  const { email, password, name } = validateRegistration(req.body);

  // 2. Check if email exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Create user
  const user = await db.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, passwordHash, name]
  );

  // 5. Generate JWT
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '24h' });

  // 6. Store session
  await storeSession(user.id, token, req.ip, req.headers['user-agent']);

  // 7. Return response
  return res.status(201).json({ user, token });
}
```

### 2. Login Flow

```typescript
// POST /api/auth/login
async function login(req, res) {
  // 1. Validate input
  const { email, password } = validateLogin(req.body);

  // 2. Check rate limit
  await checkRateLimit(req.ip);

  // 3. Find user
  const user = await db.query(
    'SELECT id, email, name, password_hash, locked_until, failed_attempts FROM users WHERE email = $1',
    [email]
  );

  if (user.rows.length === 0) {
    await logAuditEvent(null, 'login', false, req.ip);
    throw new UnauthorizedError('Invalid email or password');
  }

  // 4. Check if account locked
  if (user.locked_until && user.locked_until > new Date()) {
    throw new UnauthorizedError('Account temporarily locked');
  }

  // 5. Verify password
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    await incrementFailedAttempts(user.id);
    await logAuditEvent(user.id, 'login', false, req.ip);
    throw new UnauthorizedError('Invalid email or password');
  }

  // 6. Reset failed attempts
  await resetFailedAttempts(user.id);

  // 7. Generate JWT
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '24h' });

  // 8. Store session
  await storeSession(user.id, token, req.ip, req.headers['user-agent']);

  // 9. Log success
  await logAuditEvent(user.id, 'login', true, req.ip);

  // 10. Return response
  return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
}
```

### 3. Auth Middleware

```typescript
async function requireAuth(req, res, next) {
  // 1. Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.substring(7);

  // 2. Verify JWT
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (err) {
    throw new UnauthorizedError('Invalid token');
  }

  // 3. Check session exists
  const session = await db.query(
    'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
    [hashToken(token)]
  );

  if (session.rows.length === 0) {
    throw new UnauthorizedError('Session expired');
  }

  // 4. Attach user to request
  req.userId = payload.userId;
  next();
}
```

## Security Considerations

1. **Password Hashing** — bcrypt with cost factor 10
2. **JWT Signing** — HS256 algorithm with strong secret
3. **Rate Limiting** — Redis-based, 5 attempts per 15 minutes
4. **Account Locking** — 10 failed attempts locks for 1 hour
5. **Session Storage** — hash tokens before storing
6. **Audit Logging** — all auth events logged with IP
7. **Input Validation** — Zod schemas for all inputs
8. **SQL Injection** — parameterized queries only
9. **Timing Attacks** — constant-time password comparison

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "zod": "^3.22.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "vitest": "^1.0.0"
  }
}
```

## Testing Strategy

- **Unit tests** — service functions, validation, utilities
- **Integration tests** — API endpoints with test database
- **Security tests** — rate limiting, SQL injection, XSS
- **Performance tests** — bcrypt timing, concurrent logins

**Target:** >90% code coverage
