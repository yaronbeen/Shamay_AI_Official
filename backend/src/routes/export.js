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
    
    // Use original HTML without removing images - just log for debugging
    let optimizedHtml = htmlContent;
    
    // Count and log base64 images for debugging
    const base64Matches = optimizedHtml.match(/data:image\/(png|jpeg|jpg);base64,/g);
    if (base64Matches) {
      console.log(`📸 Found ${base64Matches.length} base64 images in HTML`);
      
      // Log sizes of base64 images
      const imageSizes = [];
      optimizedHtml.replace(
        /data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/]+=*)/g,
        (match, type, base64Data) => {
          const sizeKB = Math.round(base64Data.length / 1024);
          imageSizes.push(`${type}: ${sizeKB}KB`);
          return match;
        }
      );
      console.log(`📊 Image sizes: ${imageSizes.join(', ')}`);
    }
    
    // Don't replace images - keep them all for proper PDF size
    // The PDF compression should handle size optimization
    
    // Set the HTML content with full-width styling and image optimization
    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @page {
            size: A4;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            padding: 10px;
          }
          .document-container {
            width: 100%;
          }
          h1, h2, h3, h4 {
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          td, th {
            padding: 8px;
            border: 1px solid #ddd;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          /* Limit base64 images */
          img[src^="data:"] {
            max-width: 400px;
            max-height: 300px;
          }
        </style>
      </head>
      <body>
        ${optimizedHtml}
      </body>
      </html>
    `;
    
    // Set content and wait for it to fully load
    await page.setContent(fullHtml, { 
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: 30000 
    });
    
    // Wait a bit more to ensure all content is rendered
    await page.evaluateHandle('document.fonts.ready');
    
    // Generate PDF with proper settings
    console.log('📄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();
    browser = null;

    console.log(`✅ PDF generated successfully - ${pdfBuffer.length} bytes`);
    
    // Verify the buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation resulted in empty buffer');
    }

    // Send PDF as response with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shamay-valuation-${sessionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    // Send as Buffer to ensure binary data is preserved
    res.status(200).end(pdfBuffer, 'binary');

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

