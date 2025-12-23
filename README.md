# SHAMAY.AI - Property Valuation Platform

> AI-powered property valuation platform for Hebrew real estate documents

## 🏗️ Architecture

This is a full-stack monorepo application with:

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Neon serverless support
- **AI**: Anthropic Claude & Google Gemini for document extraction

## 📁 Project Structure

```
shamay-slow/
├── backend/              # Express.js API server
│   ├── src/             # Source code
│   │   ├── routes/      # API routes
│   │   ├── models/     # Database models
│   │   └── config/     # Configuration
│   └── [modules]/       # Domain-specific modules
├── frontend/            # Next.js application
│   └── src/
│       ├── app/         # Next.js app router
│       ├── components/  # React components
│       └── lib/         # Utilities & helpers
├── database/            # Database schemas & migrations
│   ├── migrations/      # Database migrations
│   └── queries/         # SQL queries
├── scripts/             # Shell scripts & utilities
├── docs/                # Documentation
├── tests/               # Integration & E2E tests
└── docker-compose.yml   # Docker setup
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ or v20+
- PostgreSQL v14+
- API keys: `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`

### Installation

```bash
# Install all dependencies
npm run install-all

# Setup database
npm run setup-db

# Start development servers
npm run start-all
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📚 Documentation

- [Quick Start Guide](./docs/QUICK_START.md)
- [Backend API Documentation](./docs/backend/README.md)
- [Database Schema](./docs/database/README.md)
- [Deployment Guide](./docs/VERCEL_DEPLOYMENT_READY.md)

## 🛠️ Development

```bash
# Start frontend only
npm run dev

# Start backend only
cd backend && npm start

# Run tests
cd frontend && npm test
```

## 📦 Scripts

All scripts are located in the `scripts/` directory:

- `start-all.sh` - Start all services
- `setup-database-complete.sh` - Initialize database
- `clean.sh` - Clean build artifacts

## 🏛️ Module Structure

Each backend module follows a consistent pattern:

```
[module-name]/
├── ai-field-extractor.js      # AI extraction logic
├── ai-field-extractor-gemini.js  # Gemini variant
├── database-client.js         # Database operations
└── index.js                   # Main module entry
```

## 🔐 Environment Variables

Create `.env` files in `backend/` and `frontend/` directories:

```bash
# Backend
ANTHROPIC_API_KEY=your_key
GEMINI_API_KEY=your_key
DATABASE_URL=postgresql://...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📄 License

MIT

## 👥 Author

SHAMAY.AI

