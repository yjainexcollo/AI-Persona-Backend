#!/bin/bash

echo "🧪 Setting up AI-Persona Test Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start test database
echo "🐘 Starting test database..."
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run test database setup
echo "🔧 Setting up test database schema..."
npm run test:setup

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

echo "✅ Test environment setup complete!"
echo ""
echo "🚀 You can now run tests with:"
echo "   npm test                    # Run all tests"
echo "   npm run test:unit          # Run unit tests only"
echo "   npm run test:integration   # Run integration tests only"
echo "   npm run test:e2e           # Run E2E tests only"
echo "   npm run test:coverage      # Run tests with coverage" 