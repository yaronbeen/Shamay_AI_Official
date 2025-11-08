// AI Processing Routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Import the land registry module (now CommonJS)
const { processLandRegistryDocument } = require('../../land-registry-management/index.js');

/**
 * POST /api/ai/land-registry
 * Process a land registry PDF with AI extraction
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
    console.log(`📥 Processing from: ${fileUrl}`);
    
    // Handle both file paths and URLs
    let fileBuffer;
    let actualPath = fileUrl;
    
    // LOCAL DEV: Convert API paths to local file paths
    if (fileUrl.startsWith('/api/files/')) {
      const pathParts = fileUrl.split('/api/files/')[1];
      // Files are stored in frontend/uploads, not backend/uploads
      actualPath = path.join(__dirname, '../../../frontend/uploads', pathParts);
      console.log(`📁 LOCAL DEV: Converted API path to local: ${actualPath}`);
    }
    
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // VERCEL/PRODUCTION: It's a URL - download it
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      fileBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ VERCEL: Downloaded file from URL: ${fileBuffer.length} bytes`);
    } else {
      // LOCAL DEV: It's a file path - read it directly
      if (!fs.existsSync(actualPath)) {
        throw new Error(`File not found: ${actualPath}`);
      }
      fileBuffer = fs.readFileSync(actualPath);
      console.log(`✅ LOCAL DEV: Read local file: ${fileBuffer.length} bytes`);
    }
    
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
    // The data is directly in extractionResults, not in a nested rawExtractedData property
    const rawData = result.extractionResults || {};
    
    console.log(`📋 Raw data keys:`, Object.keys(rawData).slice(0, 20));
    console.log(`📋 Sample data - gush: ${rawData.gush}, chelka: ${rawData.chelka}`);
    
    // Format response - Flatten rawData to main level
    const responseData = {
      success: true,
      // Core identifiers (flattened from rawData)
      gush: rawData.gush || null,
      chelka: rawData.chelka || rawData.parcel || null,
      subChelka: rawData.sub_chelka || rawData.subParcel || null,
      registrationOffice: rawData.registration_office || null,
      ownershipType: rawData.ownership_type || rawData.regulation_type || null,
      documentType: rawData.document_type || rawData.shtar_type || null,
      // Area information
      registeredArea: rawData.registered_area || rawData.total_plot_area || rawData.apartment_area || null,
      apartmentArea: rawData.apartment_registered_area || rawData.apartment_area || null,
      balconyArea: rawData.balcony_area || null,
      // Building details
      buildingsCount: rawData.buildings_count || null,
      addressFromTabu: rawData.address_from_tabu || null,
      // Unit information
      unitDescription: rawData.unit_description || null,
      floor: rawData.floor || null,
      buildingNumber: rawData.building_number || null,
      // Attachments
      attachments: rawData.attachments || [],
      attachmentsDescription: rawData.attachments_description || null,
      attachmentsArea: rawData.attachments_area || null,
      // Additional areas
      additionalAreas: rawData.additional_areas || [],
      // Ownership
      owners: rawData.owners || [],
      ownersCount: rawData.owners_count || null,
      sharedProperty: rawData.shared_property || null,
      rights: rawData.rights || null,
      // Notes
      plotNotes: rawData.plot_notes || null,
      notesActionType: rawData.notes_action_type || null,
      notesBeneficiary: rawData.notes_beneficiary || null,
      // Easements
      easementsEssence: rawData.easements_essence || null,
      easementsDescription: rawData.easements_description || null,
      // Mortgages
      mortgages: rawData.mortgages || [],
      mortgageEssence: rawData.mortgage_essence || null,
      mortgageRank: rawData.mortgage_rank || null,
      mortgageLenders: rawData.mortgage_lenders || null,
      mortgageBorrowers: rawData.mortgage_borrowers || null,
      mortgageAmount: rawData.mortgage_amount || null,
      mortgagePropertyShare: rawData.mortgage_property_share || null,
      // Confidence and metadata
      confidence: result.extractionResults?.overallConfidence || 0.0,
      subPlotsCount: rawData.sub_plots_count || null,
      issueDate: rawData.issue_date || null,
      tabuExtractDate: rawData.tabu_extract_date || null,
      extracted_at: new Date().toISOString()
    };
    
    console.log(`📤 Sending response:`, responseData);
    
    // ✅ AUTO-CREATE PROVENANCE RECORDS from AI extraction
    try {
      const { createProvenanceFromAIExtraction } = require('../models/ProvenanceHelper');
      
      // Find document info from fileUrl
      const documentName = path.basename(fileUrl) || `land_registry_${sessionId}.pdf`;
      const documentType = 'tabu';
      
      // Build confidence scores map from rawData
      const confidenceScores = {};
      if (result.extractionResults?.confidence_scores) {
        // Map confidence scores to field paths
        Object.entries(result.extractionResults.confidence_scores).forEach(([key, score]) => {
          confidenceScores[key] = score;
        });
      }
      
      // Use overall confidence as default
      const overallConfidence = result.extractionResults?.overallConfidence || 0.7;
      
      // Create provenance records for each extracted field
      const provenanceResult = await createProvenanceFromAIExtraction(
        sessionId,
        rawData, // All extracted fields
        {
          documentId: `doc_${sessionId}_land_registry`,
          documentName,
          documentType,
          documentUrl: fileUrl,
          confidenceScores,
          extractionMethod: 'ai_auto',
          modelUsed: 'claude-opus-4-1-20250805', // Match the model used
          defaultPage: 1 // Most Tabu documents are single-page or start on page 1
        }
      );
      
      if (provenanceResult.success) {
        console.log(`✅ Auto-created ${provenanceResult.recordsCreated} provenance records`);
      } else {
        console.warn(`⚠️ Failed to create provenance records:`, provenanceResult.error);
        // Don't fail the request - provenance is optional
      }
    } catch (provenanceError) {
      console.warn(`⚠️ Error creating provenance (non-fatal):`, provenanceError.message);
      // Continue - provenance creation failure shouldn't break extraction
    }
    
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
      error: error.message || 'AI extraction failed'
    });
  }
});

router.post('/land-registry-analysis', (req, res) => {
  // Legacy endpoint - redirect to new endpoint
  res.json({ message: 'Please use /api/ai/land-registry instead' });
});

/**
 * POST /api/ai/building-permit
 * Process a building permit PDF with AI extraction
 */
