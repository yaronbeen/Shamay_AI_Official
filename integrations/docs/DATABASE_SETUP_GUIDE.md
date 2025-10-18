# Database Setup Guide for Non-Technical Users

## Overview
This guide will help you set up the Shamay database on your computer. The Shamay system uses PostgreSQL database to store and manage Hebrew real estate documents and property assessment data.

## What You'll Need
- A computer running Windows, Mac, or Linux
- Administrator access to install software
- About 30 minutes of setup time

## Step 1: Install PostgreSQL Database

### For Windows:
1. **Download PostgreSQL**
   - Go to https://www.postgresql.org/download/windows/
   - Download the latest version (recommended: PostgreSQL 15 or higher)
   - Choose the Windows installer

2. **Install PostgreSQL**
   - Run the downloaded installer file
   - Follow the installation wizard
   - **Important**: When prompted for a password for the "postgres" user, enter: `postgres123`
   - Keep the default port: `5432`
   - Keep the default locale settings
   - Complete the installation

### For Mac:
1. **Download PostgreSQL**
   - Go to https://postgresapp.com/
   - Download and install Postgres.app
   - OR use the installer from https://www.postgresql.org/download/macosx/

2. **Set up password**
   - Open Terminal
   - Type: `psql postgres`
   - Type: `\password postgres`
   - Enter password: `postgres123`
   - Type: `\q` to exit

### For Linux (Ubuntu/Debian):
1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Set up password**
   ```bash
   sudo -u postgres psql
   \password postgres
   # Enter: postgres123
   \q
   ```

## Step 2: Verify PostgreSQL Installation

1. **Test the connection**
   - Open Command Prompt (Windows) or Terminal (Mac/Linux)
   - Type: `psql -U postgres -h localhost`
   - Enter password: `postgres123`
   - If you see `postgres=#`, the installation worked!
   - Type `\q` to exit

## Step 3: Create the Shamay Database

1. **Connect to PostgreSQL**
   - Open Command Prompt or Terminal
   - Type: `psql -U postgres -h localhost`
   - Enter password: `postgres123`

2. **Create the database**
   - Type: `CREATE DATABASE shamay_land_registry;`
   - Type: `\q` to exit

## Step 4: Set Up Database Tables

1. **Download the setup files**
   - Make sure you have the `database` folder from the Shamay project
   - This folder contains all the SQL files needed

2. **Run the database setup**
   - Navigate to your Shamay project folder
   - Open Command Prompt or Terminal in the `database` folder
   - Run these commands one by one:

   ```bash
   psql -U postgres -d shamay_land_registry -f comprehensive_schema.sql
   psql -U postgres -d shamay_land_registry -f create_building_permits_table.sql
   psql -U postgres -d shamay_land_registry -f create_shared_building_order_table.sql
   psql -U postgres -d shamay_land_registry -f create_property_assessment_table.sql
   psql -U postgres -d shamay_land_registry -f create_images_table.sql
   psql -U postgres -d shamay_land_registry -f create_garmushka_table.sql
   psql -U postgres -d shamay_land_registry -f create_comparable_data_table.sql
   psql -U postgres -d shamay_land_registry -f create_miscellaneous_table.sql
   psql -U postgres -d shamay_land_registry -f create_environment_analysis_table.sql
   ```

   **Alternative: Simple one-command setup**
   ```bash
   psql -U postgres -d shamay_land_registry -f comprehensive_schema.sql
   ```
   (This creates the main table that handles most functionality)

## Step 5: Verify Setup

1. **Check if tables were created**
   - Connect to the database: `psql -U postgres -d shamay_land_registry`
   - List all tables: `\dt`
   - You should see tables like:
     - `land_registry_extracts_comprehensive`
     - `building_permit_extracts`
     - `property_assessments`
     - `images`
     - And others...
   - Type `\q` to exit

## Troubleshooting

### Problem: Can't connect to PostgreSQL
**Solution:**
- Make sure PostgreSQL service is running
- Check if you're using the correct password: `postgres123`
- Try connecting with: `psql -U postgres -h localhost -p 5432`

### Problem: Database creation fails
**Solution:**
- Make sure you have administrator privileges
- Try running Command Prompt or Terminal as administrator
- Check if the database name doesn't already exist

### Problem: Permission denied errors
**Solution:**
- Make sure you're logged in as the `postgres` user
- Check file permissions on SQL files
- Try running: `sudo chmod +r *.sql` (Linux/Mac)

### Problem: SQL files not found
**Solution:**
- Make sure you're in the correct directory
- Check if the `database` folder exists
- Verify all SQL files are present

## What the Database Contains

After setup, your database will have these main components:

### Tables for Document Processing:
- **Land Registry** (נסח טאבו) - Property ownership documents
- **Building Permits** (היתרי בנייה) - Construction permits
- **Shared Building Orders** (צו בית משותף) - Condominium documents

### Tables for Property Assessment:
- **Property Assessments** - User input for property valuations
- **Comparable Data** - Property sales data for comparisons
- **Images** - Property photos and documents
- **Garmushka** - Measurement documents
- **Miscellaneous** - Additional valuation data
- **Environment Analysis** - Location and neighborhood data

## Database Connection Details

Once set up, your database will be accessible with these details:
- **Host**: localhost (or 127.0.0.1)
- **Port**: 5432
- **Database**: shamay_land_registry
- **Username**: postgres
- **Password**: postgres123

## Next Steps

After completing the database setup:
1. You can start using the Shamay application
2. The system will automatically store extracted document data
3. You can add property assessments and images
4. Use the web interface to view and manage your data

## Getting Help

If you encounter issues:
1. Check the error message carefully
2. Verify all steps were completed
3. Make sure PostgreSQL is running
4. Contact technical support with specific error messages

## Security Note

The default password `postgres123` is for development/testing only. For production use, please:
1. Change the password to something secure
2. Update the connection settings in the application
3. Consider setting up proper user permissions