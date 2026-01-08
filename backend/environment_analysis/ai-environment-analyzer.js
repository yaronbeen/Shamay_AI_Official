/**
 * AI-Powered Environment Analyzer using Anthropic Claude
 * Analyzes city, neighborhood, and street environment information
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class EnvironmentAnalysisAIExtractor {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    
    this.model = 'claude-sonnet-4-20250514'; // Latest Sonnet model
  }

  /**
   * Analyze location environment using Claude AI
   * @param {Object} location - Location data
   * @param {string} location.street - Street name
   * @param {string} location.neighborhood - Neighborhood name
   * @param {string} location.city - City name
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeLocation(location) {
    const startTime = Date.now();
    const { street, neighborhood, city } = location;

    const systemPrompt = `You are an expert real estate analyst with deep knowledge of Israeli cities, neighborhoods, and street-level characteristics. 

Analyze the provided location and provide comprehensive information about the area's characteristics, amenities, transportation, demographics, and real estate market conditions.

Provide detailed analysis in the following categories and return ONLY valid JSON:

LOCATION OVERVIEW:
- general_description: Overall description of the area
- location_type: Urban/suburban/rural classification
- population_density: High/Medium/Low population density
- area_character: Character and atmosphere of the area

INFRASTRUCTURE & TRANSPORTATION:
- public_transport: Available public transportation options
- major_roads: Major roads and highways nearby
- parking_availability: Parking situation in the area
- walkability_score: Walking convenience (1-10 scale)
- bicycle_infrastructure: Bike lanes and cycling infrastructure

AMENITIES & SERVICES:
- shopping_centers: Major shopping areas and malls
- restaurants_dining: Dining and entertainment options
- healthcare_facilities: Hospitals, clinics, and medical services
- educational_institutions: Schools, universities, and educational facilities
- cultural_attractions: Museums, theaters, and cultural sites
- parks_recreation: Parks, sports facilities, and recreational areas

DEMOGRAPHICS & LIFESTYLE:
- target_demographics: Primary resident demographics
- lifestyle_character: Lifestyle and community characteristics
- average_age_group: Predominant age groups
- family_friendliness: Family-friendly rating (1-10 scale)
- social_economic_level: Economic level of residents

REAL ESTATE MARKET:
- property_types: Common property types in the area
- price_range_estimate: Estimated property price range
- market_trends: Current market trends and developments
- investment_potential: Investment attractiveness (1-10 scale)
- rental_market: Rental market characteristics

ADVANTAGES & DISADVANTAGES:
- key_advantages: Main benefits of living in this area
- potential_drawbacks: Potential disadvantages or concerns
- unique_features: Unique characteristics of this specific location

SAFETY & ENVIRONMENT:
- safety_level: General safety level (1-10 scale)
- noise_levels: Typical noise levels (Low/Medium/High)
- air_quality: Air quality assessment
- environmental_factors: Environmental considerations

Focus on providing accurate, practical information that would be valuable for real estate assessment and decision-making.

Return ONLY the JSON object with this structure:
{
  "location_overview": {
    "general_description": "description",
    "location_type": "urban/suburban/rural",
    "population_density": "high/medium/low",
    "area_character": "description"
  },
  "infrastructure_transportation": {
    "public_transport": "description",
    "major_roads": "description", 
    "parking_availability": "description",
    "walkability_score": 1-10,
    "bicycle_infrastructure": "description"
  },
  "amenities_services": {
    "shopping_centers": "description",
    "restaurants_dining": "description",
    "healthcare_facilities": "description",
    "educational_institutions": "description",
    "cultural_attractions": "description",
    "parks_recreation": "description"
  },
  "demographics_lifestyle": {
    "target_demographics": "description",
    "lifestyle_character": "description", 
    "average_age_group": "description",
    "family_friendliness": 1-10,
    "social_economic_level": "description"
  },
  "real_estate_market": {
    "property_types": "description",
    "price_range_estimate": "description",
    "market_trends": "description",
    "investment_potential": 1-10,
    "rental_market": "description"
  },
  "advantages_disadvantages": {
    "key_advantages": ["advantage1", "advantage2", "advantage3"],
    "potential_drawbacks": ["drawback1", "drawback2"],
    "unique_features": ["feature1", "feature2"]
  },
  "safety_environment": {
    "safety_level": 1-10,
    "noise_levels": "low/medium/high",
    "air_quality": "description",
    "environmental_factors": "description"
  },
  "confidence_scores": {
    "location_overview": 0.0-1.0,
    "infrastructure": 0.0-1.0,
    "amenities": 0.0-1.0,
    "demographics": 0.0-1.0,
    "real_estate": 0.0-1.0,
    "advantages_disadvantages": 0.0-1.0,
    "safety_environment": 0.0-1.0,
    "overall": 0.0-1.0
  }
}`;

    const prompt = `Please analyze the following location in Israel:

Street: ${street}
Neighborhood: ${neighborhood} 
City: ${city}

Provide comprehensive environment analysis focusing on real estate assessment factors, local amenities, transportation, demographics, and market conditions.

Analyze this specific location and provide detailed insights about what it's like to live, work, or invest in this area.`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      console.log('Raw API response for environment analysis:', JSON.stringify(message, null, 2));
      
      const content = message.content[0]?.text || JSON.stringify(message.content[0]);
      console.log('Extracted content:', content);
      
      // Parse the JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(content);
      } catch (parseError) {
        console.log('JSON parse error:', parseError.message);
        // Try to extract JSON from response if wrapped in text
        if (typeof content === 'string' && content.includes('{')) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('Found JSON match:', jsonMatch[0]);
            analysisData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        } else {
          console.error('Unexpected response format:', content);
          throw new Error('Unexpected response format from Anthropic API');
        }
      }

      // Structure the result
      const result = {
        analysis: analysisData,
        overallConfidence: (analysisData.confidence_scores?.overall || 0) * 100,
        processingTime: Date.now() - startTime,
        method: 'anthropic_claude_environment_analysis',
        model: this.model,
        tokensUsed: message.usage.total_tokens,
        cost: this.estimateCost(message.usage.total_tokens),
        rawResponse: content,
        location: { street, neighborhood, city }
      };

      return result;

    } catch (error) {
      console.error('Anthropic environment analysis failed:', error.message);
      throw new Error(`Environment analysis failed: ${error.message}`);
    }
  }

  /**
   * Estimate API cost based on token usage
   * @param {number} tokens - Total tokens used
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(tokens) {
    // Claude Opus pricing: $15 per 1M input tokens, $75 per 1M output tokens
    // Rough estimate assuming 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    
    return ((inputTokens * 15) + (outputTokens * 75)) / 1000000;
  }
}

export { EnvironmentAnalysisAIExtractor };