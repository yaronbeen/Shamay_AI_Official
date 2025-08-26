#!/usr/bin/env node

/**
 * Images Management CLI Tool
 * Command-line interface for managing property-related images
 */

import { 
  uploadImage,
  getImage,
  getImagesByType,
  getImagesByPropertyAssessment,
  searchImages,
  updateImage,
  deleteImage,
  getImageStats,
  getImageTypes,
  organizeImagesByPropertyAssessment,
  bulkUploadImages
} from './images-management/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    showHelp();
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'upload':
        await handleUpload();
        break;
      case 'get':
        await handleGet();
        break;
      case 'list-types':
        await handleListTypes();
        break;
      case 'by-type':
        await handleByType();
        break;
      case 'by-property':
        await handleByProperty();
        break;
      case 'search':
        await handleSearch();
        break;
      case 'update':
        await handleUpdate();
        break;
      case 'delete':
        await handleDelete();
        break;
      case 'stats':
        await handleStats();
        break;
      case 'organize':
        await handleOrganize();
        break;
      case 'demo':
        await handleDemo();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📸 Images Management CLI Tool

Usage: node images-cli.js <command> [options]

Commands:
  upload                Upload a new image (demo)
  get <id>             Get image by ID
  list-types           List all supported image types
  by-type <type>       Get images by type
  by-property <id>     Get images by property assessment ID
  search <query>       Search images
  update <id>          Update image metadata
  delete <id>          Delete image (soft delete)
  stats                Show image statistics
  organize <prop_id>   Organize images by property assessment
  demo                 Create demo image records

Examples:
  node images-cli.js demo
  node images-cli.js list-types
  node images-cli.js by-type "תמונה חיצונית"
  node images-cli.js stats
  node images-cli.js organize 1
