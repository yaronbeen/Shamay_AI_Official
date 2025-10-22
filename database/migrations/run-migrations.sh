#!/bin/bash
# Migration Runner for Shamay Valuation System
# Run with: ./run-migrations.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-shamay_land_registry}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres123}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Shamay Valuation System - Migrations${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Function to execute SQL file
execute_migration() {
  local file=$1
  local description=$2
  
  echo -e "${YELLOW}Running: ${description}...${NC}"
  
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success: ${description}${NC}"
  else
    echo -e "${RED}✗ Failed: ${description}${NC}"
    exit 1
  fi
  echo ""
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
  exit 1
fi

# Test database connection
echo "Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Cannot connect to database. Please check your connection settings.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Create migrations directory if it doesn't exist
MIGRATIONS_DIR="$(dirname "$0")"
cd "$MIGRATIONS_DIR"

# Run migrations in order
echo -e "${YELLOW}Starting migrations...${NC}"
echo ""

execute_migration "001_core_valuations.sql" "001: Core Tables & Indexes"
execute_migration "002_session_compatibility.sql" "002: Backward Compatibility Layer"
execute_migration "003_seed_data.sql" "003: Seed Demo Data"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env file with DATABASE_URL"
echo "2. Run: npx prisma generate"
echo "3. Run: npm run dev"
echo ""

