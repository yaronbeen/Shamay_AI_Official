#!/bin/bash

echo "🚀 Setting up Shamay.AI Development Environment"
echo "=============================================="

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shamay_ai"

# NextAuth
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Email Configuration (Optional for development)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@shamay.ai"
EOF
    echo "✅ Created .env.local file"
else
    echo "⚠️  .env.local already exists, skipping..."
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Update DATABASE_URL in .env.local with your PostgreSQL credentials"
echo "2. Run: npm run db:push"
echo "3. Run: npm run db:seed"
echo "4. Run: npm run dev"
echo ""
echo "🔑 Admin Access:"
echo "Email: admin@shamay.ai"
echo "Password: admin123"
echo ""
echo "Happy coding! 🎉"
