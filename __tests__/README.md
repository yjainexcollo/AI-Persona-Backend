# AI-Persona Backend Testing Guide

## 🧪 Testing Overview

This directory contains comprehensive tests for the AI-Persona backend, organized by test type and functionality.

## 📁 Directory Structure

```
__tests__/
├── unit/                    # Unit tests for individual functions
│   ├── controllers/         # Controller unit tests
│   ├── services/           # Service layer tests
│   ├── middlewares/        # Middleware tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   ├── auth/              # Authentication flow tests
│   ├── workspace/         # Workspace management tests
│   ├── persona/           # Persona and chat tests
│   └── database/          # Database integration tests
├── e2e/                   # End-to-end tests
│   ├── api/               # API endpoint tests
│   └── workflows/         # Complete user workflow tests
├── fixtures/              # Test data fixtures
├── helpers/               # Test utilities and helpers
└── setup/                 # Test environment setup
```

## 🚀 Running Tests

### Prerequisites

1. Install dependencies: `npm install`
2. Set up test database: `npm run test:setup`
3. Ensure test environment variables are configured

### Test Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run specific modules
npm run test:auth
npm run test:persona
npm run test:workspace

# Watch mode for development
npm run test:watch
```

## 📊 Test Coverage Goals

| Module                | Target Coverage | Current Coverage |
| --------------------- | --------------- | ---------------- |
| Authentication        | 90%             | -                |
| User Management       | 85%             | -                |
| Workspace Operations  | 80%             | -                |
| Persona & Chat        | 85%             | -                |
| Security & Validation | 90%             | -                |

## 🛠️ Writing Tests

### Unit Test Example

```javascript
describe("AuthService", () => {
  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "TestPassword123!",
        name: "Test User",
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
    });
  });
});
```

### Integration Test Example

```javascript
describe("POST /api/auth/register", () => {
  it("should register a new user and create workspace", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "newuser@example.com",
        password: "TestPassword123!",
        name: "New User",
      })
      .expect(201);

    expect(response.body.status).toBe("success");
  });
});
```

## 🧪 Test Environment

### Database

- Test database runs in Docker container
- Separate from development/production databases
- Automatically cleaned between tests

### Environment Variables

- Test-specific environment variables in `.env.test`
- Isolated from development environment
- Mock external services where appropriate

### Mocking Strategy

- External APIs (email, webhooks) are mocked
- Database operations use real test database
- File system operations are mocked in unit tests

## 📈 Continuous Integration

Tests are automatically run in CI/CD pipeline with:

- Code coverage reporting
- Test result aggregation
- Performance monitoring
- Security scanning

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Environment Variables**: Check `.env.test` configuration
3. **Test Timeouts**: Increase timeout for slow tests
4. **Mock Issues**: Verify mock configurations

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose --testNamePattern="specific test name"
```

## 🎯 Test Categories

### Unit Tests (60%)

- **Services**: Business logic testing
- **Controllers**: Request/response handling
- **Utils**: Helper function testing
- **Middlewares**: Authentication and validation

### Integration Tests (25%)

- **Database**: Data persistence and queries
- **Authentication**: Complete auth flows
- **API Endpoints**: HTTP request/response
- **External Services**: Email, webhooks

### E2E Tests (15%)

- **User Workflows**: Complete user journeys
- **API Workflows**: Multi-step API interactions
- **Error Scenarios**: Edge cases and failures

## 📋 Test Checklist

### Before Running Tests

- [ ] Test database is running
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] Migrations are applied

### Writing New Tests

- [ ] Follow naming convention: `*.test.js`
- [ ] Use descriptive test names
- [ ] Mock external dependencies
- [ ] Clean up test data
- [ ] Test both success and failure cases

### Test Quality

- [ ] Tests are isolated and independent
- [ ] Tests are fast and reliable
- [ ] Tests cover edge cases
- [ ] Tests are maintainable
- [ ] Tests have good coverage

## 🔧 Setup Commands

```bash
# Initial setup
./scripts/setup-tests.sh

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run database migrations
npm run test:setup

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Express Testing Best Practices](https://expressjs.com/en/advanced/best-practices-performance.html#testing)
