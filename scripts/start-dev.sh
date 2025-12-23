#!/bin/bash

echo "🚀 Starting Shamay.ai Development Environment"
echo "============================================="
echo ""

# Create logs directory
mkdir -p logs

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file based on env.example"
    exit 1
fi

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start backend
echo ""
echo "1️⃣  Starting Backend API (port 3001)..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
fi

# Start backend in background
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
echo "   Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Backend ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "   ${RED}❌ Backend failed to start${NC}"
        echo "   Check logs: tail -f logs/backend.log"
        exit 1
    fi
    sleep 1
done

# Start frontend
echo ""
echo "2️⃣  Starting Frontend (port 3000)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend to start
echo "   Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Frontend ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "   ${YELLOW}⚠️  Frontend taking longer than expected${NC}"
        echo "   Check logs: tail -f logs/frontend.log"
    fi
    sleep 1
done

echo ""
echo "============================================="
echo -e "${GREEN}✅ Development environment is running!${NC}"
echo ""
echo "📊 Services:"
echo "   Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📋 Useful commands:"
echo "   View backend logs:  tail -f logs/backend.log"
echo "   View frontend logs: tail -f logs/frontend.log"
echo "   Stop all services:  pkill -f 'node'"
echo "   Test AI endpoints:  node tests/test-ai-locally.js"
echo ""
echo "🌐 Open in browser: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop monitoring (services will continue running)"
echo ""

# Monitor logs
trap "echo ''; echo 'Services still running in background. Use: pkill -f node to stop'; exit 0" INT

echo "📡 Monitoring logs (Ctrl+C to stop)..."
tail -f logs/backend.log logs/frontend.log