router.post('/building-permit', async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { fileUrl, sessionId } = req.body;
    
    if (!fileUrl || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileUrl and sessionId'
      });
    }
    
    console.log(`🔍 Backend AI: Processing building permit for session: ${sessionId}`);
    console.log(`📥 Processing from: ${fileUrl}`);
    
    // Dynamically import the ESM module
    const { BuildingPermitAIExtractor } = require('../../building-permits/ai-field-extractor.js');
    const extractor = new BuildingPermitAIExtractor(process.env.ANTHROPIC_API_KEY);
    
    // Handle both file paths and URLs
    let fileBuffer;
    let actualPath = fileUrl;
    
    // LOCAL DEV: Convert API paths to local file paths
    if (fileUrl.startsWith('/api/files/')) {
      const pathParts = fileUrl.split('/api/files/')[1];
      // Files are stored in frontend/uploads, not backend/uploads
      actualPath = path.join(__dirname, '../../../frontend/uploads', pathParts);
      console.log(`📁 LOCAL DEV: Converted API path to local: ${actualPath}`);
    }
    
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // VERCEL/PRODUCTION: It's a URL - download it
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      fileBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ VERCEL: Downloaded file from URL: ${fileBuffer.length} bytes`);
    } else {
      // LOCAL DEV: It's a file path - read it directly
      if (!fs.existsSync(actualPath)) {
        throw new Error(`File not found: ${actualPath}`);
      }
      fileBuffer = fs.readFileSync(actualPath);
      console.log(`✅ LOCAL DEV: Read local file: ${fileBuffer.length} bytes`);
    }
    
    // Save to temporary location
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${sessionId}_building_permit.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved to temp: ${tempFilePath}`);
    
    // Process with AI
    console.log(`🤖 Starting AI extraction...`);
    const result = await extractor.extractAllFields(tempFilePath, { isPdf: true });
    
    console.log(`✅ AI extraction completed`);
    
    // Format response - Map to expected fields from rawData
    const responseData = {
      success: true,
      permitNumber: result.permit_number?.value || null,
      permitDate: result.permit_date?.value || null,
      permitIssueDate: result.permit_issue_date?.value || null,
      // Try multiple fields for permitted usage/description
      permittedUsage: result.permitted_description?.value || result.description?.value || result.usage?.value || null,
      buildingDescription: result.building_description?.value || null,
      localCommitteeName: result.local_committee_name?.value || null,
      propertyAddress: result.property_address?.value || null,
      gush: result.gush?.value || null,
      chelka: result.chelka?.value || null,
      subChelka: result.sub_chelka?.value || null,
      confidence: result.overallConfidence || 0.0,
      extracted_at: new Date().toISOString(),
      // Include confidence scores for debugging
      confidenceScores: {
        permitNumber: result.permit_number?.confidence || 0,
        permitDate: result.permit_date?.confidence || 0,
        permittedUsage: result.permitted_description?.confidence || result.description?.confidence || 0,
        localCommitteeName: result.local_committee_name?.confidence || 0
      }
    };
    
    console.log(`📤 Sending response:`, responseData);
    
    // ✅ AUTO-CREATE PROVENANCE RECORDS from AI extraction
    try {
      const { createProvenanceFromAIExtraction } = require('../models/ProvenanceHelper');
      
      // Find document info from fileUrl
      const documentName = path.basename(fileUrl) || `building_permit_${sessionId}.pdf`;
      const documentType = 'permit';
      
      // Build confidence scores from result (extractor returns { field: { value, confidence } })
      const confidenceScores = {};
      const extractedFields = {};
      
      // Convert result format to flat fields with confidence
      Object.entries(result).forEach(([key, fieldData]) => {
        if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
          extractedFields[key] = fieldData.value;
          confidenceScores[key] = (fieldData.confidence || 0) / 100; // Convert % to 0-1
        } else if (fieldData !== null && fieldData !== undefined) {
          extractedFields[key] = fieldData;
        }
      });
      
      // Create provenance records
      const provenanceResult = await createProvenanceFromAIExtraction(
        sessionId,
        extractedFields,
        {
          documentId: `doc_${sessionId}_building_permit`,
          documentName,
          documentType,
          documentUrl: fileUrl,
          confidenceScores,
          extractionMethod: 'ai_auto',
          modelUsed: 'claude-sonnet-4-20250514',
          defaultPage: 1
        }
      );
      
      if (provenanceResult.success) {
        console.log(`✅ Auto-created ${provenanceResult.recordsCreated} provenance records`);
      } else {
        console.warn(`⚠️ Failed to create provenance records:`, provenanceResult.error);
      }
    } catch (provenanceError) {
      console.warn(`⚠️ Error creating provenance (non-fatal):`, provenanceError.message);
    }
    
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
      error: error.message || 'AI extraction failed'
    });
  }
});

