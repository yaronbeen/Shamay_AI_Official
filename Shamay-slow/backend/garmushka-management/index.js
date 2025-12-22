/**
 * Garmushka Measurement Module
 *
 * Main module for managing interactive measurement sessions on garmushka floor plans
 * Handles calibration, distance measurements, area measurements, and session persistence
 */

import { GarmushkaMeasurementDatabaseClient } from './database-client.js';

/**
 * Create a new measurement session
 * @param {Object} measurementData - Measurement session data
 * @param {string} userId - ID of user creating the session
 * @returns {Promise<Object>} - Creation result
 */
async function createMeasurementSession(measurementData, userId = 'system') {
  try {
    console.log('📐 Creating new measurement session...');

    const db = new GarmushkaMeasurementDatabaseClient();
    const result = await db.createMeasurementSession(measurementData, userId);
    await db.disconnect();

    console.log(`✅ Measurement session created successfully with ID: ${result.id}`);

    return {
      success: true,
      id: result.id,
      created_at: result.created_at,
      data: measurementData
    };

  } catch (error) {
    console.error('❌ Failed to create measurement session:', error.message);
    throw error;
  }
}

/**
 * Get measurement session by ID
 * @param {string} id - Session UUID
 * @returns {Promise<Object>} - Measurement session
 */
async function getMeasurementSession(id) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const result = await db.getMeasurementSessionById(id);
    await db.disconnect();

    if (!result) {
      throw new Error(`Measurement session ${id} not found`);
    }

    return result;

  } catch (error) {
    console.error('❌ Failed to get measurement session:', error.message);
    throw error;
  }
}

/**
 * Get all measurement sessions for an asset
 * @param {number} assetId - Asset ID
 * @param {string} assetType - Asset type (e.g., 'garmushka', 'property-assessment')
 * @returns {Promise<Array>} - Array of measurement sessions
 */
async function getMeasurementSessionsByAsset(assetId, assetType) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const results = await db.getMeasurementSessionsByAsset(assetId, assetType);
    await db.disconnect();

    return results;

  } catch (error) {
    console.error('❌ Failed to get measurement sessions by asset:', error.message);
    throw error;
  }
}

/**
 * Get measurement sessions by garmushka ID
 * @param {number} garmushkaId - Garmushka record ID
 * @returns {Promise<Array>} - Array of measurement sessions
 */
async function getMeasurementSessionsByGarmushkaId(garmushkaId) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const results = await db.getMeasurementSessionsByGarmushkaId(garmushkaId);
    await db.disconnect();

    return results;

  } catch (error) {
    console.error('❌ Failed to get measurement sessions by garmushka ID:', error.message);
    throw error;
  }
}

/**
 * Update measurement session
 * @param {string} id - Session UUID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User making the update
 * @returns {Promise<Object>} - Update result
 */
async function updateMeasurementSession(id, updateData, userId = 'system') {
  try {
    console.log(`📐 Updating measurement session ${id}...`);

    const db = new GarmushkaMeasurementDatabaseClient();
    const result = await db.updateMeasurementSession(id, updateData, userId);
    await db.disconnect();

    console.log(`✅ Measurement session updated successfully`);

    return {
      success: true,
      id: result.id,
      updated_at: result.updated_at
    };

  } catch (error) {
    console.error('❌ Failed to update measurement session:', error.message);
    throw error;
  }
}

/**
 * Delete measurement session
 * @param {string} id - Session UUID
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteMeasurementSession(id) {
  try {
    console.log(`🗑️ Deleting measurement session ${id}...`);

    const db = new GarmushkaMeasurementDatabaseClient();
    await db.deleteMeasurementSession(id);
    await db.disconnect();

    console.log(`✅ Measurement session deleted successfully`);

    return {
      success: true,
      id
    };

  } catch (error) {
    console.error('❌ Failed to delete measurement session:', error.message);
    throw error;
  }
}

/**
 * Get all measurement sessions
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Promise<Array>} - Array of measurement sessions
 */
async function getAllMeasurementSessions(limit = 50) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const results = await db.getAllMeasurementSessions(limit);
    await db.disconnect();

    return results;

  } catch (error) {
    console.error('❌ Failed to get all measurement sessions:', error.message);
    throw error;
  }
}

/**
 * Get completed measurement sessions
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Promise<Array>} - Array of completed sessions
 */
async function getCompletedMeasurementSessions(limit = 50) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const results = await db.getCompletedMeasurementSessions(limit);
    await db.disconnect();

    return results;

  } catch (error) {
    console.error('❌ Failed to get completed measurement sessions:', error.message);
    throw error;
  }
}

/**
 * Search measurement sessions by criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} - Matching sessions
 */
async function searchMeasurementSessions(criteria) {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const results = await db.searchMeasurementSessions(criteria);
    await db.disconnect();

    return results;

  } catch (error) {
    console.error('❌ Failed to search measurement sessions:', error.message);
    throw error;
  }
}

/**
 * Get measurement statistics
 * @returns {Promise<Object>} - Statistics about measurement sessions
 */
async function getMeasurementStats() {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const stats = await db.getMeasurementStats();
    await db.disconnect();

    return stats;

  } catch (error) {
    console.error('❌ Failed to get measurement statistics:', error.message);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} - Connection status
 */
async function testConnection() {
  try {
    const db = new GarmushkaMeasurementDatabaseClient();
    const result = await db.testConnection();
    await db.disconnect();

    return result;

  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Export all functions
export {
  createMeasurementSession,
  getMeasurementSession,
  getMeasurementSessionsByAsset,
  getMeasurementSessionsByGarmushkaId,
  updateMeasurementSession,
  deleteMeasurementSession,
  getAllMeasurementSessions,
  getCompletedMeasurementSessions,
  searchMeasurementSessions,
  getMeasurementStats,
  testConnection
};

// Export database client for advanced usage
export { GarmushkaMeasurementDatabaseClient };