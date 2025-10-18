#!/bin/bash

echo "🚀 Starting Frontend Development Mode..."
echo "========================================"

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if frontend has package.json
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Frontend package.json not found!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start frontend in development mode
echo "🚀 Starting Next.js development server..."
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

cd frontend
npm run dev
