#!/usr/bin/env node

/**
 * Interactive Hebrew Property Images Upload Test
 * Accepts Windows paths via CLI and converts them to WSL paths
 */

import { uploadPropertyImages, getImageTypes, getImagesByPropertyAssessment } from './index.js';
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

/**
 * Convert Windows path to WSL path
 * e.g., "C:\Users\dell\Documents\image.jpg" → "/mnt/c/Users/dell/Documents/image.jpg"
 */
function windowsToWslPath(windowsPath) {
  if (!windowsPath) return '';
  
  // Remove quotes if present
  let cleanPath = windowsPath.replace(/^["']|["']$/g, '');
  
  // If it's already a WSL path, return as-is
  if (cleanPath.startsWith('/')) {
    return cleanPath;
  }
  
  // Convert Windows path to WSL
  // C:\Users\... → /mnt/c/Users/...
  const wslPath = cleanPath
    .replace(/^([A-Za-z]):/, '/mnt/$1')  // C: → /mnt/c
    .replace(/\\/g, '/')                 // \ → /
    .toLowerCase()                       // Convert drive letter to lowercase
    .replace('/mnt/c', '/mnt/c');        // Ensure /mnt/c stays lowercase
  
  return wslPath;
}

/**
 * Validate that file exists and is an image
 */
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

/**
 * Get image metadata
 */
function getImageMetadata(wslPath) {
  const stats = fs.statSync(wslPath);
  const ext = path.extname(wslPath).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp'
  };
  
  return {
    filename: path.basename(wslPath),
    file_size: stats.size,
    mime_type: mimeTypes[ext] || 'image/jpeg'
  };
}

async function collectImageData() {
  const images = [];
  const imageTypes = getImageTypes();
  
  console.log('\n📋 Available Hebrew Image Types:');
  imageTypes.forEach((type, index) => {
    console.log(`  ${index + 1}. ${type}`);
  });
  
  console.log('\n📸 Enter image information (type "done" when finished)\n');
  
  let imageCounter = 1;
  
  while (true) {
    console.log(`\n--- Image ${imageCounter} ---`);
    
    // Get file path
    const windowsPath = await question(`Enter Windows path to image ${imageCounter} (or "done" to finish): `);
    
    if (windowsPath.toLowerCase().trim() === 'done') {
      break;
    }
    
    try {
      // Convert and validate path
      const wslPath = validateImageFile(windowsPath);
      console.log(`✅ Converted path: ${wslPath}`);
      
      // Get metadata
      const metadata = getImageMetadata(wslPath);
      console.log(`📦 File: ${metadata.filename} (${metadata.file_size} bytes)`);
      
      // Select image type
      console.log('\nSelect image type:');
      imageTypes.forEach((type, index) => {
        console.log(`  ${index + 1}. ${type}`);
      });
      
      const typeChoice = await question('Enter type number (1-7): ');
      const typeIndex = parseInt(typeChoice) - 1;
      
      if (typeIndex < 0 || typeIndex >= imageTypes.length) {
        console.log('❌ Invalid choice. Skipping this image.');
        continue;
      }
      
      const selectedType = imageTypes[typeIndex];
      console.log(`✅ Selected: ${selectedType}`);
      
      // Get optional metadata
      const title = await question('Enter title (optional): ');
      const notes = await question('Enter notes (optional): ');
      const capturedDate = await question('Enter captured date (YYYY-MM-DD, optional): ');
      
      // Create image data object
      const imageData = {
        image_type: selectedType,
        filename: metadata.filename,
        file_path: wslPath,
        file_size: metadata.file_size,
        mime_type: metadata.mime_type,
        title: title || `${selectedType} - ${metadata.filename}`,
        notes: notes || `תמונה שהועלתה דרך בדיקת CLI - ${metadata.filename}`,
        captured_date: capturedDate || '2024-01-15',
        tags: [selectedType.split(' ')[0], 'CLI', 'בדיקה']
      };
      
      images.push(imageData);
      console.log(`✅ Added image ${imageCounter}: ${selectedType}`);
      imageCounter++;
      
    } catch (error) {
      console.log(`❌ Error with this image: ${error.message}`);
      console.log('Please try again with a different path.\n');
    }
  }
  
  return images;
}

async function runInteractiveTest() {
  try {
    console.log('🧪 Interactive Hebrew Property Images Upload Test');
    console.log('===============================================');
    console.log('💡 Enter Windows paths like: C:\\Users\\dell\\Documents\\image.jpg');
    console.log('💡 They will be automatically converted to WSL paths\n');
    
    // Collect images
    const images = await collectImageData();
    
    if (images.length === 0) {
      console.log('❌ No images to upload. Exiting.');
      return;
    }
    
    console.log(`\n📋 Collected ${images.length} images for upload:`);
    images.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.image_type}: ${img.filename}`);
    });
    
    // Get property assessment ID
    const propertyIdInput = await question('\nEnter Property Assessment ID (or press enter for test ID 123): ');
    const propertyAssessmentId = propertyIdInput || '123';
    
    // Get user ID
    const userIdInput = await question('Enter User ID (or press enter for "cli-test-user"): ');
    const userId = userIdInput || 'cli-test-user';
    
    console.log(`\n🚀 Uploading ${images.length} images to Property Assessment ID: ${propertyAssessmentId}`);
    console.log(`👤 User: ${userId}\n`);
    
    // Upload images (without foreign key constraint for now)
    const modifiedImages = images.map(img => ({
      ...img,
      property_assessment_id: null // Remove FK constraint for testing
    }));
    
    const results = await uploadPropertyImages({
      images: modifiedImages,
      propertyAssessmentId: null, // This will be ignored since we set it to null above
      userId
    });
    
    // Display results
    console.log('\n📈 Upload Results:');
    console.log('==================');
    console.log(`✅ Successful: ${results.summary.totalSuccessful}/${results.total} (${results.summary.successRate})`);
    console.log(`❌ Failed: ${results.summary.totalFailed}/${results.total}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully Uploaded:');
      results.successful.forEach(img => {
        console.log(`  - ID ${img.id}: ${img.image_type}`);
        console.log(`    📁 ${img.filename}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Uploads:');
      results.failed.forEach(failure => {
        console.log(`  - ${failure.image_type}: ${failure.filename}`);
        console.log(`    ❌ ${failure.error}`);
      });
    }
    
    // Show database verification
    console.log('\n🔍 Verifying in database...');
    
    // Query recent uploads by this user
    try {
      // We'll need to query manually since we can't use property assessment ID
      console.log(`📋 Check database manually with:`);
      console.log(`   SELECT * FROM images WHERE uploaded_by = '${userId}' ORDER BY created_at DESC;`);
    } catch (error) {
      console.log('❌ Database verification failed:', error.message);
    }
    
    console.log('\n🎉 Interactive test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Test cancelled by user');
  rl.close();
  process.exit(0);
});

// Start the interactive test
runInteractiveTest().catch(console.error);