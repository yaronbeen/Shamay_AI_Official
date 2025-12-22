/**
 * Property Assessment Module - User Input Data Management
 * 
 * Main module for managing user-provided property assessment data (שומות שווי)
 * No document analysis - purely user input form data storage and management
 */

import { PropertyAssessmentDatabaseClient } from './database-client.js';
import { PropertyAssessmentValidator } from './validator.js';

/**
 * Create a new property assessment record
 * @param {Object} assessmentData - User-provided assessment data
 * @param {string} userId - ID of user creating the record
 * @returns {Promise<Object>} - Creation result
 */
async function createPropertyAssessment(assessmentData, userId = 'system') {
  try {
    console.log('🏠 Creating new property assessment...');
    
    // Step 1: Validate input data
    const validator = new PropertyAssessmentValidator();
    const sanitizedData = validator.sanitizeData(assessmentData);
    const validation = validator.validateAssessmentData(sanitizedData);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.hasWarnings) {
      console.log('⚠️ Validation warnings:', validation.warnings);
    }
    
    // Step 2: Save to database
    const db = new PropertyAssessmentDatabaseClient();
    const result = await db.insertPropertyAssessment(sanitizedData, userId);
    await db.disconnect();
    
    console.log(`✅ Property assessment created successfully with ID: ${result.id}`);
    
    return {
      success: true,
      id: result.id,
      created_at: result.created_at,
      warnings: validation.warnings,
      data: sanitizedData
    };
    
  } catch (error) {
    console.error('❌ Failed to create property assessment:', error.message);
    throw error;
  }
}

/**
 * Update an existing property assessment record
 * @param {number} id - Record ID
 * @param {Object} assessmentData - Updated data
 * @param {string} userId - ID of user updating the record
 * @returns {Promise<Object>} - Update result
 */
async function updatePropertyAssessment(id, assessmentData, userId = 'system') {
  try {
    console.log(`🔄 Updating property assessment ID: ${id}`);
    
    // Step 1: Validate input data
    const validator = new PropertyAssessmentValidator();
    const sanitizedData = validator.sanitizeData(assessmentData);
    const validation = validator.validateAssessmentData(sanitizedData);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.hasWarnings) {
      console.log('⚠️ Validation warnings:', validation.warnings);
    }
    
    // Step 2: Update in database
    const db = new PropertyAssessmentDatabaseClient();
    const result = await db.updatePropertyAssessment(id, sanitizedData, userId);
    await db.disconnect();
    
    console.log(`✅ Property assessment updated successfully: ID ${id}`);
    
    return {
      success: true,
      id: result.id,
      updated_at: result.updated_at,
      warnings: validation.warnings,
      data: sanitizedData
    };
    
  } catch (error) {
    console.error('❌ Failed to update property assessment:', error.message);
    throw error;
  }
}

/**
 * Get property assessment by ID
 * @param {number} id - Record ID
 * @returns {Promise<Object>} - Property assessment record
 */
async function getPropertyAssessment(id) {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    const result = await db.getPropertyAssessmentById(id);
    await db.disconnect();
    
    if (!result) {
      throw new Error(`Property assessment with ID ${id} not found`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to get property assessment:', error.message);
    throw error;
  }
}

/**
 * Search property assessments by criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} - Matching records
 */
async function searchPropertyAssessments(criteria) {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    const results = await db.searchPropertyAssessments(criteria);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to search property assessments:', error.message);
    throw error;
  }
}

/**
 * Get recent property assessments
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} - Recent records
 */
async function getRecentPropertyAssessments(limit = 10) {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    const results = await db.getRecentPropertyAssessments(limit);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get recent property assessments:', error.message);
    throw error;
  }
}

/**
 * Delete property assessment by ID
 * @param {number} id - Record ID
 * @returns {Promise<boolean>} - Success status
 */
async function deletePropertyAssessment(id) {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    const result = await db.deletePropertyAssessment(id);
    await db.disconnect();
    
    console.log(`🗑️ Property assessment deleted: ID ${id}`);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to delete property assessment:', error.message);
    throw error;
  }
}

/**
 * Validate property assessment data without saving
 * @param {Object} assessmentData - Data to validate
 * @returns {Object} - Validation result
 */
function validatePropertyAssessmentData(assessmentData) {
  const validator = new PropertyAssessmentValidator();
  const sanitizedData = validator.sanitizeData(assessmentData);
  const validation = validator.validateAssessmentData(sanitizedData);
  
  return {
    ...validation,
    sanitizedData
  };
}

/**
 * Get property assessment statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getPropertyAssessmentStats() {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    await db.connect();
    
    // Get various statistics
    const totalQuery = 'SELECT COUNT(*) as total FROM property_assessments';
    const statusQuery = 'SELECT status, COUNT(*) as count FROM property_assessments GROUP BY status';
    const cityQuery = 'SELECT city, COUNT(*) as count FROM property_assessments WHERE city IS NOT NULL GROUP BY city ORDER BY count DESC LIMIT 10';
    const recentQuery = 'SELECT COUNT(*) as count FROM property_assessments WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    
    const [totalResult, statusResult, cityResult, recentResult] = await Promise.all([
      db.client.query(totalQuery),
      db.client.query(statusQuery),
      db.client.query(cityQuery),
      db.client.query(recentQuery)
    ]);
    
    await db.disconnect();
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byStatus: statusResult.rows,
      topCities: cityResult.rows,
      recentMonth: parseInt(recentResult.rows[0].count)
    };
    
  } catch (error) {
    console.error('❌ Failed to get property assessment statistics:', error.message);
    throw error;
  }
}

export {
  // Main CRUD operations
  createPropertyAssessment,
  updatePropertyAssessment,
  getPropertyAssessment,
  searchPropertyAssessments,
  getRecentPropertyAssessments,
  deletePropertyAssessment,
  
  // Utility functions
  validatePropertyAssessmentData,
  getPropertyAssessmentStats,
  
  // Individual components (for advanced usage)
  PropertyAssessmentDatabaseClient,
  PropertyAssessmentValidator
};