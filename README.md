# AI-Persona Backend

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A secure, scalable, and enterprise-grade multi-tenant backend for the AI-Persona SaaS platform. Features comprehensive authentication, user lifecycle management, security hardening, audit logging, and automated cleanup systems.

## 🚀 Features

### 🔐 Enhanced Authentication & User Management

- **Multi-Tenant Authentication**: Local (email/password) and Google OAuth authentication
- **Account Lifecycle Management**: PENDING_VERIFY → ACTIVE → DEACTIVATED → PENDING_DELETION
- **Email Verification**: 24-hour TTL verification tokens with resend capability
- **Password Reset**: Secure token-based password reset with 1-hour TTL
- **Session Management**: Device tracking, session revocation, and token rotation
- **Account Lockout**: Automatic lockout after failed login attempts (5 attempts → 15 min)
- **GDPR Compliance**: Account deletion with 30-day grace period

### 🛡️ Security Hardening

- **Password Strength Validation**: Score-based validation (minimum score 3)
- **Breach Detection**: Integration with Have I Been Pwned API for password security
- **Rate Limiting**: Per-endpoint and per-IP rate limiting
- **Input Validation**: Comprehensive validation with express-validator
- **Security Headers**: Helmet.js with CSP, HSTS, XSS protection
- **Audit Logging**: Complete event trail with IP, user agent, and trace IDs
- **JWT Key Rotation**: RSA key pair rotation with JWKS support

### 🏢 Workspace & Role Management

- **Workspace Isolation**: Strict tenant boundaries with domain-based assignment
- **Role-Based Access Control**: ADMIN and MEMBER roles with workspace-scoped permissions
- **Smart Member Management**: Advanced filtering, pagination, and member operations
- **Profile Management**: User profile updates, avatar uploads, and password changes
- **Member Operations**: Add, remove, change roles, activate/deactivate
- **Workspace Settings**: Update workspace name, timezone, and locale settings
- **Workspace Deletion**: Request workspace deletion with 30-day grace period
- **Last Admin Protection**: Prevents demoting/deactivating the last admin in workspace

### 📊 Monitoring & Observability

- **Health Checks**: Database connectivity and service health monitoring
- **Structured Logging**: Winston JSON logs with request trace IDs
- **Audit Events**: Complete user action history with event categorization
- **Request Tracing**: Unique trace IDs for request tracking

### 🔄 Automation & Cleanup

- **Automated Cleanup Functions**: Cleanup for unverified users and expired sessions
- **Token Management**: Automatic cleanup of expired verification and reset tokens
- **Session Cleanup**: Regular cleanup of expired sessions
- **Account Lifecycle**: Automated account state management
- **Workspace Cleanup**: Daily cleanup of deleted workspaces after 30-day grace period
- **Avatar Cleanup**: Weekly cleanup of orphaned avatar files
- **Scheduled Jobs**: Cron jobs for automated maintenance tasks

### 📧 Email Services

- **Transactional Emails**: Verification, password reset, and notification emails
- **SMTP Integration**: Configurable SMTP with Nodemailer
- **Email Templates**: Professional HTML email templates
- **Delivery Tracking**: Email send success/failure logging

### 🤖 Persona Management & Chat

- **Persona Catalogue**: Read-only persona listing with favourites support
- **Webhook Integration**: Secure encrypted webhook URLs for persona communication
- **Circuit Breaker**: Automatic failure detection and recovery (5 failures → 5 min timeout)
- **Chat Relay**: Message forwarding to n8n webhooks with retry logic
- **Rate Limiting**: 60 requests/min per persona with exponential backoff
- **Conversation Management**: Private and shared conversations with workspace-wide visibility
- **Google Docs Mode**: Share conversations with workspace members (PRIVATE/SHARED)
- **Message Editing**: Edit recent messages and branch conversations (ChatGPT-style)
- **File Attachments**: Upload images and PDFs with presigned URLs (10 MB limit)
- **Message Reactions**: Like/dislike messages with toggle functionality
- **Conversation Archiving**: Archive/unarchive conversations with proper access controls
- **Shareable Links**: Create public shareable links with expiration dates (Google Docs style)
- **Audit Logging**: Complete chat, webhook, visibility change, message edit, reaction, and sharing tracking

### 📚 API & Documentation

