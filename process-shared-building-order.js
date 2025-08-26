/**
 * Script to process צו בית משותף (Shared Building Order) documents
 * Extracts fields and stores them in the database
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { processDocument } from './src/lib/document-processor.js';
import { extractAllSharedBuildingFields } from './src/lib/shared-building-extractors.js';

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'shamay_land_registry',
    user: 'postgres',
    password: 'postgres123'
};

async function processSharedBuildingOrder(pdfPath) {
    const client = new Client(dbConfig);
    
    try {
        console.log(`Processing צו בית משותף document: ${pdfPath}`);
        
        // Connect to database
        await client.connect();
        console.log('Connected to database');
        
        // Create table if it doesn't exist
        const createTableSQL = fs.readFileSync('./database/create_shared_building_order_table.sql', 'utf8');
        await client.query(createTableSQL);
        console.log('Table schema verified');
        
        // Process PDF using Anthropic
        console.log('Processing PDF with Anthropic...');
        const documentData = await processDocument(pdfPath);
        const rawText = documentData.raw_text;
        
        if (rawText.trim().length < 100) {
            console.log(`⚠️  Very short text extraction (${rawText.length} chars): "${rawText}"`);
            console.log('This might be a scanned/image-based PDF requiring OCR processing');
            console.log('Proceeding with extraction on available text...');
        }
        
        console.log(`Extracted ${rawText.length} characters from PDF`);
        
        // Save text output
        const filename = path.basename(pdfPath, '.pdf');
        const outputPath = `./output/${filename}-shared-building-order.txt`;
        fs.writeFileSync(outputPath, rawText, 'utf8');
        console.log(`Saved text to: ${outputPath}`);
        
        // Extract fields
        console.log('Extracting fields...');
        const extraction = extractAllSharedBuildingFields(rawText);
        
        // Display extraction results
        console.log('\n=== EXTRACTION RESULTS ===');
        console.log(`Overall Confidence: ${(extraction.overall_confidence * 100).toFixed(1)}%`);
        
        console.log('\n--- Basic Fields ---');
        console.log(`Order Issue Date: ${extraction.order_issue_date.value} (confidence: ${(extraction.order_issue_date.confidence * 100).toFixed(1)}%)`);
        console.log(`Building Description: ${extraction.building_description.value} (confidence: ${(extraction.building_description.confidence * 100).toFixed(1)}%)`);
        console.log(`Building Floors: ${extraction.building_floors.value} (confidence: ${(extraction.building_floors.confidence * 100).toFixed(1)}%)`);
        console.log(`Building Sub-plots Count: ${extraction.building_sub_plots_count.value} (confidence: ${(extraction.building_sub_plots_count.confidence * 100).toFixed(1)}%)`);
        console.log(`Building Address: ${extraction.building_address.value} (confidence: ${(extraction.building_address.confidence * 100).toFixed(1)}%)`);
        console.log(`Total Sub-plots: ${extraction.total_sub_plots.value} (confidence: ${(extraction.total_sub_plots.confidence * 100).toFixed(1)}%)`);
        
        console.log(`\n--- Sub-plots (${extraction.sub_plots.value.length} found) ---`);
        extraction.sub_plots.value.forEach((subPlot, index) => {
            console.log(`Sub-plot ${index + 1}:`);
            console.log(`  Number: ${subPlot.sub_plot_number}`);
            console.log(`  Building: ${subPlot.building_number}`);
            console.log(`  Area: ${subPlot.area} m²`);
            console.log(`  Description: ${subPlot.description}`);
            console.log(`  Floor: ${subPlot.floor}`);
            console.log(`  Shared Property Parts: ${subPlot.shared_property_parts}`);
            if (subPlot.attachments && subPlot.attachments.length > 0) {
                console.log(`  Attachments: ${subPlot.attachments.length}`);
                subPlot.attachments.forEach((att, attIndex) => {
                    console.log(`    ${attIndex + 1}. ${att.description} (${att.area} m²)`);
                });
            }
            console.log(`  Non-attachment Areas: ${subPlot.non_attachment_areas}`);
            console.log('');
        });
        
        // Insert into database
        console.log('Inserting into database...');
        const insertQuery = `
            INSERT INTO shared_building_order (
                filename, raw_text,
                order_issue_date, order_issue_date_confidence, order_issue_date_context,
                building_description, building_description_confidence, building_description_context,
                building_floors, building_floors_confidence, building_floors_context,
                building_sub_plots_count, building_sub_plots_count_confidence, building_sub_plots_count_context,
                building_address, building_address_confidence, building_address_context,
                total_sub_plots, total_sub_plots_confidence, total_sub_plots_context,
                sub_plots, overall_confidence, extraction_notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            ) RETURNING id;
        `;
        
        const values = [
            filename,
            rawText,
            extraction.order_issue_date.value,
            extraction.order_issue_date.confidence,
            extraction.order_issue_date.context,
            extraction.building_description.value,
            extraction.building_description.confidence,
            extraction.building_description.context,
            extraction.building_floors.value,
            extraction.building_floors.confidence,
            extraction.building_floors.context,
            extraction.building_sub_plots_count.value,
            extraction.building_sub_plots_count.confidence,
            extraction.building_sub_plots_count.context,
            extraction.building_address.value,
            extraction.building_address.confidence,
            extraction.building_address.context,
            extraction.total_sub_plots.value,
            extraction.total_sub_plots.confidence,
            extraction.total_sub_plots.context,
            JSON.stringify(extraction.sub_plots.value),
            extraction.overall_confidence,
            'Processed by shared building order extractor'
        ];
        
        const result = await client.query(insertQuery, values);
        const recordId = result.rows[0].id;
        
        console.log(`\n✅ Successfully processed and stored record with ID: ${recordId}`);
        console.log(`📄 Text saved to: ${outputPath}`);
        console.log(`🎯 Overall extraction confidence: ${(extraction.overall_confidence * 100).toFixed(1)}%`);
        
        return {
            recordId,
            extraction,
            outputPath,
            overallConfidence: extraction.overall_confidence
        };
        
    } catch (error) {
        console.error('❌ Error processing document:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('Database connection closed');
    }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const pdfPath = process.argv[2];
    
    if (!pdfPath) {
        console.log('Usage: node process-shared-building-order.js <path-to-pdf>');
        console.log('Example: node process-shared-building-order.js "/mnt/c/Users/dell/Documents/Projects/Shamay/שומות שווי שוק/שומה מלאה/צו רישום.pdf"');
        process.exit(1);
    }
    
    if (!fs.existsSync(pdfPath)) {
        console.error(`❌ File not found: ${pdfPath}`);
        process.exit(1);
    }
    
    processSharedBuildingOrder(pdfPath)
        .then(result => {
            console.log('\n🎉 Processing completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Processing failed:', error.message);
            process.exit(1);
        });
}

export { processSharedBuildingOrder };