# SHAMAY.AI - Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Prerequisites Check
- ✅ Node.js v18+ installed
- ✅ PostgreSQL v14+ installed
- ✅ OpenAI API key ready

---

## One-Command Setup

```bash
./start-all.sh
```

That's it! The script will:
1. Check all prerequisites
2. Start PostgreSQL
3. Create database and users
4. Initialize all tables
5. Install dependencies
6. Start the application

---

## What Gets Created

### 🗄️ Database
- **Name**: `shamay_land_registry`
- **Tables**: 7 tables (shuma, land_registry_extracts, building_permit_extracts, shared_building_order, images, garmushka, comparable_data)
- **Users**: `postgres` (admin), `shamay_user` (app)
- **Sample Data**: Development session included

### 🌐 Application
- **Frontend**: http://localhost:3002
- **API**: http://localhost:3002/api

### 🔐 Login
- **Email**: admin@shamay.ai
- **Password**: admin123

---

## First Steps After Setup

1. **Update OpenAI API Key**
   ```bash
   nano frontend/.env.local
   # Change: OPENAI_API_KEY="your-actual-key-here"
   ```

2. **Access the Application**
   - Open browser: http://localhost:3002
   - Login with admin credentials
   - Click "יצירת שומה חדשה" (Create New Valuation)

3. **Complete a Test Valuation**
   - Step 1: Enter property details
   - Step 2: Upload documents (Tabu, Building Permit)
   - Step 3: Review AI-extracted data
   - Step 4: GIS analysis & measurements
   - Step 5: Export PDF report

---

## Manual Setup (If Needed)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Setup Database
```bash
# Create database
psql -U postgres -c "CREATE DATABASE shamay_land_registry;"

# Initialize schema
psql -U postgres -d shamay_land_registry -f database/init_complete_database.sql
```

### 3. Configure Environment
```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local  # Add your OpenAI API key
```

### 4. Start Application
```bash
cd frontend
npm run dev
```

---

## Common Commands

```bash
# Start application
./start-all.sh

# Stop application
Ctrl+C

# Reset database (⚠️ Deletes all data)
psql -U postgres -d shamay_land_registry -f database/init_complete_database.sql

# Backup database
pg_dump -U postgres shamay_land_registry > backup_$(date +%Y%m%d).sql

# View logs
tail -f frontend/.next/trace

# Check database
psql -U postgres -d shamay_land_registry
\dt  # List tables
SELECT * FROM session_summary;  # View valuations
\q  # Exit
```

---

## File Structure

```
Shamay-slow/
├── start-all.sh              # 🚀 One-command startup script
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages & API routes
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities & database client
│   ├── .env.local            # ⚙️ Configuration (create this!)
│   └── package.json
├── database/
│   ├── init_complete_database.sql  # 📊 Complete DB setup
│   └── README.md             # Database documentation
├── INSTALLATION_GUIDE.md     # 📚 Detailed setup guide
├── USER_GUIDE.md             # 📖 Usage documentation
└── QUICK_START.md            # ⚡ This file
```

---

## Troubleshooting

### PostgreSQL Not Running
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Port 3002 Already in Use
```bash
# Find process
lsof -i :3002

# Kill process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check if database exists
psql -U postgres -l | grep shamay

# If not, create it
psql -U postgres -c "CREATE DATABASE shamay_land_registry;"
```

### OpenAI API Error
- Verify your API key in `frontend/.env.local`
- Check API credits at platform.openai.com
- Ensure key starts with `sk-`

---

## Next Steps

1. ✅ Complete the quick start setup
2. 📚 Read the [User Guide](USER_GUIDE.md) for detailed features
3. 📖 Review [Installation Guide](INSTALLATION_GUIDE.md) for production setup
4. 🗄️ Check [Database README](database/README.md) for DB management

---

## Support

- 📧 Email: support@shamay.ai
- 📚 Documentation: See guides above
- 🐛 Issues: Check troubleshooting section

---

**Ready to go? Run `./start-all.sh` and start valuating!** 🏡✨