/**
 * POST /api/ai/shared-building
 * Process a shared building order PDF with AI extraction
 */
router.post('/shared-building', async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { fileUrl, sessionId } = req.body;
    
    if (!fileUrl || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileUrl and sessionId'
      });
    }
    
    console.log(`🔍 Backend AI: Processing shared building order for session: ${sessionId}`);
    console.log(`📥 Processing from: ${fileUrl}`);
    
    // Import the Hebrew module for better extraction
    const { SharedBuildingAIExtractor } = require('../../shared-building-order/ai-field-extractor-hebrew.js');
    const extractor = new SharedBuildingAIExtractor(process.env.ANTHROPIC_API_KEY);
    
    // Handle both file paths and URLs
    let fileBuffer;
    let actualPath = fileUrl;
    
    // LOCAL DEV: Convert API paths to local file paths
    if (fileUrl.startsWith('/api/files/')) {
      const pathParts = fileUrl.split('/api/files/')[1];
      // Files are stored in frontend/uploads, not backend/uploads
      actualPath = path.join(__dirname, '../../../frontend/uploads', pathParts);
      console.log(`📁 LOCAL DEV: Converted API path to local: ${actualPath}`);
    }
    
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // VERCEL/PRODUCTION: It's a URL - download it
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      fileBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ VERCEL: Downloaded file from URL: ${fileBuffer.length} bytes`);
    } else {
      // LOCAL DEV: It's a file path - read it directly
      if (!fs.existsSync(actualPath)) {
        throw new Error(`File not found: ${actualPath}`);
      }
      fileBuffer = fs.readFileSync(actualPath);
      console.log(`✅ LOCAL DEV: Read local file: ${fileBuffer.length} bytes`);
    }
    
    // Save to temporary location
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${sessionId}_shared_building.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved to temp: ${tempFilePath}`);
    
    // Process with AI
    console.log(`🤖 Starting AI extraction...`);
    const result = await extractor.extractAllFields(tempFilePath, { isPdf: true });
    
    console.log(`✅ AI extraction completed`);
    
    // Format response - ONLY return data actually extracted from documents
    const responseData = {
      success: true,
      order_issue_date: result.order_issue_date?.value || null,
      building_description: result.building_description?.value || null,
      building_floors: result.building_floors?.value || null,
      building_sub_plots_count: result.building_sub_plots_count?.value || null,
      building_address: result.building_address?.value || null,
      total_sub_plots: result.total_sub_plots?.value || null,
      confidence: result.overallConfidence || 0.0,
      extracted_at: new Date().toISOString(),
      rawData: result // Include full raw data for debugging
    };
    
    console.log(`📤 Sending response:`, responseData);
    
    // ✅ AUTO-CREATE PROVENANCE RECORDS from AI extraction
    try {
      const { createProvenanceFromAIExtraction } = require('../models/ProvenanceHelper');
      
      // Find document info from fileUrl
      const documentName = path.basename(fileUrl) || `shared_building_${sessionId}.pdf`;
      const documentType = 'condo';
      
      // Build confidence scores and extract fields
      const confidenceScores = {};
      const extractedFields = {};
      
      // Convert result format to flat fields
      Object.entries(result).forEach(([key, fieldData]) => {
        if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
          extractedFields[key] = fieldData.value;
          confidenceScores[key] = (fieldData.confidence || 0) / 100;
        } else if (fieldData !== null && fieldData !== undefined) {
          extractedFields[key] = fieldData;
        }
      });
      
      // Create provenance records
      const provenanceResult = await createProvenanceFromAIExtraction(
        sessionId,
        extractedFields,
        {
          documentId: `doc_${sessionId}_shared_building`,
          documentName,
          documentType,
          documentUrl: fileUrl,
          confidenceScores,
          extractionMethod: 'ai_auto',
          modelUsed: 'claude-sonnet-4-20250514',
          defaultPage: 1
        }
      );
      
      if (provenanceResult.success) {
        console.log(`✅ Auto-created ${provenanceResult.recordsCreated} provenance records`);
      } else {
        console.warn(`⚠️ Failed to create provenance records:`, provenanceResult.error);
      }
    } catch (provenanceError) {
      console.warn(`⚠️ Error creating provenance (non-fatal):`, provenanceError.message);
    }
    
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
      error: error.message || 'AI extraction failed'
    });
  }
});

