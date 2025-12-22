#!/bin/bash

echo "🛑 Stopping Shamay.ai Development Environment"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Stop backend
echo "Stopping backend (port 3001)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "  No process on port 3001"

# Stop frontend
echo "Stopping frontend (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "  No process on port 3000"

# Stop any remaining node processes related to the project
echo "Stopping remaining processes..."
pkill -f "shamay.*node" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
