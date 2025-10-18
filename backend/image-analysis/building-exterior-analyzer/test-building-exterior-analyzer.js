#!/usr/bin/env node

import readline from 'readline';
import dotenv from 'dotenv';
import BuildingExteriorAnalyzer from './building-exterior-analyzer.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function testBuildingExteriorAnalyzer() {
    try {
        console.log('🏢 Building Exterior Analysis Test');
        console.log('=================================\n');
        
        const analyzer = new BuildingExteriorAnalyzer();
        
        // Get image path from user
        console.log('Available test images in test_documents/:');
        console.log('- external_image.jpg (building exterior)');
        console.log('- building_permit_1.PDF (not suitable for this test)');
        console.log('- Or provide your own path\n');
        
        const imagePath = await question('📸 Enter path to building exterior image: ');
        
        // Validate file exists
        if (!fs.existsSync(imagePath)) {
            console.error('❌ Image file not found:', imagePath);
            process.exit(1);
        }

        const fileExtension = path.extname(imagePath).toLowerCase();
        const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        if (!supportedFormats.includes(fileExtension)) {
            console.error('❌ Supported formats: JPG, PNG, GIF, WEBP');
            process.exit(1);
        }
        
        console.log(`\n📋 Analyzing building: ${path.basename(imagePath)}`);
        console.log('⏳ Sending to Anthropic for comprehensive building analysis...\n');
        
        const startTime = Date.now();
        const result = await analyzer.analyzeBuildingExterior(imagePath, {
            focusAreas: ['מצב מבנה', 'סגנון אדריכלי', 'איכות שכונה', 'גורמי שווי', 'חניה ונגישות']
        });
        const processingTime = Date.now() - startTime;
        
        if (result.success) {
            console.log('✅ Building analysis completed successfully!\n');
            console.log('📊 PROCESSING SUMMARY:');
            console.log('=====================');
            console.log(`Processing Time: ${processingTime}ms`);
            console.log(`Tokens Used: ${result.tokens}`);
            console.log(`Estimated Cost: $${result.cost.toFixed(4)}`);
            console.log(`Timestamp: ${result.timestamp}\n`);
            
            console.log('🏗️ BUILDING ANALYSIS RESULTS:');
            console.log('=' .repeat(60));
            console.log(result.analysis);
            console.log('=' .repeat(60));
            
            if (result.structuredData) {
                console.log('\n🔍 STRUCTURED DATA EXTRACTED:');
                console.log('============================');
                console.log(`Building Type: ${result.structuredData.buildingType || 'Not determined'}`);
                console.log(`Number of Floors: ${result.structuredData.floors || 'Not determined'}`);
                console.log(`Architectural Style: ${result.structuredData.architecturalStyle || 'Not determined'}`);
                console.log(`Condition: ${result.structuredData.condition || 'Not determined'}`);
                console.log(`Parking Type: ${result.structuredData.parkingType || 'Not determined'}`);
                
                if (result.structuredData.materials.length > 0) {
                    console.log(`Materials: ${result.structuredData.materials.join(', ')}`);
                }
                
                if (result.structuredData.features.length > 0) {
                    console.log(`Features: ${result.structuredData.features.join(', ')}`);
                }
                
                if (result.structuredData.issues.length > 0) {
                    console.log(`Issues: ${result.structuredData.issues.join(', ')}`);
                }
            }
            
            // Ask if user wants to save results
            const saveResults = await question('\n💾 Save analysis results to file? (y/n): ');
            
            if (saveResults.toLowerCase() === 'y') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const outputPath = path.join(__dirname, `../../output/building-exterior-analysis-${timestamp}.json`);
                
                // Ensure output directory exists
                const outputDir = path.dirname(outputPath);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                await analyzer.saveResults(result, outputPath);
                console.log(`✅ Results saved to: ${outputPath}`);
            }
            
            // Ask about batch analysis
            const batchAnalysis = await question('\n📚 Would you like to analyze multiple buildings? (y/n): ');
            
            if (batchAnalysis.toLowerCase() === 'y') {
                const folderPath = await question('📁 Enter folder path containing building images: ');
                
                if (fs.existsSync(folderPath)) {
                    console.log('\n🔄 Starting batch analysis...');
                    
                    const batchResults = await analyzer.analyzeBatch(folderPath, {
                        focusAreas: ['מצב מבנה', 'סגנון אדריכלי', 'איכות שכונה'],
                        delay: 2000 // 2 second delay between requests
                    });
                    
                    console.log(`\n📊 Batch Analysis Complete: ${batchResults.length} buildings analyzed`);
                    
                    const successfulResults = batchResults.filter(r => r.success);
                    console.log(`✅ Successful analyses: ${successfulResults.length}`);
                    console.log(`❌ Failed analyses: ${batchResults.length - successfulResults.length}`);
                    
                    if (successfulResults.length > 0) {
                        const totalTokens = successfulResults.reduce((sum, r) => sum + (r.tokens || 0), 0);
                        const totalCost = successfulResults.reduce((sum, r) => sum + (r.cost || 0), 0);
                        
                        console.log(`💰 Total tokens used: ${totalTokens}`);
                        console.log(`💸 Total estimated cost: $${totalCost.toFixed(4)}`);
                        
                        const saveBatch = await question('\n💾 Save batch results? (y/n): ');
                        if (saveBatch.toLowerCase() === 'y') {
                            const batchTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const batchOutputPath = path.join(__dirname, `../../output/building-batch-analysis-${batchTimestamp}.json`);
                            
                            await analyzer.saveResults(batchResults, batchOutputPath);
                            console.log(`✅ Batch results saved to: ${batchOutputPath}`);
                        }
                    }
                } else {
                    console.log('❌ Folder not found:', folderPath);
                }
            }
            
        } else {
            console.error('❌ Building analysis failed:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        rl.close();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Test cancelled by user');
    rl.close();
    process.exit(0);
});

