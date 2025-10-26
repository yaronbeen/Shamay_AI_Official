const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');

/**
 * POST /api/export/pdf
 * Generate PDF from HTML template using Puppeteer
 */
router.post('/pdf', async (req, res) => {
  let browser = null;
  
  try {
    const { sessionId, htmlContent } = req.body;

    if (!sessionId || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or htmlContent'
      });
    }

    console.log(`📄 Generating PDF for session: ${sessionId}`);

    // Detect environment and use appropriate Puppeteer setup
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    
    if (isVercel) {
      // Vercel: Use puppeteer-core with @sparticuz/chromium
      console.log(`🚀 Using serverless Chromium for PDF generation...`);
      const puppeteerCore = require('puppeteer-core');
      const chromium = require('@sparticuz/chromium');
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local: Use regular puppeteer
      console.log(`🚀 Using local Puppeteer for PDF generation...`);
      const puppeteer = require('puppeteer');
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    
    // Optimize HTML content - reduce image sizes
    let optimizedHtml = htmlContent;
    
    // Replace base64 images with compressed versions or remove large ones
    // Match base64 images and limit their size
    optimizedHtml = optimizedHtml.replace(
      /data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/]+=*/g,
      (match) => {
        // If base64 string is too large (>500KB encoded = ~375KB decoded)
        if (match.length > 500000) {
          // Return a placeholder or smaller version
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 transparent pixel
        }
        return match;
      }
    );
    
    // Set the HTML content with full-width styling and image optimization
    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: none !important;
            float: none !important;
            font-family: Arial, sans-serif;
            font-size: 11pt;
          }
          .document-container {
            width: 100% !important;
            max-width: none !important;
            float: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Optimize images */
          img {
            max-width: 100%;
            height: auto;
            image-rendering: optimizeQuality;
          }
          /* Reduce large images */
          img[src*="base64"] {
            max-width: 500px !important;
            max-height: 400px !important;
          }
        </style>
      </head>
      <body>
        ${optimizedHtml}
      </body>
      </html>
    `;
    
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    // Generate PDF with optimized settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      // Reduce quality for smaller file size
      quality: 75, // For JPEG compression
      scale: 0.9  // Slightly reduce scale to save space
    });

    await browser.close();
    browser = null;

    console.log(`✅ PDF generated successfully - ${pdfBuffer.length} bytes`);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shamay-valuation-${sessionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      details: error.message
    });
  }
});

module.exports = router;

