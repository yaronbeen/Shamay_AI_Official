import dotenv from 'dotenv';
import ApartmentInteriorAnalyzer from './apartment-interior-analyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAnalyzer() {
    try {
        console.log('🏠 Starting apartment interior analysis test...\n');
        
        const analyzer = new ApartmentInteriorAnalyzer();
        
        // Convert Windows path to WSL path
        const imagePath = '/mnt/c/Users/dell/CascadeProjects/Shamay-slow/test_documents/internal_image_-20250608-WA0066.jpg';
        
        console.log(`📸 Analyzing image: ${imagePath}`);
        console.log('⏳ Sending to Anthropic for analysis...\n');
        
        const result = await analyzer.analyzeApartmentInterior(imagePath, {
            focusAreas: ['סגנון עיצוב', 'איכות רצפה', 'מצב תחזוקה', 'פרטים ארכיטקטוניים']
        });
        
        if (result.success) {
            console.log('✅ Analysis completed successfully!\n');
            console.log('📋 ANALYSIS RESULTS:');
            console.log('=' .repeat(50));
            console.log(result.analysis);
            console.log('\n' + '=' .repeat(50));
            
            if (result.structuredData) {
                console.log('\n🔍 STRUCTURED DATA:');
                console.log(JSON.stringify(result.structuredData, null, 2));
            }
            
            console.log(`\n📊 Tokens used: ${result.tokens}`);
            console.log(`⏰ Timestamp: ${result.timestamp}`);
            
            // Save results to output folder
            const outputPath = path.join(__dirname, '../output/apartment-analysis-test.json');
            await analyzer.saveResults(result, outputPath);
            
        } else {
            console.error('❌ Analysis failed:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Run the test
testAnalyzer();