/**
 * POST /api/ai/interior-analysis
 * Analyze interior images with AI
 */
router.post('/interior-analysis', async (req, res) => {
  try {
    const { images, sessionId } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided for analysis'
      });
    }
    
    console.log(`🏠 Backend AI: Processing ${images.length} interior images for session: ${sessionId}`);
    
    // Import the module
    const ApartmentInteriorAnalyzer = require('../../image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js');
    const analyzer = new ApartmentInteriorAnalyzer(process.env.ANTHROPIC_API_KEY);
    
    const analyzedImages = [];
    let overallAnalysis = {
      property_layout_description: '',
      room_analysis: [],
      condition_assessment: ''
    };
    
    // Process each image
    for (const image of images) {
      console.log(`🖼️ Analyzing image: ${image.name || 'unnamed'}`);
      
      // Convert API URL to file system path if needed
      let imagePath = image.data || image.url;
      if (imagePath && imagePath.startsWith('/api/files/')) {
        // Convert /api/files/sessionId/filename to frontend/uploads/sessionId/filename
        const pathParts = imagePath.split('/api/files/')[1];
        // Files are stored in frontend/uploads, not backend/uploads
        imagePath = path.join(__dirname, '../../../frontend/uploads', pathParts);
        console.log(`📁 Converted URL to path: ${imagePath}`);
      }
      
      // Analyze the image (supports base64 data or file path)
      const result = await analyzer.analyzeApartmentInterior(imagePath);
      
      if (result.success) {
        analyzedImages.push({
          name: image.name || 'interior_image',
          analysis: result.analysis,
          structuredData: result.structuredData
        });
        
        // Aggregate analysis
        if (result.structuredData) {
          overallAnalysis.room_analysis.push({
            room_type: result.structuredData.room_type || 'לא מזוהה',
            area_estimate: result.structuredData.area_estimate || 'לא ידוע',
            condition: result.structuredData.condition || 'לא ידוע',
            features: result.structuredData.features || []
          });
        }
      }
    }
    
    // Generate overall assessment
    if (analyzedImages.length > 0) {
      overallAnalysis.property_layout_description = analyzedImages.map(img => img.analysis).join('\n\n');
      overallAnalysis.condition_assessment = 'הנכס במצב ' + (overallAnalysis.room_analysis[0]?.condition || 'לא ידוע');
    }
    
    // Return only Hebrew description with full analysis
    const responseData = {
      success: true,
      description: analyzedImages.length > 0 ? analyzedImages[0].analysis : 'לא הוגדר תיאור',
      confidence: 0.85,
      extracted_at: new Date().toISOString()
    };
    
    console.log(`✅ Interior analysis completed for ${analyzedImages.length} images`);
    res.json(responseData);
    
  } catch (error) {
    console.error(`❌ Backend AI error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI analysis failed'
    });
  }
});

/**
 * POST /api/ai/exterior-analysis
 * Analyze exterior images with AI
 */
router.post('/exterior-analysis', async (req, res) => {
  try {
    const { images, sessionId } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided for analysis'
      });
    }
    
    console.log(`🏢 Backend AI: Processing ${images.length} exterior images for session: ${sessionId}`);
    
    // Import the module
    const BuildingExteriorAnalyzer = require('../../image-analysis/building-exterior-analyzer/building-exterior-analyzer.js');
    const analyzer = new BuildingExteriorAnalyzer(process.env.ANTHROPIC_API_KEY);
    
    const analyzedImages = [];
    let overallAnalysis = {
      building_condition: '',
      building_features: '',
      building_type: '',
      overall_assessment: ''
    };
    
    // Process each image
    for (const image of images) {
      console.log(`🖼️ Analyzing image: ${image.name || 'unnamed'}`);
      
      // Convert API URL to file system path if needed
      let imagePath = image.data || image.url;
      if (imagePath && imagePath.startsWith('/api/files/')) {
        // Convert /api/files/sessionId/filename to frontend/uploads/sessionId/filename
        const pathParts = imagePath.split('/api/files/')[1];
        // Files are stored in frontend/uploads, not backend/uploads
        imagePath = path.join(__dirname, '../../../frontend/uploads', pathParts);
        console.log(`📁 Converted URL to path: ${imagePath}`);
      }
      
      // Analyze the image (supports base64 data or file path)
      const result = await analyzer.analyzeBuildingExterior(imagePath);
      
      if (result.success) {
        analyzedImages.push({
          name: image.name || 'exterior_image',
          analysis: result.analysis,
          structuredData: result.structuredData
        });
        
        // Use first image's data for overall analysis
        if (result.success && !overallAnalysis.building_type) {
          // The full analysis is always in result.analysis (Hebrew text)
          overallAnalysis.overall_assessment = result.analysis;
          
          // Extract structured data if available (camelCase from analyzer)
          if (result.structuredData) {
            const cond = result.structuredData.condition;
            overallAnalysis.building_condition = cond === 'excellent' ? 'מצוין' : 
                                                 cond === 'good' ? 'טוב' : 
                                                 cond === 'fair' ? 'בינוני' : 
                                                 cond === 'poor' ? 'דורש שיפוץ' : 'לא ידוע';
            
            overallAnalysis.building_features = result.structuredData.features && result.structuredData.features.length > 0 
              ? result.structuredData.features.join(', ') 
              : 'לא זוהו';
            
            const type = result.structuredData.buildingType;
            overallAnalysis.building_type = type === 'apartment_building' ? 'בניין מגורים' : 
                                            type === 'villa' ? 'וילה' : 
                                            type === 'commercial' ? 'מסחרי' : 
                                            type === 'mixed_use' ? 'מעורב' : 
                                            type === 'townhouse' ? 'בית עירוני' : 'לא מזוהה';
          }
        }
      }
    }
    
    const responseData = {
      success: true,
      images: analyzedImages,
      extractedData: overallAnalysis,
      confidence: 0.85,
      extracted_at: new Date().toISOString()
    };
    
    console.log(`✅ Exterior analysis completed for ${analyzedImages.length} images`);
    res.json(responseData);
    
  } catch (error) {
    console.error(`❌ Backend AI error:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI analysis failed'
    });
  }
});

module.exports = router;

