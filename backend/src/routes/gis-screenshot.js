const express = require('express');
const router = express.Router();

/**
 * POST /api/gis-screenshot
 * Captures a screenshot of a GIS map URL using Puppeteer
 */
router.post('/', async (req, res) => {
  const { govmapUrl, cropMode } = req.body;

  if (!govmapUrl || !cropMode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'govmapUrl and cropMode are required'
    });
  }

  console.log(`📸 GIS Screenshot request - cropMode: ${cropMode}, URL: ${govmapUrl}`);

  // Remove 'in' parameter from URL to hide sidebar
  let cleanedUrl = govmapUrl;
  try {
    const urlObj = new URL(govmapUrl);
    urlObj.searchParams.delete('in'); // Remove info panel parameter
    cleanedUrl = urlObj.toString();
    console.log(`🧹 Cleaned URL (removed 'in' param): ${cleanedUrl}`);
  } catch (e) {
    console.warn('⚠️ Could not parse URL, using original');
  }

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

    // Debug: Check what's on the page before hiding anything
    console.log(`🔍 Debugging page content...`);
    const pageInfo = await page.evaluate(() => {
      const mapElements = document.querySelectorAll('*');
      const mapClasses = Array.from(mapElements).map(el => el.className).filter(c => c);
      const mapIds = Array.from(mapElements).map(el => el.id).filter(id => id);
      
      return {
        totalElements: mapElements.length,
        mapClasses: mapClasses.slice(0, 20), // First 20 classes
        mapIds: mapIds.slice(0, 20), // First 20 IDs
        url: window.location.href,
        title: document.title
      };
    });
    console.log('📊 Page info:', pageInfo);

    // Hide sidebar panels using GovMap's actual HTML structure
    console.log(`🎨 Hiding GovMap sidebar panels...`);
    const debugInfo = await page.evaluate(() => {
      let hiddenCount = 0;
      
      // Method 1: Hide elements with data-scnshotdisplay="hide" attribute (GovMap's own hiding attribute)
      const dataHideElements = document.querySelectorAll('[data-scnshotdisplay="hide"]');
      dataHideElements.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      // Method 2: Hide panels container
      const panelsContainers = document.querySelectorAll('[class*="_panelsContainer"]');
      panelsContainers.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      // Method 3: Hide side panels (elements with _isSidePanel class)
      const sidePanels = document.querySelectorAll('[class*="_isSidePanel"]');
      sidePanels.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      // Method 4: Hide panel IDs (e.g., panel-EntitiesDetails)
      const panelIds = document.querySelectorAll('[id^="panel-"]');
      panelIds.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      // Method 5: Hide search results containers
      const searchResultsContainers = document.querySelectorAll('[class*="_searchResultsContainer"]');
      searchResultsContainers.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      // Method 6: Hide entities details containers
      const entitiesDetailsContainers = document.querySelectorAll('#entities-details-container, [id*="entitiesDetails"], [class*="_entitiesDetailsContainer"]');
      entitiesDetailsContainers.forEach(element => {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        hiddenCount++;
      });
      
      console.log(`✅ Hidden ${hiddenCount} GovMap sidebar/panel elements`);
      
      // Return debug info
      return {
        dataHideCount: dataHideElements.length,
        panelsContainerCount: panelsContainers.length,
        sidePanelCount: sidePanels.length,
        panelIdCount: panelIds.length,
        searchResultsCount: searchResultsContainers.length,
        entitiesDetailsCount: entitiesDetailsContainers.length,
        totalHidden: hiddenCount
      };
    });
    console.log('🔍 Hiding debug info:', debugInfo);

    // Wait a bit more for the UI changes to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    console.log(`📸 Capturing screenshot...`);
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    await browser.close();
    browser = null;

    console.log(`✅ Screenshot captured successfully - ${screenshotBuffer.length} bytes`);

    // Return screenshot as base64
    const base64Screenshot = screenshotBuffer.toString('base64');

    return res.json({
      success: true,
      screenshot: base64Screenshot,
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

