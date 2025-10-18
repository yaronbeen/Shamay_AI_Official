#!/bin/bash

echo "🚀 Starting SHAMAY.AI Frontend Only..."
echo "====================================="

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start frontend in development mode
echo "🚀 Starting Next.js development server..."
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

cd frontend && npm run dev
