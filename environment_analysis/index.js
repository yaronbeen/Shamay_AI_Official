/**
 * Environment Analysis Module
 * Analyzes city, neighborhood, and street information using Claude AI
 */

import { EnvironmentAnalysisAIExtractor } from './ai-environment-analyzer.js';
import { EnvironmentDatabaseClient } from './database-client.js';
import dotenv from 'dotenv';

dotenv.config();

class EnvironmentAnalysisManager {
  constructor() {
    this.aiExtractor = new EnvironmentAnalysisAIExtractor();
    this.dbClient = new EnvironmentDatabaseClient();
  }

  /**
   * Analyze environment for a given location
   * @param {Object} locationData - Location information
   * @param {string} locationData.street - Street name
   * @param {string} locationData.neighborhood - Neighborhood name  
   * @param {string} locationData.city - City name
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeEnvironment(locationData) {
    try {
      const { street, neighborhood, city } = locationData;

      console.log(`Starting environment analysis for: ${street}, ${neighborhood}, ${city}`);

      // Get AI analysis
      const analysisResult = await this.aiExtractor.analyzeLocation({
        street,
        neighborhood,
        city
      });

      // Store results in database
      const analysisId = await this.dbClient.storeAnalysis({
        street,
        neighborhood,
        city,
        analysis_data: analysisResult.analysis,
        confidence_score: analysisResult.overallConfidence,
        processing_time: analysisResult.processingTime,
        tokens_used: analysisResult.tokensUsed,
        cost: analysisResult.cost,
        created_at: new Date()
      });

      return {
        analysisId,
        location: { street, neighborhood, city },
        analysis: analysisResult.analysis,
        confidence: analysisResult.overallConfidence,
        metadata: {
          processingTime: analysisResult.processingTime,
          tokensUsed: analysisResult.tokensUsed,
          cost: analysisResult.cost,
          method: analysisResult.method
        }
      };

    } catch (error) {
      console.error('Environment analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Get previous analysis for location
   * @param {string} street - Street name
   * @param {string} neighborhood - Neighborhood name
   * @param {string} city - City name
   * @returns {Promise<Object|null>} Previous analysis or null
   */
  async getPreviousAnalysis(street, neighborhood, city) {
    try {
      return await this.dbClient.getAnalysisByLocation(street, neighborhood, city);
    } catch (error) {
      console.error('Failed to get previous analysis:', error.message);
      return null;
    }
  }

  /**
   * List all analyses
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} List of analyses
   */
  async listAnalyses(limit = 50) {
    try {
      return await this.dbClient.getAllAnalyses(limit);
    } catch (error) {
      console.error('Failed to list analyses:', error.message);
      return [];
    }
  }
}

export { EnvironmentAnalysisManager };

// Example usage
async function example() {
  const manager = new EnvironmentAnalysisManager();
  
  const result = await manager.analyzeEnvironment({
    street: 'רחוב דיזנגוף',
    neighborhood: 'מרכז העיר', 
    city: 'תל אביב-יפו'
  });
  
  console.log('Environment Analysis Result:', JSON.stringify(result, null, 2));
}

// Uncomment to run example
// example().catch(console.error);