/**
 * Garmushka Management Module
 * 
 * Main module for managing Garmushka documents with measurement data
 * Handles document processing, area measurements, and data extraction
 */

import { GarmushkaDatabaseClient } from './database-client.js';

/**
 * Create a new garmushka record
 * @param {Object} garmushkaData - Garmushka measurement data
 * @param {string} userId - ID of user creating the record
 * @returns {Promise<Object>} - Creation result
 */
async function createGarmushka(garmushkaData, userId = 'system') {
  try {
    console.log('📏 Creating new garmushka record...');
    
    const db = new GarmushkaDatabaseClient();
    const result = await db.insertGarmushka(garmushkaData, userId);
    await db.disconnect();
    
    console.log(`✅ Garmushka created successfully with ID: ${result.id}`);
    
    return {
      success: true,
      id: result.id,
      created_at: result.created_at,
      data: garmushkaData
    };
    
  } catch (error) {
    console.error('❌ Failed to create garmushka:', error.message);
    throw error;
  }
}

/**
 * Get garmushka by ID
 * @param {number} id - Garmushka ID
 * @returns {Promise<Object>} - Garmushka record
 */
async function getGarmushka(id) {
  try {
    const db = new GarmushkaDatabaseClient();
    const result = await db.getGarmushkaById(id);
    await db.disconnect();
    
    if (!result) {
      throw new Error(`Garmushka with ID ${id} not found`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to get garmushka:', error.message);
    throw error;
  }
}

/**
 * Get garmushka records by property assessment
 * @param {number} propertyAssessmentId - Property assessment ID
 * @returns {Promise<Array>} - Array of garmushka records
 */
async function getGarmushkaByPropertyAssessment(propertyAssessmentId) {
  try {
    const db = new GarmushkaDatabaseClient();
    const results = await db.getGarmushkaByPropertyAssessment(propertyAssessmentId);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get garmushka by property assessment:', error.message);
    throw error;
  }
}

/**
 * Search garmushka records by criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} - Matching records
 */
async function searchGarmushka(criteria) {
  try {
    const db = new GarmushkaDatabaseClient();
    const results = await db.searchGarmushka(criteria);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to search garmushka:', error.message);
    throw error;
  }
}

/**
 * Update garmushka record
 * @param {number} id - Record ID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User making the update
 * @returns {Promise<Object>} - Update result
 */
async function updateGarmushka(id, updateData, userId = 'system') {
  try {
    console.log(`🔄 Updating garmushka ID: ${id}`);
    
    const db = new GarmushkaDatabaseClient();
    const result = await db.updateGarmushka(id, updateData, userId);
    await db.disconnect();
    
    console.log(`✅ Garmushka updated successfully: ID ${id}`);
    
    return {
      success: true,
      id: result.id,
      updated_at: result.updated_at,
      data: updateData
    };
    
  } catch (error) {
    console.error('❌ Failed to update garmushka:', error.message);
    throw error;
  }
}

/**
 * Delete garmushka record
 * @param {number} id - Record ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteGarmushka(id) {
  try {
    const db = new GarmushkaDatabaseClient();
    const result = await db.deleteGarmushka(id);
    await db.disconnect();
    
    console.log(`🗑️ Garmushka deleted: ID ${id}`);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to delete garmushka:', error.message);
    throw error;
  }
}

/**
 * Get recent garmushka records
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} - Recent records
 */
async function getRecentGarmushka(limit = 10) {
  try {
    const db = new GarmushkaDatabaseClient();
    const results = await db.getRecentGarmushka(limit);
    await db.disconnect();
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get recent garmushka:', error.message);
    throw error;
  }
}

/**
 * Get garmushka statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getGarmushkaStats() {
  try {
    const db = new GarmushkaDatabaseClient();
    const stats = await db.getGarmushkaStats();
    await db.disconnect();
    
    return stats;
    
  } catch (error) {
    console.error('❌ Failed to get garmushka statistics:', error.message);
    throw error;
  }
}

/**
 * Calculate area ratios and insights
 * @param {Object} garmushkaData - Garmushka data
 * @returns {Object} - Calculated insights
 */
function calculateAreaInsights(garmushkaData) {
  const insights = {
    apartmentToBuiltRatio: null,
    balconyToApartmentRatio: null,
    totalUsableArea: null,
    efficiency: null
  };
  
  if (garmushkaData.apartment_area && garmushkaData.built_area) {
    insights.apartmentToBuiltRatio = (garmushkaData.apartment_area / garmushkaData.built_area) * 100;
  }
  
  if (garmushkaData.balcony_area && garmushkaData.apartment_area) {
    insights.balconyToApartmentRatio = (garmushkaData.balcony_area / garmushkaData.apartment_area) * 100;
  }
  
  if (garmushkaData.apartment_area && garmushkaData.balcony_area) {
    insights.totalUsableArea = garmushkaData.apartment_area + garmushkaData.balcony_area;
  }
  
  if (insights.apartmentToBuiltRatio) {
    insights.efficiency = insights.apartmentToBuiltRatio > 85 ? 'excellent' : 
                        insights.apartmentToBuiltRatio > 75 ? 'good' :
                        insights.apartmentToBuiltRatio > 65 ? 'average' : 'poor';
  }
  
  return insights;
}

export {
  // Main CRUD operations
  createGarmushka,
  getGarmushka,
  getGarmushkaByPropertyAssessment,
  searchGarmushka,
  updateGarmushka,
  deleteGarmushka,
  getRecentGarmushka,
  
  // Utility functions
  getGarmushkaStats,
  calculateAreaInsights,
  
  // Database client for advanced usage
  GarmushkaDatabaseClient
};