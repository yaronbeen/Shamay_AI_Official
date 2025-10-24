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

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Start PostgreSQL
echo -e "${BLUE}🗄️  Starting PostgreSQL...${NC}"
if port_in_use 5432; then
    echo -e "${YELLOW}⚠️  PostgreSQL is already running on port 5432${NC}"
else
    # Try different PostgreSQL start commands based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew services start postgresql
        else
            pg_ctl -D /usr/local/var/postgres start
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start postgresql
    else
        echo -e "${YELLOW}⚠️  Please start PostgreSQL manually${NC}"
    fi
fi

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 3

# Setup database
echo -e "${BLUE}📊 Setting up database...${NC}"

# Check if database exists
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w shamay_land_registry | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo -e "${YELLOW}📊 Database 'shamay_land_registry' does not exist. Creating...${NC}"
    psql -U postgres -c "CREATE DATABASE shamay_land_registry;"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create database${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Database 'shamay_land_registry' already exists${NC}"
fi

# Run complete database initialization
echo -e "${BLUE}📊 Initializing database schema and tables...${NC}"
psql -U postgres -d shamay_land_registry -f database/init_complete_database.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema initialized successfully${NC}"
else
    echo -e "${RED}❌ Failed to initialize database schema${NC}"
    exit 1
fi

# Check if .env.local exists in frontend
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from template...${NC}"
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
NEXTAUTH_SECRET="your-random-secret-key-change-in-production"

# OpenAI API Key
OPENAI_API_KEY="your-openai-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=3002
EOF
    echo -e "${GREEN}✅ Created .env.local with default values${NC}"
    echo -e "${YELLOW}⚠️  Please update .env.local with your actual OpenAI API key${NC}"
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
echo -e "   Name: shamay_land_registry"
echo -e "   Host: localhost:5432"
echo -e "   User: postgres / shamay_user"
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

# Start both services concurrently
npx concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "cyan,yellow" \
    --kill-others \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev"
