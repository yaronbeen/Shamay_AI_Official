#!/bin/bash

echo "🚀 Starting SHAMAY.AI Database + Frontend..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start PostgreSQL
echo -e "${BLUE}🗄️  Starting PostgreSQL...${NC}"
if lsof -i :5432 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL is already running on port 5432${NC}"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew >/dev/null 2>&1; then
            brew services start postgresql
        else
            pg_ctl -D /usr/local/var/postgres start
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    fi
fi

# Wait for PostgreSQL
sleep 3

# Setup database
echo -e "${BLUE}📊 Setting up database...${NC}"
npm run setup-db

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Start services
echo -e "${GREEN}🚀 Starting services...${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}Database: PostgreSQL on port 5432${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Start database and frontend
npx concurrently \
    --names "DB,FE" \
    --prefix-colors "blue,yellow" \
    "echo 'Database running on port 5432'" \
    "cd frontend && npm run dev"
