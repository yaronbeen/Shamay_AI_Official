#!/usr/bin/env node

/**
 * Simple CLI Image Upload Test
 * Direct database insertion without foreign key constraints
 */

import { ImagesDatabaseClient, getImageTypes } from './index.js';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function windowsToWslPath(windowsPath) {
  if (!windowsPath) return '';
  let cleanPath = windowsPath.replace(/^["']|["']$/g, '');
  if (cleanPath.startsWith('/')) return cleanPath;
  
  return cleanPath
    .replace(/^([A-Za-z]):/, '/mnt/$1')
    .replace(/\\/g, '/')
    .toLowerCase()
    .replace('/mnt/c', '/mnt/c');
}

function validateImageFile(filePath) {
  const wslPath = windowsToWslPath(filePath);
  
  if (!fs.existsSync(wslPath)) {
    throw new Error(`File not found: ${wslPath}`);
  }
  
  const ext = path.extname(wslPath).toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  
  if (!validExtensions.includes(ext)) {
    throw new Error(`Invalid image format. Supported: ${validExtensions.join(', ')}`);
  }
  
  return wslPath;
}

async function simpleImageUpload() {
  try {
    console.log('📸 Simple Hebrew Image Upload Test');
    console.log('==================================');
    console.log('💡 Enter a Windows path like: C:\\Users\\dell\\Documents\\image.jpg\n');
    
    // Get image path
    const windowsPath = await question('Enter Windows path to image: ');
    const wslPath = validateImageFile(windowsPath);
    console.log(`✅ Converted path: ${wslPath}`);
    
    // Get file info
    const stats = fs.statSync(wslPath);
    const filename = path.basename(wslPath);
    const ext = path.extname(wslPath).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp'
    };
    
    console.log(`📦 File: ${filename} (${stats.size} bytes)`);
    
    // Show image types
    const imageTypes = getImageTypes();
    console.log('\n📋 Select Hebrew image type:');
    imageTypes.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type}`);
    });
    
    const typeChoice = await question('\nEnter type number (1-7): ');
    const typeIndex = parseInt(typeChoice) - 1;
    
    if (typeIndex < 0 || typeIndex >= imageTypes.length) {
      throw new Error('Invalid type selection');
    }
    
    const selectedType = imageTypes[typeIndex];
    console.log(`✅ Selected: ${selectedType}`);
    
    // Get optional info
    const title = await question('Enter title (optional): ') || `${selectedType} - ${filename}`;
    const notes = await question('Enter notes (optional): ') || `תמונה שהועלתה דרך CLI - ${filename}`;
    
    // Direct database insertion
    console.log('\n🚀 Uploading to database...');
    
    const db = new ImagesDatabaseClient();
    await db.connect();
    
    const query = `
      INSERT INTO images (
        image_type, title, filename, file_path, file_size, mime_type,
        captured_date, notes, uploaded_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at
    `;
    
    const values = [
      selectedType,                    // image_type
      title,                          // title  
      filename,                       // filename
      wslPath,                        // file_path
      stats.size,                     // file_size
      mimeTypes[ext] || 'image/jpeg', // mime_type
      '2024-01-15',                   // captured_date
      notes,                          // notes
      'cli-test-user',                // uploaded_by
      'active'                        // status
    ];
    
    const result = await db.client.query(query, values);
    await db.disconnect();
    
    const insertedRow = result.rows[0];
    
    console.log(`✅ Image uploaded successfully!`);
    console.log(`📋 Database ID: ${insertedRow.id}`);
    console.log(`📅 Created: ${insertedRow.created_at}`);
    console.log(`📁 File: ${filename}`);
    console.log(`🏷️ Type: ${selectedType}`);
    
    // Verify by querying back
    console.log('\n🔍 Verifying upload...');
    await db.connect();
    const verifyQuery = 'SELECT * FROM images WHERE id = $1';
    const verifyResult = await db.client.query(verifyQuery, [insertedRow.id]);
    await db.disconnect();
    
    if (verifyResult.rows.length > 0) {
      const uploaded = verifyResult.rows[0];
      console.log(`✅ Verification successful:`);
      console.log(`   ID: ${uploaded.id}`);
      console.log(`   Type: ${uploaded.image_type}`);
      console.log(`   File: ${uploaded.filename}`);
      console.log(`   Size: ${uploaded.file_size} bytes`);
      console.log(`   Status: ${uploaded.status}`);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the upload
simpleImageUpload();