`);
}

async function handleUpload() {
  console.log('📸 Creating demo image upload...\n');
  
  // Demo image data - in real app this would include actual file upload
  const imageData = {
    image_type: 'תמונה חיצונית',
    title: 'חזית הבניין הראשי',
    filename: 'building_front_demo.jpg',
    file_path: '/demo/uploads/building_front_demo.jpg',
    file_size: 1024000, // 1MB demo size
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    property_assessment_id: 1,
    captured_date: '20/11/2024',
    notes: 'צילום מהרחוב, מציג את החזית הדרומית של הבניין',
    tags: ['חזית', 'רחוב', 'בניין']
  };
  
  const result = await uploadImage(imageData, 'demo-user');
  
  console.log('✅ Image uploaded successfully!');
  console.log(`📋 ID: ${result.id}`);
  console.log(`📅 Created at: ${result.created_at}`);
  console.log(`🏷️ Type: ${imageData.image_type}`);
  console.log(`📄 Title: ${imageData.title}`);
}

async function handleGet() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide image ID: node images-cli.js get <id>');
    return;
  }
  
  const image = await getImage(id);
  
  console.log('\n📸 Image Record:');
  console.log('=' .repeat(50));
  console.log(`ID: ${image.id}`);
  console.log(`Type: ${image.image_type}`);
  console.log(`Title: ${image.title || 'Not specified'}`);
  console.log(`Filename: ${image.filename}`);
  console.log(`File Path: ${image.file_path}`);
  console.log(`File Size: ${image.file_size ? formatFileSize(image.file_size) : 'Unknown'}`);
  console.log(`MIME Type: ${image.mime_type || 'Unknown'}`);
  console.log(`Dimensions: ${image.width && image.height ? `${image.width}x${image.height}` : 'Unknown'}`);
  console.log(`Property Assessment ID: ${image.property_assessment_id || 'Not linked'}`);
  console.log(`Captured Date: ${image.captured_date || 'Not specified'}`);
  console.log(`Uploaded By: ${image.uploaded_by}`);
  console.log(`Status: ${image.status}`);
  console.log(`Created: ${image.created_at}`);
  console.log(`Updated: ${image.updated_at}`);
  
  if (image.notes) {
    console.log(`\nNotes: ${image.notes}`);
  }
  
  if (image.tags && image.tags.length > 0) {
    console.log(`Tags: ${image.tags.join(', ')}`);
  }
}

async function handleListTypes() {
  const types = getImageTypes();
  
  console.log('\n📷 Supported Image Types:');
  console.log('=' .repeat(40));
  
  types.forEach((type, index) => {
    console.log(`${index + 1}. ${type}`);
  });
  
  console.log(`\nTotal: ${types.length} image types supported`);
}

async function handleByType() {
  const imageType = process.argv[3];
  
  if (!imageType) {
    console.log('❌ Please provide image type: node images-cli.js by-type "<type>"');
    console.log('\nAvailable types:');
    getImageTypes().forEach(type => console.log(`  - "${type}"`));
    return;
  }
  
  const images = await getImagesByType(imageType, 10);
  
  console.log(`\n📸 Images of type "${imageType}": ${images.length} found`);
  console.log('=' .repeat(80));
  
  if (images.length === 0) {
    console.log('No images found for this type.');
  } else {
    console.log('ID   | Title                   | Filename                | Property | Created');
    console.log('-' .repeat(80));
    
    images.forEach(image => {
      const id = image.id.toString().padEnd(4);
      const title = (image.title || 'N/A').substring(0, 22).padEnd(22);
      const filename = image.filename.substring(0, 22).padEnd(22);
      const propId = (image.property_assessment_id || 'N/A').toString().padEnd(8);
      const date = new Date(image.created_at).toISOString().split('T')[0];
      
      console.log(`${id} | ${title} | ${filename} | ${propId} | ${date}`);
    });
  }
}

async function handleByProperty() {
  const propertyId = parseInt(process.argv[3]);
  
  if (!propertyId) {
    console.log('❌ Please provide property assessment ID: node images-cli.js by-property <id>');
    return;
  }
  
  const images = await getImagesByPropertyAssessment(propertyId);
  
  console.log(`\n📸 Images for Property Assessment ID ${propertyId}: ${images.length} found`);
  console.log('=' .repeat(80));
  
  if (images.length === 0) {
    console.log('No images found for this property assessment.');
  } else {
    // Group by type for better display
    const byType = {};
    images.forEach(image => {
      if (!byType[image.image_type]) {
        byType[image.image_type] = [];
      }
      byType[image.image_type].push(image);
    });
    
    Object.entries(byType).forEach(([type, typeImages]) => {
      console.log(`\n📷 ${type} (${typeImages.length} images):`);
      typeImages.forEach(image => {
        console.log(`  - ID: ${image.id}, ${image.title || image.filename}, ${formatFileSize(image.file_size || 0)}`);
      });
    });
  }
}

async function handleSearch() {
  const query = process.argv[3];
  
  if (!query) {
    console.log('❌ Please provide search query: node images-cli.js search "<query>"');
    return;
  }
  
  const criteria = { title: query };
  const results = await searchImages(criteria);
  
  console.log(`\n🔍 Search results for "${query}": ${results.length} found`);
  console.log('=' .repeat(80));
  
  if (results.length === 0) {
    console.log('No images found.');
  } else {
    results.forEach(image => {
      console.log(`ID: ${image.id} | ${image.image_type} | ${image.title || image.filename} | ${new Date(image.created_at).toISOString().split('T')[0]}`);
    });
  }
}

async function handleUpdate() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide image ID: node images-cli.js update <id>');
    return;
  }
  
  // Demo update data
  const updateData = {
    title: 'תמונה עודכנה - כותרת חדשה',
    notes: 'תמונה עודכנה באמצעות CLI',
    tags: ['עודכן', 'cli', 'דמו'],
    status: 'active'
  };
  
  const result = await updateImage(id, updateData, 'cli-user');
  
  console.log(`✅ Image ${id} updated successfully!`);
  console.log(`📅 Updated at: ${result.updated_at}`);
}

async function handleDelete() {
  const id = parseInt(process.argv[3]);
  
  if (!id) {
    console.log('❌ Please provide image ID: node images-cli.js delete <id>');
    return;
  }
  
  // Show image first
  try {
    const image = await getImage(id);
    console.log(`\n🗑️ About to delete: ${image.title || image.filename} (${image.image_type})`);
  } catch (error) {
    console.log(`❌ Image ${id} not found`);
    return;
  }
  
  const success = await deleteImage(id, false); // Soft delete
  
  if (success) {
    console.log(`✅ Image ${id} deleted successfully (soft delete)!`);
  }
}

async function handleStats() {
  const stats = await getImageStats();
  
  console.log('\n📊 Images Statistics:');
  console.log('=' .repeat(40));
  console.log(`Total Images: ${stats.total}`);
  console.log(`Images This Week: ${stats.recentWeek}`);
  console.log(`Total Storage: ${formatFileSize(stats.totalSizeBytes)}`);
  console.log(`Average Size: ${formatFileSize(stats.avgSizeBytes)}`);
  
  console.log('\n📈 By Type:');
  stats.byType.forEach(item => {
    console.log(`  ${item.image_type}: ${item.active_count} active (${item.total_count} total)`);
  });
}

async function handleOrganize() {
  const propertyId = parseInt(process.argv[3]);
  
  if (!propertyId) {
    console.log('❌ Please provide property assessment ID: node images-cli.js organize <id>');
    return;
  }
  
  const organized = await organizeImagesByPropertyAssessment(propertyId);
  
  console.log(`\n📁 Images Organization for Property Assessment ${propertyId}:`);
  console.log('=' .repeat(60));
  console.log(`Total Images: ${organized.totalImages}`);
  
  console.log('\n📷 By Category:');
  organized.summary.forEach(item => {
    console.log(`  ${item.type}: ${item.count} images`);
  });
  
  console.log('\n📸 Missing Categories:');
  const missingTypes = organized.summary.filter(item => item.count === 0);
  if (missingTypes.length === 0) {
    console.log('  ✅ All image types are present');
  } else {
    missingTypes.forEach(item => {
      console.log(`  ❌ ${item.type}: No images`);
    });
  }
}

async function handleDemo() {
  console.log('🎯 Creating demo image records...\n');
  
  const demoImages = [
    {
      image_type: 'תמונה חיצונית',
      title: 'חזית הבניין מהרחוב',
      filename: 'building_exterior_1.jpg',
      file_path: '/demo/uploads/building_exterior_1.jpg',
      file_size: 2048000,
      mime_type: 'image/jpeg',
      width: 1920,
      height: 1080,
      property_assessment_id: 1,
      captured_date: '15/11/2024',
      tags: ['חזית', 'רחוב']
    },
    {
      image_type: 'סקרין שוט GOVMAP',
      title: 'מיקום הנכס במפת ממשלה',
      filename: 'govmap_location.png',
      file_path: '/demo/uploads/govmap_location.png',
      file_size: 1024000,
      mime_type: 'image/png',
      width: 1366,
      height: 768,
      property_assessment_id: 1,
      captured_date: '15/11/2024',
      tags: ['מפה', 'מיקום']
    },
    {
      image_type: 'תמונות פנימיות',
      title: 'סלון ומטבח',
      filename: 'interior_living_room.jpg',
      file_path: '/demo/uploads/interior_living_room.jpg',
      file_size: 1536000,
      mime_type: 'image/jpeg',
      width: 1600,
      height: 1200,
      property_assessment_id: 2,
      captured_date: '16/11/2024',
      tags: ['פנים', 'סלון', 'מטבח']
    },
    {
      image_type: 'סקרין שוט תצ״א',
      title: 'תצלום אווירי של האזור',
      filename: 'aerial_view.jpg',
      file_path: '/demo/uploads/aerial_view.jpg',
      file_size: 3072000,
      mime_type: 'image/jpeg',
      width: 2048,
      height: 1536,
      property_assessment_id: 2,
      captured_date: '16/11/2024',
      tags: ['אווירי', 'אזור']
    }
  ];
  
  const results = await bulkUploadImages(demoImages, 'demo-user');
  
  console.log(`✅ Bulk upload completed:`);
  console.log(`  Successful: ${results.successful.length}`);
  console.log(`  Failed: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n📸 Successfully uploaded:');
    results.successful.forEach(item => {
      console.log(`  - ID ${item.id}: ${item.filename} (${item.image_type})`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    results.failed.forEach(item => {
      console.log(`  - ${item.filename}: ${item.error}`);
    });
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}