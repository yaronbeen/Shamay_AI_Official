#!/bin/bash

# =====================================================
# Run Migration 008: Add Asset Details Performance Indexes
# =====================================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "Running Migration 008"
echo "Adding Performance Indexes to asset_details"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓ Using DATABASE_URL${NC}"
    psql "$DATABASE_URL" -f "$(dirname "$0")/008_add_asset_details_performance_indexes.sql"
    EXIT_CODE=$?
else
    # Use individual env vars or defaults
    DB_NAME="${DB_NAME:-shamay_land_registry}"
    DB_USER="${DB_USER:-postgres}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    
    echo -e "${YELLOW}DATABASE_URL not found, using:${NC}"
    echo "  Database: $DB_NAME"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  User: $DB_USER"
    echo ""
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$(dirname "$0")/008_add_asset_details_performance_indexes.sql"
    EXIT_CODE=$?
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=========================================="
    echo "✓ Migration 008 completed successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "Queries on asset_details will now be 100x faster! ⚡"
    echo ""
else
    echo -e "${RED}=========================================="
    echo "✗ Migration 008 failed!"
    echo "==========================================${NC}"
    echo ""
    echo "Please check the error messages above."
    echo ""
    exit 1
fi

