// PDF to Image Conversion Route
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

/**
 * POST /api/pdf-to-image
 * Convert PDF first page to PNG image using Puppeteer
 */
router.post('/', async (req, res) => {
  let browser = null;
  let tempFilePath = null;

  try {
    const { pdfUrl, pageNumber = 1, sessionId } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'No PDF URL provided' });
    }

    console.log(`📄 Converting PDF to image: ${pdfUrl} (page ${pageNumber})`);

    // Detect environment and use appropriate Puppeteer setup
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    let puppeteer, chromium;

    if (isVercel) {
      puppeteer = require('puppeteer-core');
      chromium = require('@sparticuz/chromium');
    } else {
      puppeteer = require('puppeteer');
    }

    // Launch browser
    if (isVercel) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();

    // Handle PDF URL - construct proper URL for Puppeteer
    let pdfUrlToLoad = pdfUrl;
    
    // If it's an API URL (/api/files/...), convert to full URL
    if (pdfUrl.startsWith('/api/files/')) {
      // For local dev, construct full URL
      const baseUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
      pdfUrlToLoad = `${baseUrl}${pdfUrl}`;
      console.log(`📄 Using PDF URL: ${pdfUrlToLoad}`);
    }

    // Set viewport for consistent screenshot size
    await page.setViewport({ width: 1200, height: 1600 });

    // Try to navigate directly to PDF first
    try {
      await page.goto(pdfUrlToLoad, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      await page.waitForTimeout(3000);
      
      // Check if page loaded successfully (not a download)
      const url = page.url();
      if (!url.includes('.pdf') && !url.includes('pdf')) {
        throw new Error('PDF did not load correctly');
      }
    } catch (error) {
      // Fallback: Use iframe with PDF viewer
      console.log('⚠️ Direct PDF load failed, using iframe fallback');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100vw; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfUrlToLoad}" type="application/pdf"></iframe>
          </body>
        </html>
      `;
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(5000); // Give PDF viewer time to render
    }

    // Take screenshot of the PDF (first page by default)
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: true // Capture full page
    });

    await browser.close();

    // Save screenshot to file storage
    const filename = `garmushka-pdf-${sessionId || 'temp'}-${Date.now()}.png`;
    const sessionIdToUse = sessionId || 'temp';
    
    // Determine upload directory
    // Use /tmp for Vercel serverless (read-only filesystem)
    let uploadsDir = null
    
    if (process.env.VERCEL) {
      // Vercel: use /tmp directory
      uploadsDir = path.join('/tmp', sessionIdToUse)
      await fs.mkdir(uploadsDir, { recursive: true })
      console.log(`📁 Using Vercel temp directory: ${uploadsDir}`)
    } else {
      // Local dev: try multiple locations
      const possibleUploadDirs = [
        path.join(process.cwd(), 'frontend', 'uploads', sessionIdToUse),
        path.join(process.cwd(), 'uploads', sessionIdToUse),
        path.join(__dirname, '../../uploads', sessionIdToUse),
      ]

      for (const dir of possibleUploadDirs) {
        try {
          await fs.mkdir(dir, { recursive: true })
          await fs.access(dir)
          uploadsDir = dir
          console.log(`📁 Using upload directory: ${uploadsDir}`)
          break
        } catch (error) {
          continue
        }
      }

      if (!uploadsDir) {
        uploadsDir = possibleUploadDirs[0]
        await fs.mkdir(uploadsDir, { recursive: true })
      }
    }

    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, screenshotBuffer)

    const imageUrl = `/api/files/${sessionIdToUse}/${filename}`

    console.log(`✅ PDF converted to image: ${imageUrl}`);

    res.json({
      success: true,
      imageUrl: imageUrl,
      path: `${sessionIdToUse}/${filename}`,
      size: screenshotBuffer.length
    });

  } catch (error) {
    logger.error('PDF to image conversion error:', error);
    
    if (browser) {
      await browser.close().catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert PDF to image'
    });
  }
});

module.exports = router;

