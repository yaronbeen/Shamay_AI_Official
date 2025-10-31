const express = require('express');
const router = express.Router();

/**
 * POST /api/gis-screenshot
 * Captures a screenshot of a GIS map URL using Puppeteer
 */
router.post('/', async (req, res) => {
  const { govmapUrl, cropMode, sessionId } = req.body;

  if (!govmapUrl || !cropMode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'govmapUrl and cropMode are required'
    });
  }

  console.log(`📸 GIS Screenshot request - cropMode: ${cropMode}, URL: ${govmapUrl}`);

  let browser;
  try {
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    
    console.log(`🔍 Environment: ${isVercel ? 'Vercel/Serverless' : 'Local'}`);
    
    if (isVercel) {
      // Vercel: Use puppeteer-core with @sparticuz/chromium
      let puppeteerCore, chromium;
      
      try {
        puppeteerCore = require('puppeteer-core');
        chromium = require('@sparticuz/chromium');
      } catch (error) {
        console.warn('⚠️ Serverless Chromium not available:', error.message);
        return res.status(501).json({
          success: false,
          error: 'Server-side screenshot not available',
          message: 'Screenshot service unavailable in this environment. Please use manual upload.',
          hint: 'Use the manual upload buttons (blue) to capture and upload your own screenshot'
        });
      }

      console.log(`🚀 Launching serverless Chromium...`);
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local: Use regular puppeteer
      let puppeteer;
      try {
        puppeteer = require('puppeteer');
      } catch (error) {
        console.warn('⚠️ Puppeteer not available:', error.message);
        return res.status(501).json({
          success: false,
          error: 'Server-side screenshot not available',
          message: 'Puppeteer is not available. Please use manual screenshot upload.',
          hint: 'Use the manual upload buttons to capture and upload your own screenshot'
        });
      }

      console.log(`🚀 Launching local Puppeteer...`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });

    console.log(`🌐 Navigating to: ${govmapUrl}`);
    await page.goto(govmapUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for map to load
    console.log(`⏳ Waiting for map to load...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot
    console.log(`📸 Capturing screenshot...`);
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    await browser.close();
    browser = null;

    console.log(`✅ Screenshot captured successfully - ${screenshotBuffer.length} bytes`);

    // Default response fields
    let screenshotUrl = null;
    let savedFilename = null;

    // If sessionId provided, save PNG using the same logic as other file saves
    if (sessionId) {
      try {
        const { ShumaDB } = require('../models/ShumaDB');
        
        savedFilename = `gis-screenshot-mode${cropMode}-${Date.now()}.png`;
        
        // Use ShumaDB's save method which handles local/Vercel automatically
        // Convert buffer to base64 for the save function
        const base64Screenshot = screenshotBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Screenshot}`;
        
        const fileResult = await ShumaDB._saveBase64ImageToFile(dataUrl, sessionId, savedFilename);
        screenshotUrl = fileResult.url;
        
        console.log(`💾 Screenshot saved: ${screenshotUrl}`);
      } catch (saveErr) {
        console.warn('⚠️ Failed to save screenshot:', saveErr.message);
      }
    }

    // Return both base64 (for immediate UI) and URL if available (for persistence)
    const base64Screenshot = screenshotBuffer.toString('base64');

    return res.json({
      success: true,
      screenshot: base64Screenshot,
      screenshotUrl,
      filename: savedFilename,
      cropMode,
      message: 'Screenshot captured successfully'
    });

  } catch (error) {
    console.error('❌ Error capturing GIS screenshot:', error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to capture screenshot',
      message: error.message,
      details: error.stack
    });
  }
});

module.exports = router;

