#!/bin/bash

echo "🗄️  Starting Database Services..."
echo "================================="

# Check if PostgreSQL is running
if lsof -i :5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is already running on port 5432"
else
    echo "🚀 Starting PostgreSQL..."
    
    # Try different start commands based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew >/dev/null 2>&1; then
            brew services start postgresql
        else
            pg_ctl -D /usr/local/var/postgres start
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start postgresql
    else
        echo "⚠️  Please start PostgreSQL manually"
    fi
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Setup database
echo "📊 Setting up database schema..."
npm run setup-db

echo "✅ Database is ready!"
echo "Database: PostgreSQL on port 5432"
echo "Database Name: shamay_db"
