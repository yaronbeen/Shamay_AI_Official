#!/bin/bash

# Setup Integrated Database for Shamay.AI
# This script sets up the complete database with all tables and relationships

echo "🚀 Setting up Integrated Database for Shamay.AI"
echo "=============================================="

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Database configuration
DB_NAME="shamay_ai"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Create database if it doesn't exist
echo "🗄️ Creating database if it doesn't exist..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists or creation failed"

# Run the integrated schema
echo "📋 Running integrated schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f integrated_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Integrated schema created successfully"
else
    echo "❌ Failed to create integrated schema"
    exit 1
fi

# Run existing business tables
echo "📋 Adding existing business tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f comprehensive_schema.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f setup_complete_database.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f create_garmushka_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Business tables created successfully"
else
    echo "❌ Failed to create business tables"
    exit 1
fi

# Update Prisma schema to use PostgreSQL
echo "🔧 Updating Prisma schema for PostgreSQL..."
cd ../frontend

# Update .env.local with PostgreSQL connection
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat << EOF > .env.local
# Database Configuration
DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="YOUR_SUPER_SECRET_KEY_HERE_GENERATE_A_NEW_ONE"
NEXTAUTH_URL="http://localhost:3000"

# Email Server Configuration (for magic link authentication)
# EMAIL_SERVER_HOST="smtp.gmail.com"
# EMAIL_SERVER_PORT="587"
# EMAIL_SERVER_USER="your-email@gmail.com"
# EMAIL_SERVER_PASSWORD="your-app-password"
# EMAIL_FROM="noreply@shamay.ai"
EOF
else
    echo "📝 Updating .env.local with PostgreSQL connection..."
    sed -i.bak 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="postgresql://postgres@localhost:5432/shamay_ai?schema=public"|' .env.local
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Push schema to database
echo "📤 Pushing Prisma schema to database..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Prisma schema pushed successfully"
else
    echo "❌ Failed to push Prisma schema"
    exit 1
fi

# Seed the database
echo "🌱 Seeding database..."
npm run db:seed

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "❌ Failed to seed database"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Summary:"
echo "  ✅ Authentication & Organization system"
echo "  ✅ Valuation system with session management"
echo "  ✅ Document & file management"
echo "  ✅ Activity logging & audit trail"
echo "  ✅ Existing business tables (Land Registry, Comparable Data, Garmushka)"
echo "  ✅ Sample data and admin user"
echo ""
echo "🔑 Admin Access:"
echo "  Email: admin@shamay.ai"
echo "  Password: admin123"
echo ""
echo "🚀 Next steps:"
echo "  1. Start the frontend: npm run dev"
echo "  2. Access the application: http://localhost:3000"
echo "  3. Sign in with admin credentials"
echo ""
echo "Happy coding! 🎉"
