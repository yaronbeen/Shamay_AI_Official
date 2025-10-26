// AI Processing Routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Dynamically import the ESM module
let processLandRegistryDocument;

async function loadESMModule() {
  if (!processLandRegistryDocument) {
    const module = await import('../../land-registry-management/index.js');
    processLandRegistryDocument = module.processLandRegistryDocument;
  }
}

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
    console.log(`📥 Downloading from: ${fileUrl}`);
    
    // Load ESM module
    await loadESMModule();
    
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
    console.log(`📥 Downloading from: ${fileUrl}`);
    
    // Dynamically import the ESM module
    const { BuildingPermitAIExtractor } = await import('../../building-permits/ai-field-extractor.js');
    const extractor = new BuildingPermitAIExtractor(process.env.ANTHROPIC_API_KEY);
    
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
    
    tempFilePath = path.join(tempDir, `${sessionId}_building_permit.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved to temp: ${tempFilePath}`);
    
    // Process with AI
    console.log(`🤖 Starting AI extraction...`);
    const result = await extractor.extractAllFields(tempFilePath, { isPdf: true });
    
    console.log(`✅ AI extraction completed`);
    
    // Format response
    const responseData = {
      success: true,
      building_year: result.permit_date ? new Date(result.permit_date).getFullYear().toString() : new Date().getFullYear().toString(),
      permitted_description: result.permitted_description || 'לא נמצא',
      permitted_use: result.permitted_use || 'מגורים',
      built_area: result.built_area || '0',
      building_description: result.permitted_description || 'לא נמצא',
      confidence: result.confidence_scores?.overall || 0.90,
      extracted_at: new Date().toISOString(),
      rawData: result // Include full raw data for debugging
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
    console.log(`📥 Downloading from: ${fileUrl}`);
    
    // Dynamically import the ESM module
    const { SharedBuildingAIExtractor } = await import('../../shared-building-order/ai-field-extractor.js');
    const extractor = new SharedBuildingAIExtractor(process.env.ANTHROPIC_API_KEY);
    
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
    
    tempFilePath = path.join(tempDir, `${sessionId}_shared_building.pdf`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log(`💾 Saved to temp: ${tempFilePath}`);
    
    // Process with AI
    console.log(`🤖 Starting AI extraction...`);
    const result = await extractor.extractAllFields(tempFilePath, { isPdf: true });
    
    console.log(`✅ AI extraction completed`);
    
    // Format response
    const responseData = {
      success: true,
      order_issue_date: result.order_issue_date || new Date().toISOString().split('T')[0],
      building_description: result.building_description || 'לא נמצא',
      building_floors: result.building_floors || '0',
      building_sub_plots_count: result.building_sub_plots_count || '0',
      building_address: result.building_address || 'לא נמצא',
      total_sub_plots: result.total_sub_plots || '0',
      confidence: result.confidence_scores?.overall || 0.90,
      extracted_at: new Date().toISOString(),
      rawData: result // Include full raw data for debugging
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
    
    // Dynamically import the ESM module
    const { ApartmentInteriorAnalyzer } = await import('../../image-analysis/apartment-interior-analyzer/apartment-interior-analyzer.js');
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
      
      // Analyze the image (supports base64 data)
      const result = await analyzer.analyzeApartmentInterior(image.data || image.url);
      
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
    
    const responseData = {
      success: true,
      images: analyzedImages,
      extractedData: overallAnalysis,
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
    
    // Dynamically import the ESM module
    const { BuildingExteriorAnalyzer } = await import('../../image-analysis/building-exterior-analyzer/building-exterior-analyzer.js');
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
      
      // Analyze the image (supports base64 data)
      const result = await analyzer.analyzeBuildingExterior(image.data || image.url);
      
      if (result.success) {
        analyzedImages.push({
          name: image.name || 'exterior_image',
          analysis: result.analysis,
          structuredData: result.structuredData
        });
        
        // Use first image's structured data for overall analysis
        if (result.structuredData && !overallAnalysis.building_type) {
          overallAnalysis.building_condition = result.structuredData.condition || 'לא ידוע';
          overallAnalysis.building_features = result.structuredData.features?.join(', ') || 'לא זוהו';
          overallAnalysis.building_type = result.structuredData.building_type || 'לא מזוהה';
          overallAnalysis.overall_assessment = result.structuredData.overall_assessment || result.analysis;
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

