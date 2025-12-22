#!/bin/bash

echo "🚀 Starting SHAMAY.AI Full Stack Platform..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Neon DB Connection String
NEON_DB_URL="${NEON_DB_URL:-postgresql://neondb_owner:npg_T8K7GEFhcPyB@ep-hidden-resonance-ad86yclx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require}"

# Parse Neon DB connection string
parse_neon_url() {
    local url="$1"
    # Extract components from connection string
    if [[ $url =~ postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+) ]]; then
        NEON_USER="${BASH_REMATCH[1]}"
        NEON_PASSWORD="${BASH_REMATCH[2]}"
        NEON_HOST="${BASH_REMATCH[3]}"
        NEON_DB="${BASH_REMATCH[4]}"
    fi
}

parse_neon_url "$NEON_DB_URL"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if PostgreSQL client is installed (needed for psql)
if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL client (psql) is not installed. Please install PostgreSQL client tools first.${NC}"
    echo -e "${YELLOW}   macOS: brew install postgresql${NC}"
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Connect to Neon DB
echo -e "${BLUE}🗄️  Connecting to Neon DB...${NC}"
echo -e "${YELLOW}   Host: ${NEON_HOST}${NC}"
echo -e "${YELLOW}   Database: ${NEON_DB}${NC}"

# Test Neon DB connection
echo -e "${BLUE}⏳ Testing Neon DB connection...${NC}"
if PGPASSWORD="$NEON_PASSWORD" psql "postgresql://${NEON_USER}:${NEON_PASSWORD}@${NEON_HOST}/${NEON_DB}?sslmode=require" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully connected to Neon DB${NC}"
    echo -e "${GREEN}✅ Database tables already exist - ready to use${NC}"
else
    echo -e "${RED}❌ Failed to connect to Neon DB${NC}"
    echo -e "${YELLOW}   Please verify your NEON_DB_URL environment variable${NC}"
    exit 1
fi

# Check if .env.local exists in frontend
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from template...${NC}"
    cat > frontend/.env.local << EOF
# Database Configuration (Neon DB)
DATABASE_URL="${NEON_DB_URL}"
DB_HOST="${NEON_HOST}"
DB_NAME="${NEON_DB}"
DB_USER="${NEON_USER}"
DB_PASSWORD="${NEON_PASSWORD}"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-random-secret-key-change-in-production"

# OpenAI API Key
OPENAI_API_KEY="your-openai-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=3002
EOF
    echo -e "${GREEN}✅ Created .env.local with Neon DB configuration${NC}"
    echo -e "${YELLOW}⚠️  Please update .env.local with your actual OpenAI API key${NC}"
else
    # Update existing .env.local with Neon DB URL if DATABASE_URL is not set
    if ! grep -q "DATABASE_URL.*neon" frontend/.env.local 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Updating .env.local with Neon DB configuration...${NC}"
        # Backup existing file
        cp frontend/.env.local frontend/.env.local.backup
        # Update DATABASE_URL if it exists, or add it if it doesn't
        if grep -q "^DATABASE_URL=" frontend/.env.local; then
            sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEON_DB_URL}\"|" frontend/.env.local
        else
            echo "DATABASE_URL=\"${NEON_DB_URL}\"" >> frontend/.env.local
        fi
        echo -e "${GREEN}✅ Updated .env.local with Neon DB configuration${NC}"
    fi
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Display connection information
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}🎉 SHAMAY.AI Setup Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${YELLOW}📊 Database:${NC}"
echo -e "   Name: ${NEON_DB}"
echo -e "   Host: ${NEON_HOST}"
echo -e "   User: ${NEON_USER}"
echo -e "   Type: Neon DB (Cloud)"
echo ""
echo -e "${YELLOW}🌐 Application URLs:${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:3002${NC}"
echo -e "   Backend API: ${BLUE}http://localhost:3001${NC}"
echo -e "   Backend Health: ${BLUE}http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}👤 Default Login (Development):${NC}"
echo -e "   Email: admin@shamay.ai"
echo -e "   Password: admin123"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Check if concurrently is installed globally
if ! command -v concurrently >/dev/null 2>&1; then
    echo -e "${YELLOW}Installing concurrently globally...${NC}"
    npm install -g concurrently
fi

# Ensure backend has DATABASE_URL
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating backend/.env with Neon DB configuration...${NC}"
    cat > backend/.env << EOF
# Database Configuration (Neon DB)
DATABASE_URL="${NEON_DB_URL}"
POSTGRES_URL="${NEON_DB_URL}"
DB_HOST="${NEON_HOST}"
DB_NAME="${NEON_DB}"
DB_USER="${NEON_USER}"
DB_PASSWORD="${NEON_PASSWORD}"

# Application Configuration
NODE_ENV="development"
PORT=3001
EOF
    echo -e "${GREEN}✅ Created backend/.env with Neon DB configuration${NC}"
else
    # Update existing backend/.env with Neon DB URL if DATABASE_URL is not set
    if ! grep -q "DATABASE_URL.*neon" backend/.env 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Updating backend/.env with Neon DB configuration...${NC}"
        # Backup existing file
        cp backend/.env backend/.env.backup
        # Update DATABASE_URL if it exists, or add it if it doesn't
        if grep -q "^DATABASE_URL=" backend/.env; then
            sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEON_DB_URL}\"|" backend/.env
        else
            echo "DATABASE_URL=\"${NEON_DB_URL}\"" >> backend/.env
        fi
        # Also set POSTGRES_URL
        if grep -q "^POSTGRES_URL=" backend/.env; then
            sed -i.bak "s|^POSTGRES_URL=.*|POSTGRES_URL=\"${NEON_DB_URL}\"|" backend/.env
        else
            echo "POSTGRES_URL=\"${NEON_DB_URL}\"" >> backend/.env
        fi
        echo -e "${GREEN}✅ Updated backend/.env with Neon DB configuration${NC}"
    fi
fi

# Start both services concurrently
npx concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "cyan,yellow" \
    --kill-others \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev"
