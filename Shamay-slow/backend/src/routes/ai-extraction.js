/**
 * AI Extraction Routes
 * Handles AI-powered document extraction for land registry, building permits, etc.
 */

import express from 'express';
import { processLandRegistryDocument } from '../../land-registry-management/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/ai/land-registry
 * Process a land registry PDF with AI extraction
 * 
 * Expects JSON body with:
 * - fileUrl: URL to the PDF file (Vercel Blob or other)
 * - sessionId: Session identifier
 */
router.post('/land-registry', async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { fileUrl, sessionId } = req.body;
    
    if (!fileUrl || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileUrl and sessionId'
      });
    }
    
    console.log(`🔍 Backend AI: Processing land registry for session: ${sessionId}`);
    console.log(`📥 Downloading from: ${fileUrl}`);
    
    // Download the file from the URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Downloaded file: ${fileBuffer.length} bytes`);
    
    // Save to temporary location
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${sessionId}_land_registry.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved to temp: ${tempFilePath}`);
    
    // Process with AI
    console.log(`🤖 Starting AI extraction...`);
    const result = await processLandRegistryDocument(tempFilePath, {
      useAI: true,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      saveToDatabase: false // We'll save via ShumaDB instead
    });
    
    console.log(`✅ AI extraction completed`);
    
    // Extract the raw extracted data for better field mapping
    const rawData = result.extractionResults?.rawExtractedData || {};
    
    // Format response
    const responseData = {
      success: true,
      gush: rawData.gush || 'לא נמצא',
      registration_office: rawData.registration_office || 'לא נמצא',
      chelka: rawData.chelka || 'לא נמצא',
      ownership_type: rawData.ownership_type || 'לא נמצא',
      attachments: rawData.attachments_description || rawData.attachments_area || 'לא נמצא',
      confidence: result.extractionResults?.overallConfidence || 0.0,
      extracted_at: new Date().toISOString(),
      rawData: rawData // Include full raw data for debugging
    };
    
    console.log(`📤 Sending response:`, responseData);
    
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`🗑️ Cleaned up temp file`);
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error(`❌ Backend AI error:`, error);
    
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error(`Failed to cleanup temp file:`, cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'AI extraction failed',
      gush: 'לא נמצא',
      registration_office: 'לא נמצא',
      chelka: 'לא נמצא',
      ownership_type: 'לא נמצא',
      attachments: 'לא נמצא'
    });
  }
});

export default router;

