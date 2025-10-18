#!/bin/bash

# Complete Database Setup Script for SHAMAY.AI
echo "🔧 Setting up complete SHAMAY.AI database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "📊 Creating database 'shamay_db' if it doesn't exist..."
createdb shamay_db 2>/dev/null || echo "Database 'shamay_db' already exists"

# Run the complete database setup
echo "🔧 Running complete database setup..."
psql -d shamay_db -f database/setup_complete_database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo "📊 You can now use the application with real database data"
    echo ""
    echo "To verify the setup, you can run:"
    echo "psql -d shamay_db -c \"SELECT COUNT(*) FROM comparable_data;\""
else
    echo "❌ Database setup failed"
    exit 1
fi
