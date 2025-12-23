#!/bin/bash

echo "🔧 Starting Backend Services..."
echo "==============================="

# Start individual backend modules
echo "🚀 Starting Land Registry Management..."
cd land-registry-management && node index.js &
LAND_PID=$!

echo "🚀 Starting Building Permits..."
cd ../building-permits && node test-building-permits.js &
PERMIT_PID=$!

echo "🚀 Starting Shared Building Order..."
cd ../shared-building-order && node index.js &
SHARED_PID=$!

echo "🚀 Starting Property Assessment..."
cd ../property-assessment && node index.js &
ASSESSMENT_PID=$!

echo "🚀 Starting Images Management..."
cd ../images-management && node index.js &
IMAGES_PID=$!

echo "🚀 Starting Comparable Data Management..."
cd ../comparable-data-management && node index.js &
COMPARABLE_PID=$!

echo "🚀 Starting Environment Analysis..."
cd ../environment_analysis && node index.js &
ENV_PID=$!

echo "🚀 Starting Garmushka Management..."
cd ../garmushka-management && node index.js &
GARMUSHKA_PID=$!

echo "🚀 Starting Miscellaneous Functions..."
cd ../miscellaneous_functions && node index.js &
MISC_PID=$!

echo "✅ All backend services started!"
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping all backend services..."
    kill $LAND_PID $PERMIT_PID $SHARED_PID $ASSESSMENT_PID $IMAGES_PID $COMPARABLE_PID $ENV_PID $GARMUSHKA_PID $MISC_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for all processes
wait
