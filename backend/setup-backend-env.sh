#!/bin/bash

# Backend Environment Setup Script

echo "🔧 Setting up backend environment..."

if [ -f ".env" ]; then
    echo "⚠️  .env already exists. Creating backup..."
    cp .env .env.backup
fi

cat > .env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shamay_land_registry
DB_USER=postgres
DB_PASSWORD=postgres

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT Configuration
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# CORS Configuration
FRONTEND_URL=http://localhost:3002

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# Logging
LOG_LEVEL=info
EOF

echo "✅ Created backend/.env"
echo ""
echo "⚠️  IMPORTANT: Update the following in backend/.env:"
echo "   1. OPENAI_API_KEY - Add your actual OpenAI API key"
echo "   2. DB_PASSWORD - Update if different"
echo "   3. JWT_SECRET - For production, use a secure random string"

