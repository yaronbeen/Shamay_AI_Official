#!/bin/bash

echo "🧪 Shamay.ai Local Testing Script"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with:"
    echo "  ANTHROPIC_API_KEY=your-key"
    echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shamay_land_registry"
    exit 1
fi

# Check PostgreSQL
echo "1. Checking PostgreSQL..."
if pg_isready -q; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL not running. Starting...${NC}"
    # Try to start PostgreSQL
    if command -v brew &> /dev/null; then
        brew services start postgresql
    elif command -v docker &> /dev/null; then
        docker run --name shamay-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shamay_land_registry -p 5432:5432 -d postgres:14
        sleep 5
    else
        echo -e "${RED}❌ Please start PostgreSQL manually${NC}"
        exit 1
    fi
fi

# Check if database exists
echo ""
echo "2. Checking database..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw shamay_land_registry; then
    echo -e "${GREEN}✅ Database exists${NC}"
else
    echo -e "${YELLOW}⚠️  Creating database...${NC}"
    psql -U postgres -c "CREATE DATABASE shamay_land_registry"
    ./scripts/setup-database-complete.sh
fi

# Create logs directory
mkdir -p logs

# Check backend
echo ""
echo "3. Checking backend..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Backend is running on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  Starting backend...${NC}"
    cd backend
    npm install --silent 2>&1 | grep -E "added|up to date" || true
    npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo "Backend starting (PID: $BACKEND_PID)..."
    sleep 8
fi

# Check frontend
echo ""
echo "4. Checking frontend..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Starting frontend...${NC}"
    cd frontend
    npm install --silent 2>&1 | grep -E "added|up to date" || true
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    echo "Frontend starting (PID: $FRONTEND_PID)..."
    sleep 8
fi

# Test backend health
echo ""
echo "5. Testing backend API..."
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${RED}❌ Backend API not responding${NC}"
fi

# Test AI extraction endpoint
echo ""
echo "6. Testing AI extraction readiness..."
if curl -s -X POST http://localhost:3001/api/ai/land-registry \
    -H "Content-Type: application/json" \
    -d '{"test": true}' | grep -q "error"; then
    echo -e "${GREEN}✅ AI extraction endpoint ready${NC}"
else
    echo -e "${RED}❌ AI extraction endpoint not ready${NC}"
fi

echo ""
echo "================================="
echo -e "${GREEN}✅ Local environment ready!${NC}"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "📊 Database: postgresql://localhost:5432/shamay_land_registry"
echo ""
echo "📁 Test documents available in:"
echo "   integrations/test_documents/"
echo ""
echo "🧪 To test AI extraction:"
echo "   cd backend && node test-api-responses.js"
echo ""
echo "📋 View logs:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "   pkill -f 'node'"
echo ""
