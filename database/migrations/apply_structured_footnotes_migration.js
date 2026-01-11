/**
 * Migration: Add structured_footnotes column to shuma table
 * Run with: node apply_structured_footnotes_migration.js
 */

import pg from "pg";
import dotenv from "dotenv";
const { Pool } = pg;
dotenv.config({ path: "./frontend/.env.local" });

async function runMigration() {
  // Try multiple connection string sources
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.NX_DATABASE_URL;

  if (!connectionString) {
    console.error("❌ No database connection string found!");
    console.log("Available env vars with 'POSTGRES' or 'DATABASE':");
    Object.keys(process.env)
      .filter((k) => k.includes("POSTGRES") || k.includes("DATABASE"))
      .forEach((k) => {
        console.log(`  - ${k}`);
      });
    console.log(
      "Please ensure DATABASE_URL or POSTGRES_URL is set in frontend/.env.local",
    );
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  console.log("   Connection:", connectionString.substring(0, 30) + "...");

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database");

    console.log("\n📝 Running migration: 013_add_structured_footnotes...\n");

    // Run migration statements one by one
    const migrations = [
      {
        name: "structured_footnotes",
        sql: `ALTER TABLE shuma ADD COLUMN IF NOT EXISTS structured_footnotes JSONB DEFAULT '[]'::jsonb`,
      },
      {
        name: "idx_structured_footnotes",
        sql: `CREATE INDEX IF NOT EXISTS idx_shuma_structured_footnotes ON shuma USING gin(structured_footnotes)`,
      },
    ];

    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        console.log(`   ✅ Added ${migration.name}`);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(`   ⚠️  ${migration.name} already exists (skipping)`);
        } else {
          throw err;
        }
      }
    }

    // Verify the column exists
    console.log("\n🔍 Verifying column...");
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'shuma'
      AND column_name = 'structured_footnotes'
    `);

    if (verifyResult.rows.length > 0) {
      console.log("\n📋 New column in shuma table:");
      for (const row of verifyResult.rows) {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      }
    }

    client.release();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
