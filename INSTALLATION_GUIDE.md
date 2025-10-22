# SHAMAY.AI - Installation & Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before installing SHAMAY.AI, ensure you have the following installed on your system:

### Required Software
- **Node.js** (v18 or higher)
  ```bash
  node --version  # Should be v18.x.x or higher
  ```
- **npm** (v9 or higher)
  ```bash
  npm --version   # Should be v9.x.x or higher
  ```
- **PostgreSQL** (v14 or higher)
  ```bash
  psql --version  # Should be v14.x or higher
  ```
- **Git**
  ```bash
  git --version
  ```

### Optional but Recommended
- **pgAdmin 4** - For database management GUI
- **VS Code** or **Cursor** - For code editing

---

## 🗄️ Database Setup

### Step 1: Install PostgreSQL

**macOS:**
```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create the database
CREATE DATABASE shamay_land_registry;

# Create a user (optional, or use postgres user)
CREATE USER shamay_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE shamay_land_registry TO shamay_user;

# Exit psql
\q
```

### Step 3: Create Database Schema

Navigate to your project directory and run:

```bash
cd /Shamay-slow

# Create the shuma table
psql -U postgres -d shamay_land_registry -f database/create_shuma_table.sql

# Create extraction tables (optional, for detailed extraction data)
psql -U postgres -d shamay_land_registry -f database/create_land_registry_table.sql
psql -U postgres -d shamay_land_registry -f database/create_building_permit_table.sql
psql -U postgres -d shamay_land_registry -f database/create_shared_building_table.sql
```

### Step 4: Verify Database Tables

```bash
# Connect to the database
psql -U postgres -d shamay_land_registry

# List all tables
\dt

# You should see:
# - shuma
# - land_registry_extracts (optional)
# - building_permit_extracts (optional)
# - shared_building_order (optional)
# - images (optional)
# - garmushka (optional)

# Exit
\q
```

---

## 🔌 Backend Setup

### Step 1: Install Dependencies

```bash
cd /Users/shalom.m/Documents/Code/Shamay-slow/frontend

# Install Node.js dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/shamay_land_registry"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="shamay_land_registry"
DB_USER="postgres"
DB_PASSWORD="your_password"

# NextAuth Configuration (for authentication)
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-random-secret-key-here-generate-with-openssl"

# OpenAI API Key (for AI analysis)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Application Configuration
NODE_ENV="development"
PORT=3002
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 3: Test Database Connection

```bash
# Test the database connection
node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: 'postgresql://postgres:your_password@localhost:5432/shamay_land_registry'}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); pool.end(); });"
```

If successful, you should see the current timestamp.

---

## 🎨 Frontend Setup

The frontend is already integrated with the backend in the Next.js application.

### Step 1: Verify Dependencies

Ensure all dependencies are installed:

```bash
cd /Users/shalom.m/Documents/Code/Shamay-slow/frontend
npm install
```

### Step 2: Build the Application (Optional for Production)

```bash
npm run build
```

---

## 🚀 Running the Application

### Development Mode

```bash
cd /Users/shalom.m/Documents/Code/Shamay-slow/frontend

# Start the development server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3002
- **API**: http://localhost:3002/api

### Production Mode

```bash
# Build the application
npm run build

# Start the production server
npm start
```

### Accessing the Application

1. **Open your browser** and navigate to: http://localhost:3002
2. **Sign in** with the development credentials:
   - Email: `admin@shamay.ai`
   - Password: `admin123`
   
   _(Or any email/password in development mode)_

3. **Create a new valuation** by clicking "יצירת שומה חדשה" (Create New Valuation)

---

## 📱 Using the Application

### Step 1: Initial Property Data
- Fill in basic property information:
  - Address (street, building number, city, neighborhood)
  - Number of rooms
  - Floor
  - Area (square meters)
  - Property type
  - Client information
  - Visit date and valuation date