// Auto-test mode with sample image
async function autoTest() {
    try {
        console.log('🏢 Auto-Testing Building Exterior Analysis...\n');
        
        const analyzer = new BuildingExteriorAnalyzer();
        
        // Use external_image.jpg from test_documents
        const imagePath = '/mnt/c/Users/dell/CascadeProjects/Shamay-slow/test_documents/external_image.jpg';
        
        if (!fs.existsSync(imagePath)) {
            console.log('❌ Sample image not found. Running interactive mode instead.\n');
            return testBuildingExteriorAnalyzer();
        }
        
        console.log(`📸 Analyzing sample building: ${path.basename(imagePath)}`);
        console.log('⏳ Processing with Anthropic AI...\n');
        
        const result = await analyzer.analyzeBuildingExterior(imagePath, {
            focusAreas: ['סגנון אדריכלי', 'מצב מבנה', 'איכות סביבה', 'חניה']
        });
        
        if (result.success) {
            console.log('✅ Analysis completed!\n');
            console.log('📊 RESULTS SUMMARY:');
            console.log(`Tokens: ${result.tokens} | Cost: $${result.cost.toFixed(4)}\n`);
            
            console.log('🏗️ BUILDING ANALYSIS:');
            console.log('=' .repeat(50));
            console.log(result.analysis);
            console.log('=' .repeat(50));
            
            // Save results automatically
            const outputPath = path.join(__dirname, '../../output/building-auto-test-results.json');
            await analyzer.saveResults(result, outputPath);
            console.log(`\n💾 Results saved to: ${outputPath}`);
        } else {
            console.error('❌ Auto-test failed:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Auto-test error:', error.message);
    }
}

// Check if running in auto mode or interactive mode
if (process.argv.includes('--auto')) {
    autoTest().catch(console.error);
} else {
    testBuildingExteriorAnalyzer().catch(console.error);
}