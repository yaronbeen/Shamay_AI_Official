#!/bin/bash

echo "🧹 Cleaning SHAMAY.AI Project..."
echo "================================="

# Clean frontend
if [ -d "frontend/.next" ]; then
    echo "🗑️  Removing frontend build files..."
    rm -rf frontend/.next
fi

if [ -d "frontend/node_modules" ]; then
    echo "🗑️  Removing frontend node_modules..."
    rm -rf frontend/node_modules
fi

# Clean backend
if [ -d "backend/node_modules" ]; then
    echo "🗑️  Removing backend node_modules..."
    rm -rf backend/node_modules
fi

# Clean root
if [ -d "node_modules" ]; then
    echo "🗑️  Removing root node_modules..."
    rm -rf node_modules
fi

# Clean uploads
if [ -d "uploads" ]; then
    echo "🗑️  Removing uploads directory..."
    rm -rf uploads
fi

echo "✅ Cleanup complete!"
echo "Run 'npm run install-all' to reinstall dependencies"
