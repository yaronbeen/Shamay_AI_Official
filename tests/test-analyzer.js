import ApartmentInteriorAnalyzer from './backend/image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAnalyzer() {
  try {
    console.log('🧪 Testing apartment interior analyzer...');
    
    const analyzer = new ApartmentInteriorAnalyzer();
    const testImage = './integrations/test_documents/internal_image_-20250608-WA0066.jpg';
    
    console.log('🧪 Calling analyzer with test image...');
    const result = await analyzer.analyzeApartmentInterior(testImage);
    
    console.log('🧪 Analysis result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('🧪 Error testing analyzer:', error);
  }
}

testAnalyzer();
