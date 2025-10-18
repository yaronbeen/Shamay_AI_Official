#!/bin/bash

# Add התקווה neighborhood properties to the database
echo "🏠 Adding התקווה neighborhood properties to database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Run the SQL script
echo "📊 Executing SQL script..."
psql -d shamay_db -f database/add_hatikva_property.sql

if [ $? -eq 0 ]; then
    echo "✅ התקווה properties added successfully!"
    echo "📊 You can now test neighborhood filtering with 'התקווה'"
    echo ""
    echo "To verify the properties were added, run:"
    echo "psql -d shamay_db -c \"SELECT address, street_name, rooms, declared_price FROM comparable_data WHERE street_name = 'רחוב התקווה';\""
else
    echo "❌ Failed to add התקווה properties"
    exit 1
fi
