#!/usr/bin/env node

/**
 * Interactive Hebrew Property Images Upload Test
 * Uses real images from test_documents folder
 */

import { uploadPropertyImages, getImageTypes, getImagesByPropertyAssessment } from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findTestImages() {
  const testDocumentsPath = path.join(__dirname, '../test_documents');
  console.log('📂 Looking for images in:', testDocumentsPath);
  
  if (!fs.existsSync(testDocumentsPath)) {
    console.log('❌ test_documents folder not found');
    return [];
  }
  
  const files = fs.readdirSync(testDocumentsPath);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
  });
  
  console.log(`📸 Found ${imageFiles.length} image files:`);
  imageFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  
  return imageFiles.map(file => ({
    filename: file,
    fullPath: path.join(testDocumentsPath, file)
  }));
}

async function createTestImagesData(imageFiles) {
  const imageTypes = getImageTypes();
  console.log('\n📋 Available Hebrew Image Types:');
  imageTypes.forEach((type, index) => {
    console.log(`  ${index + 1}. ${type}`);
  });
  
  const testImages = [];
  
  // Map your existing images to Hebrew types
  const imageTypeMapping = {
    'external_image.jpg': 'תמונה חיצונית',
    'internal_image_-20250608-WA0066.jpg': 'תמונות פנימיות',
    'internal_image_-20250608-WA0067.jpg': 'תמונות פנימיות', 
    'internal_image_-20250608-WA0072.jpg': 'תמונות פנימיות',
    'internal_image_-20250608-WA0073.jpg': 'תמונות פנימיות',
    'internal_image_-20250608-WA0074.jpg': 'תמונות פנימיות',
    'internal_image_-20250608-WA0075.jpg': 'תמונות פנימיות',
    'internal_image_-20250608-WA0076.jpg': 'תמונות פנימיות'
  };
  
  for (const imageFile of imageFiles) {
    const filename = imageFile.filename;
    const filePath = imageFile.fullPath;
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Determine image type
    let imageType = imageTypeMapping[filename];
    if (!imageType) {
      // Default assignment for unmapped files
      if (filename.includes('external') || filename.includes('חיצוני')) {
        imageType = 'תמונה חיצונית';
      } else if (filename.includes('internal') || filename.includes('פנימי')) {
        imageType = 'תמונות פנימיות';
      } else if (filename.includes('govmap')) {
        imageType = 'סקרין שוט GOVMAP';
      } else if (filename.includes('aerial') || filename.includes('תצא')) {
        imageType = 'סקרין שוט תצ״א';
      } else {
        imageType = 'תמונה חיצונית'; // Default fallback
      }
    }
    
    // Determine MIME type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp'
    };
    
    const imageData = {
      image_type: imageType,
      filename: filename,
      file_path: filePath,
      file_size: stats.size,
      mime_type: mimeTypes[ext] || 'image/jpeg',
      title: `${imageType} - ${filename}`,
      notes: `תמונה שהועלתה לצורך בדיקה - ${filename}`,
      captured_date: '2024-01-15',
      tags: [imageType.split(' ')[0], 'טסט', 'בדיקה']
    };
    
    testImages.push(imageData);
  }
  
  return testImages;
}

async function runUploadTest() {
  console.log('🧪 Hebrew Property Images Upload Test');
  console.log('====================================\n');
  
  try {
    // Step 1: Find test images
    const imageFiles = await findTestImages();
    
    if (imageFiles.length === 0) {
      console.log('❌ No image files found in test_documents folder');
      return;
    }
    
    // Step 2: Create test data
    const testImages = await createTestImagesData(imageFiles);
    console.log(`\n📋 Prepared ${testImages.length} images for upload:`);
    testImages.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.image_type}: ${img.filename}`);
    });
    
    // Step 3: Upload images
    const propertyAssessmentId = 123; // Test property ID
    const userId = 'test-upload-user';
    
    console.log(`\n🚀 Uploading to Property Assessment ID: ${propertyAssessmentId}\n`);
    
    const results = await uploadPropertyImages({
      images: testImages,
      propertyAssessmentId,
      userId
    });
    
    // Step 4: Display results
    console.log('\n📈 Upload Results Summary:');
    console.log('===========================');
    console.log(`✅ Successful: ${results.summary.totalSuccessful}/${results.total}`);
    console.log(`❌ Failed: ${results.summary.totalFailed}/${results.total}`);
    console.log(`📊 Success Rate: ${results.summary.successRate}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully Uploaded Images:');
      results.successful.forEach(img => {
        console.log(`  - ID ${img.id}: ${img.image_type} (${img.filename})`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Uploads:');
      results.failed.forEach(failure => {
        console.log(`  - ${failure.image_type}: ${failure.filename}`);
        console.log(`    Error: ${failure.error}`);
      });
    }
    
    // Step 5: Verify by retrieving uploaded images
    console.log('\n🔍 Verifying uploads by querying database...');
    const retrievedImages = await getImagesByPropertyAssessment(propertyAssessmentId);
    
    console.log(`\n📋 Retrieved ${retrievedImages.length} images from database:`);
    retrievedImages.forEach(img => {
      console.log(`  - ID ${img.id}: ${img.image_type} (${img.filename})`);
      console.log(`    📅 Created: ${img.created_at}`);
      console.log(`    📦 Size: ${img.file_size} bytes`);
    });
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Additional test function to show just the upload process
async function quickUploadTest() {
  console.log('⚡ Quick Upload Test\n');
  
  const quickTestImages = [
    {
      image_type: 'תמונה חיצונית',
      filename: 'test_external.jpg', 
      file_path: path.join(__dirname, '../test_documents/external_image.jpg'),
      title: 'בדיקת תמונה חיצונית',
      notes: 'בדיקה מהירה של העלאת תמונה חיצונית'
    },
    {
      image_type: 'תמונות פנימיות',
      filename: 'test_internal.jpg',
      file_path: path.join(__dirname, '../test_documents/internal_image_-20250608-WA0066.jpg'), 
      title: 'בדיקת תמונה פנימית',
      notes: 'בדיקה מהירה של העלאת תמונה פנימית'
    }
  ];
  
  try {
    const results = await uploadPropertyImages({
      images: quickTestImages,
      propertyAssessmentId: 999,
      userId: 'quick-test'
    });
    
    console.log(`✅ Quick test: ${results.summary.totalSuccessful}/${results.total} successful`);
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
  }
}

// Run based on command line argument
const arg = process.argv[2];

if (arg === 'quick') {
  quickUploadTest();
} else {
  runUploadTest();
}