- **OpenAPI/Swagger**: Complete API documentation with examples
- **RESTful APIs**: Comprehensive REST API with proper HTTP status codes
- **Interactive Docs**: Swagger UI for API exploration
- **Postman Collection**: Ready-to-use API collection

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Development](#development)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/))
- **npm** or **yarn** package manager
- **Docker** (optional, for containerized deployment)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-org/AI-Persona.git
cd AI-Persona/backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.template .env
# Edit .env with your configuration

# 4. Set up database
npm run migrate
npm run generate

# 5. Start development server
npm run dev
```

### Docker Deployment

```bash
# 1. Clone and navigate
git clone https://github.com/your-org/AI-Persona.git
cd AI-Persona/backend

# 2. Set up environment
cp .env.template .env
# Edit .env with production values

# 3. Start with Docker Compose
docker-compose up --build -d

# 4. Apply database migrations
docker-compose exec backend npm run migrate
```

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Email Service │
│   (React)       │◄──►│   (Express)     │◄──►│   (SMTP)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   PostgreSQL    │
                      │   (Primary DB)  │
                      └─────────────────┘
```

### Enhanced Multi-Tenant Architecture

- **Workspace Isolation**: Each tenant has a dedicated workspace with domain-based assignment
- **User Lifecycle Management**: Complete account lifecycle from registration to deletion
- **Security Boundaries**: Cross-workspace access prevention with audit logging
- **Automated Cleanup**: Scheduled cleanup functions for maintaining data hygiene
- **Scalable Design**: Horizontal scaling support with stateless application design

### Technology Stack

| Component            | Technology         | Version | Purpose                    |
| -------------------- | ------------------ | ------- | -------------------------- |
| **Runtime**          | Node.js            | 18+     | JavaScript runtime         |
| **Framework**        | Express.js         | 4.18+   | Web application framework  |
| **Database**         | PostgreSQL         | 13+     | Primary database           |
| **ORM**              | Prisma             | 6.12+   | Database toolkit           |
| **Authentication**   | JWT + Passport     | 9.0+    | Token-based auth           |
| **Email**            | Nodemailer         | 7.0+    | Transactional emails       |
| **Documentation**    | Swagger/OpenAPI    | 3.0.3   | API documentation          |
| **Security**         | Helmet + CORS      | Latest  | Security headers           |
| **Logging**          | Winston            | 3.17+   | Structured logging         |
| **Rate Limiting**    | express-rate-limit | 8.0+    | API rate limiting          |
| **Validation**       | express-validator  | 7.0+    | Input validation           |
| **Image Processing** | Sharp              | Latest  | Avatar image processing    |
| **File Upload**      | Multer             | Latest  | Multipart file uploads     |
| **Scheduling**       | node-cron          | Latest  | Automated cleanup jobs     |
| **Testing**          | Jest               | 29.7+   | Unit and integration tests |

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI Spec**: `http://localhost:3000/docs/swagger.yaml`
- **Health Check**: `http://localhost:3000/api/auth/health`
- **JWKS Endpoint**: `http://localhost:3000/api/auth/.well-known/jwks.json`

### Enhanced Authentication Endpoints

#### Account Lifecycle Management

```http
POST /api/auth/register                    # User registration with validation
POST /api/auth/login                       # User authentication with lockout
POST /api/auth/refresh                     # Token refresh with rotation
POST /api/auth/logout                      # Secure logout with session cleanup
GET  /api/auth/verify-email               # Email verification (24h TTL)
POST /api/auth/resend-verification        # Resend verification (rate limited)
POST /api/auth/request-password-reset     # Password reset request
POST /api/auth/reset-password             # Password reset with validation
```

#### Session Management

```http
GET    /api/auth/sessions                  # List user sessions
DELETE /api/auth/sessions/:sessionId      # Revoke specific session
```

#### Profile Management

```http
GET    /api/users/me                       # Get current user profile
PUT    /api/users/me                       # Update user profile
POST   /api/users/me/avatar                # Upload user avatar
PUT    /api/users/me/password              # Change user password
```

#### Workspace Management

```http
GET    /api/workspaces/:id                 # Get workspace details
PUT    /api/workspaces/:id                 # Update workspace settings (Admin)
GET    /api/workspaces/:id/members         # List workspace members (Admin)
PATCH  /api/workspaces/:id/members/:uid   # Change member role (Admin)
DELETE /api/workspaces/:id/members/:uid   # Remove member (Admin)
POST   /api/workspaces/:id/delete         # Request workspace deletion (Admin)
```

#### Account Management

```http
POST /api/auth/deactivate                 # Deactivate account
POST /api/auth/delete-account             # Request GDPR deletion
```

#### System Endpoints

```http
GET  /api/auth/health                     # Health check
GET  /.well-known/jwks.json              # JSON Web Key Set
POST /api/auth/rotate-keys                # Rotate JWT keys (admin only)
```

#### Persona Management & Chat

```http
GET    /api/personas                      # List all personas
GET    /api/personas/:id                  # Get persona details
POST   /api/personas/:id/favourite        # Toggle persona favourite
POST   /api/personas/:id/chat             # Send message to persona
GET    /api/conversations                 # List user conversations
PATCH  /api/conversations/:id/visibility  # Update conversation visibility
PATCH  /api/conversations/:id/archive    # Archive/unarchive conversation
POST   /api/conversations/:id/share      # Create shareable link
POST   /api/conversations/:id/files      # Request file upload URL
PATCH  /api/messages/:id                  # Edit message and branch conversation
POST   /api/messages/:id/reactions       # Toggle message reaction
GET    /p/:token                         # Get shared conversation (public)
```

#### Webhook Integration

```http
GET    /api/webhooks/health               # Webhook service health check
POST   /api/webhooks/traits               # Update persona traits via webhook (admin only)
```

**Webhook Authentication**: All webhook endpoints require JWT authentication and ADMIN role.

**Webhook Payload Format**:

```json
{
  "personaName": "HR Ops / Payroll Manager",
  "metadata": {
    "about": "Updated persona description",
    "coreExpertise": ["Expertise 1", "Expertise 2"],
    "communicationStyle": "Updated communication style",
    "traits": ["Trait 1", "Trait 2"],
    "painPoints": ["Pain point 1", "Pain point 2"],
    "keyResponsibilities": ["Responsibility 1", "Responsibility 2"]
  }
}
```

### Admin Operations

```http
GET  /api/admin/users                     # List workspace users
GET  /api/admin/users/:id                 # Get user details
POST /api/admin/users/:id/activate        # Activate user
POST /api/admin/users/:id/deactivate      # Deactivate user
POST /api/admin/users/:id/promote         # Promote to admin
POST /api/admin/users/:id/demote          # Demote to member
GET  /api/admin/stats                     # Workspace statistics
```

### Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

For workspace-scoped operations, include the workspace ID:

```http
x-workspace-id: <workspace_id>
```

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
SESSION_SECRET="your-session-secret"
BCRYPT_SALT_ROUNDS=12
JWT_EXPIRES_IN=15m

# Persona Configuration
ENCRYPTION_KEY="your-32-byte-encryption-key-here"
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OAUTH_CALLBACK_URL="https://yourdomain.com/api/auth/google/callback"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourdomain.com"
APP_BASE_URL="https://yourdomain.com"

# Security
CORS_ORIGIN="https://yourdomain.com"

# Logging
LOG_LEVEL="info"
```

### Environment-Specific Configurations

#### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN="http://localhost:3000"
```

#### Production

```bash
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN="https://yourdomain.com"
```

## 🚀 Deployment

### Docker Deployment

#### Production Dockerfile

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run generate
EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose

```yaml
version: "3.8"
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/aipersona
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aipersona
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Cloud Deployment

#### AWS ECS/Fargate

```bash
# Build and push Docker image
docker build -t ai-persona-backend .
docker tag ai-persona-backend:latest your-registry/ai-persona-backend:latest
docker push your-registry/ai-persona-backend:latest

# Deploy with AWS CLI
aws ecs update-service --cluster ai-persona-cluster --service backend-service --force-new-deployment
```

#### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy ai-persona-backend \
  --image gcr.io/your-project/ai-persona-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku

```bash
# Deploy to Heroku
heroku create ai-persona-backend
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=$(heroku config:get DATABASE_URL)
git push heroku main
```

### Database Migration

```bash
# Apply migrations
npm run migrate

# Generate Prisma client
npm run generate

# Reset database (development only)
npm run migrate:reset
```

## 🛠️ Development

### Project Structure

```
backend/
├── docs/                    # API documentation
│   └── swagger.yaml        # OpenAPI specification
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── src/                    # Application source code
│   ├── config/            # Configuration management
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Express middlewares
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── validationMiddleware.js
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   │   ├── authService.js
│   │   ├── emailService.js
│   │   ├── oauthService.js
│   │   ├── adminService.js
│   │   ├── profileService.js
│   │   ├── workspaceService.js
│   │   ├── breachCheckService.js
│   │   └── passwordResetService.js
│   ├── utils/             # Utility functions
│   ├── validations/       # Validation schemas
│   ├── app.js            # Express app setup
│   └── index.js          # Application entry point
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Multi-container setup
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run start            # Start production server

# Database
npm run migrate          # Apply database migrations
npm run generate         # Generate Prisma client

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ci          # Run tests in CI mode
```

### Development Workflow

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-org/AI-Persona.git
   cd AI-Persona/backend
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

````

3. **Set Up Environment**

   ```bash
   cp .env.template .env
   # Edit .env with your local configuration
````

4. **Set Up Database**

   ```bash
   npm run migrate
   npm run generate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔒 Security

### Enhanced Security Features

- **Authentication**: JWT tokens with refresh mechanism and rotation
- **Authorization**: Role-based access control (RBAC) with workspace scoping
- **Rate Limiting**: Per-endpoint rate limiting with configurable limits
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js with comprehensive security headers
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **Password Security**: bcrypt with configurable salt rounds and strength validation
- **Breach Detection**: Integration with Have I Been Pwned API
- **Workspace Isolation**: Strict tenant boundaries with audit logging
- **Account Lockout**: Automatic lockout after failed attempts
- **Session Management**: Device tracking and session revocation
- **Input Validation**: Comprehensive validation with sanitization

### Security Best Practices

1. **Environment Variables**: All secrets stored in environment variables
2. **HTTPS Only**: Enforce HTTPS in production
3. **Regular Updates**: Keep dependencies updated
4. **Access Logging**: Comprehensive access logging with Morgan
5. **Error Handling**: Secure error handling without information leakage
6. **Audit Logging**: Complete event trail for security monitoring
7. **Rate Limiting**: Prevent brute force and abuse attacks
8. **Input Validation**: Prevent injection and validation attacks

### Security Headers

```javascript
// Security headers configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

## 📊 Monitoring

### Health & Observability

- **Health Checks**: Database connectivity and service health monitoring
- **Structured Logging**: Winston JSON logs with request trace IDs
- **Audit Events**: Complete user action history with event categorization
- **Request Tracing**: Unique trace IDs for request tracking

### Available Audit Events

```bash
# Authentication Events
REGISTER
VERIFY_EMAIL
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
REFRESH_TOKEN
REQUEST_PASSWORD_RESET
RESET_PASSWORD
CHANGE_PASSWORD

# User Lifecycle Events
DEACTIVATE_ACCOUNT
REACTIVATE_ACCOUNT
ROLE_CHANGED
SESSION_REVOKED
ACCOUNT_LOCKED
ACCOUNT_UNLOCKED
```

### Monitoring Endpoints

```http
GET /api/auth/health          # Health check
GET /.well-known/jwks.json    # JWKS endpoint
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database connection
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log('Connected')).catch(console.error)"
```

#### Email Configuration Issues

```bash
# Test email configuration
node -e "const emailService = require('./src/services/emailService'); emailService.testEmailConfig().then(console.log).catch(console.error)"
```

#### Authentication Issues

```bash
# Check JWT configuration
node -e "const jwt = require('jsonwebtoken'); console.log('JWT Secret length:', process.env.JWT_SECRET?.length || 0)"
```

#### Cleanup Function Issues

```bash
# Check cleanup function status
node -e "const authService = require('./src/services/authService'); authService.cleanupUnverifiedUsers().then(console.log).catch(console.error)"
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Log Analysis

```bash
# View application logs
npm run dev | grep -E "(error|warn|info)"

# Check audit logs
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.auditEvent.findMany({ take: 10, orderBy: { createdAt: 'desc' } }).then(console.log).catch(console.error)"
```

### Performance Issues

1. **Database Queries**: Check Prisma query logs
2. **Memory Usage**: Monitor Node.js memory usage
3. **CPU Usage**: Check for CPU-intensive operations
4. **Network Latency**: Monitor API response times
5. **Session Management**: Check session cleanup performance

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

1. **Fork the Repository**

   ```bash
   git clone https://github.com/your-username/AI-Persona.git
   cd AI-Persona/backend
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**

   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation
   - Add audit logging for new features

4. **Run Tests**

   ```bash
   npm run test
   npm run lint
   ```

5. **Submit Pull Request**
   - Provide clear description of changes
   - Include relevant tests
   - Update documentation if needed

### Code Standards

- **ESLint**: Follow the configured ESLint rules (when implemented)
- **Prettier**: Use Prettier for code formatting (when implemented)
- **Conventional Commits**: Use conventional commit messages
- **Documentation**: Update API documentation for new endpoints
- **Audit Logging**: Add audit events for security-relevant operations

### Pull Request Process

1. **Create Issue**: Describe the problem or feature
2. **Fork Repository**: Create your fork
3. **Create Branch**: Create feature branch
4. **Make Changes**: Implement your changes
5. **Add Tests**: Include relevant tests
6. **Update Docs**: Update documentation
7. **Submit PR**: Create pull request with description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Getting Help

- **Documentation**: Check the [docs/](docs/) folder
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Email**: Contact the maintainers

### Community

- **GitHub**: [https://github.com/your-org/AI-Persona](https://github.com/your-org/AI-Persona)
- **Discord**: [Join our Discord server](https://discord.gg/ai-persona)
- **Twitter**: [@AI_Persona](https://twitter.com/AI_Persona)

### Commercial Support

For enterprise support, custom development, or consulting services, please contact us at support@ai-persona.com.

---

**Made with ❤️ by the AI-Persona Team**