### Step 2: Upload Documents
- **Land Registry (Tabu)**: Upload PDF of property ownership document
- **Building Permit**: Upload PDF of building permit
- **Shared Building Order**: Upload PDF of condominium order
- **Property Images**: Upload exterior photos of the building
- **Interior Images**: Upload interior photos of the apartment

After uploading, click **"עיבוד מסמכים באמצעות AI"** (Process with AI) to extract data automatically.

### Step 3: Validate Extracted Data
- Review all extracted data from documents
- Edit any incorrect fields by clicking the edit icon
- Verify:
  - Registration office
  - Gush (block) and Parcel numbers
  - Ownership type
  - Attachments (parking, storage)
  - Building year
  - Built area
  - Property condition

### Step 4: AI Analysis & Measurements
- **GIS Analysis**: 
  - View property location on GovMap
  - Take screenshots of the map (clean and with land registry overlay)
  - Add annotations if needed
  
- **Garmushka Measurements**:
  - Upload floor plan PDF
  - Calibrate measurements
  - Measure rooms and areas
  - Export measurement table

### Step 5: Final Valuation & Export
- Review all collected data
- Enter comparable sales data (optional)
- Calculate final valuation
- Preview the professional valuation report
- Export as PDF

---

## 🔍 Troubleshooting

### Database Connection Issues

**Error: "Connection refused"**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL if not running
brew services start postgresql@14     # macOS
sudo systemctl start postgresql       # Linux
```

**Error: "Authentication failed"**
```bash
# Reset PostgreSQL password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'new_password';
\q

# Update .env.local with new password
```

### Port Already in Use

**Error: "Port 3002 is already in use"**
```bash
# Find process using port 3002
lsof -i :3002

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3003 npm run dev
```

### OpenAI API Issues

**Error: "Invalid API key"**
- Verify your OpenAI API key in `.env.local`
- Check that the key starts with `sk-`
- Ensure you have sufficient credits in your OpenAI account

**Error: "Rate limit exceeded"**
- Wait a few minutes before retrying
- Consider upgrading your OpenAI plan for higher rate limits

### Missing Dependencies

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Schema Issues

```bash
# Drop and recreate database (WARNING: This deletes all data!)
psql -U postgres
DROP DATABASE shamay_land_registry;
CREATE DATABASE shamay_land_registry;
\q

# Recreate schema
psql -U postgres -d shamay_land_registry -f database/create_shuma_table.sql
```

---

## 📊 Database Maintenance

### Backup Database

```bash
# Create backup
pg_dump -U postgres shamay_land_registry > shamay_backup_$(date +%Y%m%d).sql

# Or with compression
pg_dump -U postgres shamay_land_registry | gzip > shamay_backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# From SQL file
psql -U postgres shamay_land_registry < shamay_backup_20231215.sql

# From compressed file
gunzip -c shamay_backup_20231215.sql.gz | psql -U postgres shamay_land_registry
```

### View Database Stats

```bash
psql -U postgres -d shamay_land_registry

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Count records
SELECT COUNT(*) FROM shuma;
```

---

## 🛡️ Security Considerations

### For Production Deployment

1. **Change Default Credentials**
   - Update admin password
   - Use strong NEXTAUTH_SECRET
   - Use environment-specific database credentials

2. **Enable HTTPS**
   - Use SSL certificates (Let's Encrypt)
   - Configure Next.js for HTTPS

3. **Database Security**
   - Use strong database passwords
   - Enable SSL for database connections
   - Restrict database access to application server only

4. **API Rate Limiting**
   - Implement rate limiting for API endpoints
   - Monitor OpenAI API usage and costs

5. **File Upload Security**
   - Validate file types and sizes
   - Scan uploads for malware
   - Store files outside web root

---

## 📞 Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review logs in terminal output
- Check browser console for frontend errors
- Verify database connection and data

---

## 📄 License

Copyright © 2024 SHAMAY.AI. All rights reserved.

