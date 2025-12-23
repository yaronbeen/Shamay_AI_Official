#!/bin/bash

echo "🚀 Setting up SHAMAY.AI Database..."

# Create database if it doesn't exist
echo "📊 Creating database..."
psql -U postgres -c "CREATE DATABASE shamay_db;" 2>/dev/null || echo "Database already exists"

# Run the schema
echo "📋 Running database schema..."
psql -U postgres -d shamay_db -f database/comprehensive_schema.sql

echo "✅ Database setup complete!"
