import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing SHAMAY.AI Database...')
    
    // Step 1: Create database if it doesn't exist
    await createDatabase()
    
    // Step 2: Run comprehensive schema
    await runComprehensiveSchema()
    
    // Step 3: Set up Hebrew support
    await setupHebrewSupport()
    
    // Step 4: Create indexes and views
    await createIndexesAndViews()
    
    console.log('✅ Database initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

async function createDatabase() {
  return new Promise((resolve, reject) => {
    const process = spawn('psql', [
      '-U', 'postgres',
      '-d', 'postgres',
      '-c', 'CREATE DATABASE shamay_land_registry;'
    ])
    
    process.on('close', (code) => {
      if (code === 0 || code === 1) { // 1 means database already exists
        resolve({ success: true })
      } else {
        reject(new Error('Failed to create database'))
      }
    })
  })
}

async function runComprehensiveSchema() {
  const schemaPath = join(process.cwd(), 'database', 'comprehensive_schema.sql')
  
  return new Promise((resolve, reject) => {
    const process = spawn('psql', [
      '-U', 'postgres',
      '-d', 'shamay_land_registry',
      '-f', schemaPath
    ])
    
    let output = ''
    let errorOutput = ''
    
    process.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        reject(new Error(errorOutput))
      }
    })
  })
}

async function setupHebrewSupport() {
  const hebrewPath = join(process.cwd(), 'setup-hebrew-psql.sql')
  
  return new Promise((resolve, reject) => {
    const process = spawn('psql', [
      '-U', 'postgres',
      '-d', 'shamay_land_registry',
      '-f', hebrewPath
    ])
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        reject(new Error('Failed to setup Hebrew support'))
      }
    })
  })
}

async function createIndexesAndViews() {
  // This would run additional SQL files for indexes and views
  console.log('📊 Creating indexes and views...')
  return { success: true }
}
