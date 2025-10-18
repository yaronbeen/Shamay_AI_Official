/**
 * Test script for Hebrew property images upload
 * Demonstrates how to use the uploadPropertyImages function
 */

import { uploadPropertyImages, getImageTypes } from './index.js';

async function testPropertyImagesUpload() {
  try {
    console.log('🧪 Testing Hebrew property images upload...\n');
    
    // Display supported image types
    console.log('📋 Supported Image Types:');
    const validTypes = getImageTypes();
    validTypes.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type}`);
    });
    console.log('\n');
    
    // Example images data with Hebrew types
    const testImages = [
      {
        image_type: 'תמונה חיצונית',
        filename: 'building_exterior.jpg',
        file_path: '/uploads/property_123/exterior_1.jpg',
        title: 'חזית הבניין הראשית',
        notes: 'תמונת חזית מהכביש הראשי',
        captured_date: '2024-01-15',
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        tags: ['חזית', 'בניין', 'חיצוני']
      },
      {
        image_type: 'סקרין שוט GOVMAP',
        filename: 'govmap_screenshot.png',
        file_path: '/uploads/property_123/govmap_view.png',
        title: 'מיקום הנכס ב-GOVMAP',
        notes: 'צילום מסך של מיקום הנכס במערכת GOVMAP',
        captured_date: '2024-01-15',
        mime_type: 'image/png',
        width: 1366,
        height: 768,
        tags: ['govmap', 'מפה', 'מיקום']
      },
      {
        image_type: 'סקרין שוט תצ״א',
        filename: 'aerial_view_1.png',
        file_path: '/uploads/property_123/aerial_1.png',
        title: 'תצלום אווירי של הנכס',
        notes: 'צילום אווירי המראה את המבנה ממעל',
        captured_date: '2024-01-15',
        mime_type: 'image/png',
        width: 1024,
        height: 768,
        tags: ['תצ״א', 'אווירי', 'מלמעלה']
      },
      {
        image_type: 'סקרין שוט תצ״א 2',
        filename: 'aerial_view_2.png',
        file_path: '/uploads/property_123/aerial_2.png',
        title: 'תצלום אווירי נוסף',
        notes: 'זווית נוספת של התצלום האווירי',
        captured_date: '2024-01-15',
        mime_type: 'image/png',
        width: 1024,
        height: 768,
        tags: ['תצ״א', 'אווירי', 'זווית_נוספת']
      },
      {
        image_type: 'תמונות פנימיות',
        filename: 'interior_1.jpg',
        file_path: '/uploads/property_123/interior_living.jpg',
        title: 'סלון הדירה',
        notes: 'תמונת הסלון הראשי',
        captured_date: '2024-01-15',
        mime_type: 'image/jpeg',
        width: 1600,
        height: 1200,
        tags: ['פנים', 'סלון', 'דירה']
      },
      {
        image_type: 'תמונות פנימיות',
        filename: 'interior_2.jpg',
        file_path: '/uploads/property_123/interior_kitchen.jpg',
        title: 'מטבח הדירה',
        notes: 'תמונת המטבח',
        captured_date: '2024-01-15',
        mime_type: 'image/jpeg',
        width: 1600,
        height: 1200,
        tags: ['פנים', 'מטבח', 'דירה']
      },
      {
        image_type: 'סקרין שוט מהצו בית משותף',
        filename: 'shared_building_order.png',
        file_path: '/uploads/property_123/building_order_screenshot.png',
        title: 'צילום מסך מצו הבית המשותף',
        notes: 'מידע על הבית המשותף מהצו הרישום',
        captured_date: '2024-01-15',
        mime_type: 'image/png',
        width: 1200,
        height: 1600,
        tags: ['צו', 'בית_משותף', 'רישום']
      },
      {
        image_type: 'צילום תשריט מהתב״ע',
        filename: 'zoning_plan.png',
        file_path: '/uploads/property_123/zoning_screenshot.png',
        title: 'תשריט התב״ע של האזור',
        notes: 'תשריט התכנית מהתב״ע המקומית',
        captured_date: '2024-01-15',
        mime_type: 'image/png',
        width: 1400,
        height: 1000,
        tags: ['תב״ע', 'תשריט', 'תכנון']
      }
    ];
    
    // Test upload with property assessment ID
    const propertyAssessmentId = 1; // Example property assessment ID
    const userId = 'test-user';
    
    console.log('🚀 Starting upload test...\n');
    
    const results = await uploadPropertyImages({
      images: testImages,
      propertyAssessmentId,
      userId
    });
    
    console.log('\n📈 Final Results:');
    console.log('==================');
    console.log(`Total Images: ${results.total}`);
    console.log(`Successful: ${results.summary.totalSuccessful}`);
    console.log(`Failed: ${results.summary.totalFailed}`);
    console.log(`Success Rate: ${results.summary.successRate}`);
    console.log(`Property Assessment ID: ${results.propertyAssessmentId}\n`);
    
    if (results.successful.length > 0) {
      console.log('✅ Successfully uploaded images:');
      results.successful.forEach(img => {
        console.log(`  - ID ${img.id}: ${img.image_type} (${img.filename})`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed uploads:');
      results.failed.forEach(failure => {
        console.log(`  - ${failure.image_type}: ${failure.filename} - ${failure.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with individual image types
async function testIndividualTypes() {
  console.log('\n🔬 Testing individual image types...\n');
  
  const imageTypes = getImageTypes();
  
  for (const imageType of imageTypes) {
    console.log(`Testing: ${imageType}`);
    
    const singleImage = [{
      image_type: imageType,
      filename: `test_${imageType.replace(/\s+/g, '_')}.jpg`,
      file_path: `/test/images/test_${imageType.replace(/\s+/g, '_')}.jpg`,
      title: `טסט ${imageType}`,
      notes: `בדיקה עבור ${imageType}`,
      captured_date: '2024-01-15'
    }];
    
    try {
      const result = await uploadPropertyImages({
        images: singleImage,
        propertyAssessmentId: 999, // Test property ID
        userId: 'test-individual'
      });
      
      console.log(`  ✅ ${imageType}: Success`);
      
    } catch (error) {
      console.log(`  ❌ ${imageType}: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting Hebrew Property Images Tests');
  console.log('=====================================\n');
  
  try {
    await testPropertyImagesUpload();
    await testIndividualTypes();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Export for use in other tests
export { testPropertyImagesUpload, testIndividualTypes };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}