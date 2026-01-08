#!/bin/bash

# SHAMAY.AI Environment Setup Script
# Creates .env.local file with proper configuration

echo "🔧 Setting up environment configuration..."

# Check if .env.local already exists
if [ -f "frontend/.env.local" ]; then
    echo "⚠️  .env.local already exists. Creating backup..."
    cp frontend/.env.local frontend/.env.local.backup
fi

# Create .env.local file
cat > frontend/.env.local << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shamay_land_registry"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="shamay_land_registry"
DB_USER="postgres"
DB_PASSWORD="postgres"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="dev-secret-change-in-production-use-openssl-rand-base64-32"

# OpenAI API Key (replace with your actual key)
OPENAI_API_KEY="your-openai-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=3002
EOF

echo "✅ Created frontend/.env.local"
echo ""
echo "⚠️  IMPORTANT: Update the following in frontend/.env.local:"
echo "   1. OPENAI_API_KEY - Add your actual OpenAI API key"
echo "   2. DB_PASSWORD - Update if you're using a different PostgreSQL password"
echo "   3. NEXTAUTH_SECRET - For production, generate with: openssl rand -base64 32"
echo ""
echo "📝 To edit: nano frontend/.env.local"

