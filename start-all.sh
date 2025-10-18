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
npm run setup-db

# Install dependencies if needed
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start all services
echo -e "${GREEN}🚀 Starting all services...${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}Database: PostgreSQL on port 5432${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Start services - ONLY FRONTEND AND DATABASE
npx concurrently \
    --names "DB,FE" \
    --prefix-colors "blue,yellow" \
    "echo 'Database running on port 5432'" \
    "cd frontend && npm run dev"
