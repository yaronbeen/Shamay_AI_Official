/**
 * Test script for Environment Analysis module
 * Tests the analysis functionality with sample location data
 */

import { EnvironmentAnalysisManager } from './index.js';

async function testEnvironmentAnalysis() {
  console.log('🧪 Starting Environment Analysis Test\n');

  const manager = new EnvironmentAnalysisManager();

  // Test locations
  const testLocations = [
    {
      name: 'Tel Aviv Center',
      data: {
        street: 'רחוב דיזנגוף',
        neighborhood: 'מרכז העיר',
        city: 'תל אביב-יפו'
      }
    },
    {
      name: 'Jerusalem German Colony',
      data: {
        street: 'רחוב עמק רפאים',
        neighborhood: 'המושבה הגרמנית',
        city: 'ירושלים'
      }
    },
    {
      name: 'Haifa Carmel',
      data: {
        street: 'שדרות הנשיא',
        neighborhood: 'הדר הכרמל',
        city: 'חיפה'
      }
    }
  ];

  try {
    for (const location of testLocations) {
      console.log(`\n📍 Testing: ${location.name}`);
      console.log(`   Street: ${location.data.street}`);
      console.log(`   Neighborhood: ${location.data.neighborhood}`);
      console.log(`   City: ${location.data.city}`);

      // Check if analysis already exists
      const existing = await manager.getPreviousAnalysis(
        location.data.street,
        location.data.neighborhood,
        location.data.city
      );

      if (existing) {
        console.log(`✅ Found existing analysis (ID: ${existing.id})`);
        console.log(`   Created: ${existing.created_at}`);
        console.log(`   Confidence: ${existing.confidence_score}%`);
      } else {
        console.log('🔄 Running new analysis...');
        
        const result = await manager.analyzeEnvironment(location.data);
        
        console.log(`✅ Analysis completed (ID: ${result.analysisId})`);
        console.log(`   Confidence: ${result.confidence}%`);
        console.log(`   Processing time: ${result.metadata.processingTime}ms`);
        console.log(`   Tokens used: ${result.metadata.tokensUsed}`);
        console.log(`   Cost: $${result.metadata.cost.toFixed(6)}`);
        
        // Display key findings
        if (result.analysis) {
          console.log('\n📊 Key Analysis Points:');
          
          if (result.analysis.location_overview) {
            console.log(`   Type: ${result.analysis.location_overview.location_type || 'N/A'}`);
            console.log(`   Character: ${result.analysis.location_overview.area_character || 'N/A'}`);
          }
          
          
          if (result.analysis.safety_environment) {
            console.log(`   Safety Level: ${result.analysis.safety_environment.safety_level || 'N/A'}/10`);
          }
          
          if (result.analysis.infrastructure_transportation) {
            console.log(`   Walkability: ${result.analysis.infrastructure_transportation.walkability_score || 'N/A'}/10`);
          }
        }
      }
      
      console.log('\n' + '='.repeat(50));
    }

    // Test listing all analyses
    console.log('\n📋 Recent Analyses:');
    const allAnalyses = await manager.listAnalyses(5);
    
    for (const analysis of allAnalyses) {
      console.log(`   ${analysis.street}, ${analysis.neighborhood}, ${analysis.city} (${analysis.confidence_score}%)`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testEnvironmentAnalysis();