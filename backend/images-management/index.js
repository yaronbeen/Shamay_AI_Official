/**
 * Images Management Module
 * 
 * Main module for managing property-related images with different categories
 * Handles image storage, metadata, and linking to various document types
 */

import { ImagesDatabaseClient } from './database-client.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload and register a new image
 * @param {Object} imageData - Image data and metadata
 * @param {string} userId - ID of user uploading the image
 * @returns {Promise<Object>} - Upload result
 */
async function uploadImage(imageData, userId = 'system') {
  try {
    console.log(`📸 Uploading new image: ${imageData.image_type}`);
    
    // Step 1: Validate required fields
    if (!imageData.image_type) {
      throw new Error('Image type is required');
    }
    
    if (!imageData.filename) {
      throw new Error('Filename is required');
    }
    
    if (!imageData.file_path) {
      throw new Error('File path is required');
    }
    
    // Step 2: Validate image type
    const db = new ImagesDatabaseClient();
    const validTypes = db.getImageTypes();
    
    if (!validTypes.includes(imageData.image_type)) {
      throw new Error(`Invalid image type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Step 3: Get file information if file exists
    if (fs.existsSync(imageData.file_path)) {
      const stats = fs.statSync(imageData.file_path);
      imageData.file_size = stats.size;
      
      // Try to determine MIME type from extension
      const ext = path.extname(imageData.filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp'
      };
      
      if (!imageData.mime_type && mimeTypes[ext]) {
        imageData.mime_type = mimeTypes[ext];
      }
    }
    
    // Step 4: Save to database
    const result = await db.insertImage(imageData, userId);
    await db.disconnect();
    
    console.log(`✅ Image uploaded successfully with ID: ${result.id}`);
    
    return {
      success: true,
      id: result.id,
      created_at: result.created_at,
      data: imageData
    };
    
  } catch (error) {
    console.error('❌ Failed to upload image:', error.message);
    throw error;
  }
}

/**
 * Get image by ID
 * @param {number} id - Image ID
 * @returns {Promise<Object>} - Image record
 */
async function getImage(id) {
  try {
    const db = new ImagesDatabaseClient();
    const result = await db.getImageById(id);
    await db.disconnect();
    
    if (!result) {
      throw new Error(`Image with ID ${id} not found`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to get image:', error.message);
    throw error;
  }
}

/**
 * Get images by type
 * @param {string} imageType - Type of images to retrieve
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of image records
 */
async function getImagesByType(imageType, limit = 50) {
  try {
    const db = new ImagesDatabaseClient();
    const results = await db.getImagesByType(imageType, limit);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get images by type:', error.message);
    throw error;
  }
}

/**
 * Get images linked to a property assessment
 * @param {number} propertyAssessmentId - Property assessment ID
 * @returns {Promise<Array>} - Array of linked images
 */
async function getImagesByPropertyAssessment(propertyAssessmentId) {
  try {
    const db = new ImagesDatabaseClient();
    const results = await db.getImagesByPropertyAssessment(propertyAssessmentId);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get images by property assessment:', error.message);
    throw error;
  }
}

/**
 * Search images by criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} - Matching image records
 */
async function searchImages(criteria) {
  try {
    const db = new ImagesDatabaseClient();
    const results = await db.searchImages(criteria);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to search images:', error.message);
    throw error;
  }
}

/**
 * Update image metadata
 * @param {number} id - Image ID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User making the update
 * @returns {Promise<Object>} - Update result
 */
async function updateImage(id, updateData, userId = 'system') {
  try {
    console.log(`🔄 Updating image ID: ${id}`);
    
    const db = new ImagesDatabaseClient();
    const result = await db.updateImage(id, updateData, userId);
    await db.disconnect();
    
    console.log(`✅ Image updated successfully: ID ${id}`);
    
    return {
      success: true,
      id: result.id,
      updated_at: result.updated_at,
      data: updateData
    };
    
  } catch (error) {
    console.error('❌ Failed to update image:', error.message);
    throw error;
  }
}

/**
 * Delete image
 * @param {number} id - Image ID
 * @param {boolean} hardDelete - True for permanent deletion
 * @returns {Promise<boolean>} - Success status
 */
async function deleteImage(id, hardDelete = false) {
  try {
    const db = new ImagesDatabaseClient();
    const result = await db.deleteImage(id, hardDelete);
    await db.disconnect();
    
    console.log(`🗑️ Image deleted: ID ${id}`);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to delete image:', error.message);
    throw error;
  }
}

/**
 * Get image statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getImageStats() {
  try {
    const db = new ImagesDatabaseClient();
    const stats = await db.getImageStats();
    await db.disconnect();
    
    return stats;
    
  } catch (error) {
    console.error('❌ Failed to get image statistics:', error.message);
    throw error;
  }
}

/**
 * Get all supported image types
 * @returns {Array} - List of valid image types
 */
function getImageTypes() {
  const db = new ImagesDatabaseClient();
  return db.getImageTypes();
}

/**
 * Organize images by property assessment
 * @param {number} propertyAssessmentId - Property assessment ID
 * @returns {Promise<Object>} - Organized images by type
 */
async function organizeImagesByPropertyAssessment(propertyAssessmentId) {
  try {
    const images = await getImagesByPropertyAssessment(propertyAssessmentId);
    
    // Group images by type
    const organized = {};
    const imageTypes = getImageTypes();
    
    // Initialize all types with empty arrays
    imageTypes.forEach(type => {
      organized[type] = [];
    });
    
    // Group actual images
    images.forEach(image => {
      if (organized[image.image_type]) {
        organized[image.image_type].push(image);
      }
    });
    
    return {
      propertyAssessmentId,
      totalImages: images.length,
      imagesByType: organized,
      summary: imageTypes.map(type => ({
        type,
        count: organized[type].length
      }))
    };
    
  } catch (error) {
    console.error('❌ Failed to organize images:', error.message);
    throw error;
  }
}

/**
 * Upload property images with specific Hebrew types
 * Handles the following image types:
 * - תמונה חיצונית (External photo)
 * - סקרין שוט GOVMAP (GOVMAP screenshot)
 * - סקרין שוט תצ״א (Aerial photo screenshot)
 * - סקרין שוט תצ״א 2 (Aerial photo screenshot 2)
 * - תמונות פנימיות (Interior photos)
 * - סקרין שוט מהצו בית משותף (Shared building order screenshot)
 * - צילום תשריט מהתב״ע (Zoning plan screenshot)
 * 
 * @param {Object} params - Upload parameters
 * @param {Array} params.images - Array of image objects with file info
 * @param {string} params.propertyAssessmentId - Property assessment ID to link images to
 * @param {string} params.userId - User ID performing the upload
 * @returns {Promise<Object>} - Upload results with detailed breakdown
 */
async function uploadPropertyImages(params) {
  const { images, propertyAssessmentId, userId = 'system' } = params;
  
  try {
    console.log(`📸 Starting property images upload for assessment ID: ${propertyAssessmentId}`);
    console.log(`📊 Processing ${images.length} images...`);
    
    const results = {
      successful: [],
      failed: [],
      total: images.length,
      byType: {},
      propertyAssessmentId
    };
    
    // Initialize type counters
    const validTypes = getImageTypes();
    validTypes.forEach(type => {
      results.byType[type] = { successful: 0, failed: 0 };
    });
    
    for (let i = 0; i < images.length; i++) {
      const imageInfo = images[i];
      
      try {
        // Validate required fields
        if (!imageInfo.image_type) {
          throw new Error('Image type is required');
        }
        
        if (!imageInfo.file_path) {
          throw new Error('File path is required');
        }
        
        if (!imageInfo.filename) {
          throw new Error('Filename is required');
        }
        
        // Validate image type
        if (!validTypes.includes(imageInfo.image_type)) {
          throw new Error(`Invalid image type: ${imageInfo.image_type}. Valid types: ${validTypes.join(', ')}`);
        }
        
        // Prepare image data with property assessment link
        const imageData = {
          ...imageInfo,
          property_assessment_id: propertyAssessmentId,
          uploaded_by: userId,
          status: 'active'
        };
        
        // Upload image
        const result = await uploadImage(imageData, userId);
        
        results.successful.push({
          index: i,
          id: result.id,
          filename: imageInfo.filename,
          image_type: imageInfo.image_type,
          file_path: imageInfo.file_path,
          created_at: result.created_at
        });
        
        results.byType[imageInfo.image_type].successful++;
        
        console.log(`✅ [${i + 1}/${images.length}] ${imageInfo.image_type}: ${imageInfo.filename}`);
        
      } catch (error) {
        const failureInfo = {
          index: i,
          filename: imageInfo.filename || 'Unknown',
          image_type: imageInfo.image_type || 'Unknown',
          file_path: imageInfo.file_path || 'Unknown',
          error: error.message
        };
        
        results.failed.push(failureInfo);
        
        if (imageInfo.image_type && validTypes.includes(imageInfo.image_type)) {
          results.byType[imageInfo.image_type].failed++;
        }
        
        console.error(`❌ [${i + 1}/${images.length}] Failed: ${imageInfo.filename || 'Unknown'} - ${error.message}`);
      }
    }
    
    // Generate summary
    const summary = {
      totalSuccessful: results.successful.length,
      totalFailed: results.failed.length,
      successRate: ((results.successful.length / results.total) * 100).toFixed(1) + '%'
    };
    
    console.log(`\n📊 Upload Summary for Property Assessment ${propertyAssessmentId}:`);
    console.log(`✅ Successful: ${summary.totalSuccessful}/${results.total} (${summary.successRate})`);
    console.log(`❌ Failed: ${summary.totalFailed}/${results.total}`);
    
    // Log breakdown by type
    console.log(`\n📋 Breakdown by Image Type:`);
    validTypes.forEach(type => {
      const typeStats = results.byType[type];
      const typeTotal = typeStats.successful + typeStats.failed;
      if (typeTotal > 0) {
        console.log(`  ${type}: ${typeStats.successful}/${typeTotal} successful`);
      }
    });
    
    if (results.failed.length > 0) {
      console.log(`\n⚠️ Failed uploads:`);
      results.failed.forEach((failure, idx) => {
        console.log(`  ${idx + 1}. ${failure.filename} (${failure.image_type}): ${failure.error}`);
      });
    }
    
    return {
      ...results,
      summary
    };
    
  } catch (error) {
    console.error('❌ Property images upload failed:', error.message);
    throw error;
  }
}

/**
 * Bulk upload images
 * @param {Array} imagesData - Array of image data objects
 * @param {string} userId - User uploading the images
 * @returns {Promise<Object>} - Bulk upload results
 */
async function bulkUploadImages(imagesData, userId = 'system') {
  try {
    console.log(`📸 Bulk uploading ${imagesData.length} images...`);
    
    const results = {
      successful: [],
      failed: [],
      total: imagesData.length
    };
    
    for (let i = 0; i < imagesData.length; i++) {
      const imageData = imagesData[i];
      
      try {
        const result = await uploadImage(imageData, userId);
        results.successful.push({
          index: i,
          id: result.id,
          filename: imageData.filename,
          image_type: imageData.image_type
        });
      } catch (error) {
        results.failed.push({
          index: i,
          filename: imageData.filename,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed bulk upload:', error.message);
    throw error;
  }
}

export {
  // Main CRUD operations
  uploadImage,
  getImage,
  getImagesByType,
  getImagesByPropertyAssessment,
  searchImages,
  updateImage,
  deleteImage,
  
  // Utility functions
  getImageStats,
  getImageTypes,
  organizeImagesByPropertyAssessment,
  bulkUploadImages,
  uploadPropertyImages,
  
  // Database client for advanced usage
  ImagesDatabaseClient
};