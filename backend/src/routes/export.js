const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Fetch image via HTTP/HTTPS and convert to base64
 */
async function fetchImageViaHttp(imageUrl) {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith('https://') ? https : http;
    const timeout = 10000; // 10 second timeout
    
    const request = client.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const contentType = response.headers['content-type'] || 'image/png';
        console.log(`✅ HTTP fetch successful: ${Math.round(buffer.length / 1024)}KB, type: ${contentType}`);
        resolve(`data:${contentType};base64,${base64}`);
      });
    });

    request.on('error', (err) => {
      reject(new Error(`HTTP request failed: ${err.message}`));
    });

    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error(`HTTP request timed out after ${timeout}ms`));
    });
  });
}

/**
 * Convert file URL to base64 data URL
 */
async function convertUrlToBase64(imageUrl, sessionId) {
  try {
    // If it's already a base64 data URL, return as-is
    if (imageUrl.startsWith('data:image/')) {
      console.log(`✅ Image already in base64 format`);
      return imageUrl;
    }

    console.log(`🔄 Converting image URL to base64: ${imageUrl}`);

    let filename = null;
    
    // Handle API route URLs (e.g., /api/files/sessionId/filename or /api/files/sessionId/.../filename)
    if (imageUrl.includes('/api/files/')) {
      const urlParts = imageUrl.split('/api/files/')[1].split('/');
      if (urlParts.length > 1) {
        // URL format: /api/files/sessionId/filename or /api/files/sessionId/path/filename
        filename = urlParts[urlParts.length - 1];
      } else {
        filename = urlParts[0];
      }
      console.log(`📋 Extracted filename from API route: ${filename}`);
    }
    // Handle local file paths (e.g., /uploads/session/file.png or ./uploads/...)
    else if (imageUrl.includes('/uploads/') || imageUrl.includes('uploads/')) {
      const urlParts = imageUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      
      // Handle query strings or hash fragments
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }
      if (filename.includes('#')) {
        filename = filename.split('#')[0];
      }
      
      console.log(`📋 Extracted filename from uploads path: ${filename}`);
    }
    // Handle relative URLs or other formats
    else {
      // Try to extract filename from any URL
      const urlParts = imageUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      if (filename.includes('?')) filename = filename.split('?')[0];
      if (filename.includes('#')) filename = filename.split('#')[0];
      console.log(`📋 Attempting to use filename: ${filename}`);
    }

    if (!filename) {
      throw new Error('Could not extract filename from URL');
    }

    // Try multiple possible file locations
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', sessionId, filename),
      path.join(process.cwd(), 'frontend', 'uploads', sessionId, filename),
      path.join(process.cwd(), 'backend', 'uploads', sessionId, filename),
      path.join(__dirname, '../uploads', sessionId, filename),
      path.join(__dirname, '../../uploads', sessionId, filename),
      path.join(__dirname, '../../../frontend/uploads', sessionId, filename),
      path.join('/Users/shalom.m/Documents/Code/Shamay-slow', 'frontend', 'uploads', sessionId, filename),
      path.join('/Users/shalom.m/Documents/Code/Shamay-slow', 'uploads', sessionId, filename),
    ];

    let filePath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        console.log(`✅ Found file at: ${filePath}`);
        break;
      } catch (err) {
        // Continue to next path
      }
    }

    if (!filePath) {
      console.warn(`⚠️ File not found locally for: ${imageUrl}`);
      console.warn(`📁 Searched paths:`, possiblePaths);
      
      // Try to fetch via HTTP if it's an API route or absolute URL
      if (imageUrl.startsWith('/api/files/') || imageUrl.includes('://')) {
        console.log(`🌐 Attempting HTTP fetch for: ${imageUrl}`);
        
        // Build the full URL if it's a relative API route
        let httpUrl = imageUrl;
        if (imageUrl.startsWith('/api/files/') && !imageUrl.startsWith('http')) {
          // Try to construct full URL from environment
          const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                         process.env.BACKEND_URL || 
                         'http://localhost:5000';
          httpUrl = `${baseUrl}${imageUrl}`;
          console.log(`🌐 Constructed full URL: ${httpUrl}`);
        }
        
        try {
          return await fetchImageViaHttp(httpUrl);
        } catch (httpError) {
          console.error(`❌ HTTP fetch also failed:`, httpError.message);
          throw new Error(`File not found locally and HTTP fetch failed: ${imageUrl}`);
        }
      }
      
      throw new Error(`File not found: ${imageUrl}`);
    }

    console.log(`📁 Reading file from: ${filePath}`);
    const fileBuffer = await fs.readFile(filePath);
    const base64 = fileBuffer.toString('base64');
    
    // Determine MIME type from extension
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    console.log(`✅ Successfully converted to base64 (${Math.round(dataUrl.length / 1024)}KB)`);
    return dataUrl;
  } catch (error) {
    console.error(`❌ Failed to convert image URL to base64: ${imageUrl}`, error.message);
    console.error(`   Error stack:`, error.stack);
    // Return original URL as fallback - but log warning
    console.warn(`⚠️ Returning original URL - image may not appear in PDF`);
    return imageUrl;
  }
}

/**
 * Convert all image URLs in HTML to base64
 */
async function convertImageUrlsToBase64(htmlContent, sessionId) {
  // Find all img tags with src attributes that are not base64
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];
  
  if (matches.length === 0) {
    console.log(`📸 No image tags found in HTML`);
    return htmlContent;
  }

  console.log(`🔄 Found ${matches.length} image tag(s) to process`);

  let updatedHtml = htmlContent;
  let convertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const match of matches) {
    const fullTag = match[0];
    const imageUrl = match[1];
    
    console.log(`\n📸 Processing image URL: ${imageUrl.substring(0, 100)}${imageUrl.length > 100 ? '...' : ''}`);
    
    // Skip if already base64
    if (imageUrl.startsWith('data:image/')) {
      console.log(`  ✅ Already base64, skipping`);
      skippedCount++;
      continue;
    }

    try {
      const base64DataUrl = await convertUrlToBase64(imageUrl, sessionId);
      
      // Only replace if we actually got a base64 URL back (not the original)
      if (base64DataUrl !== imageUrl && base64DataUrl.startsWith('data:image/')) {
        // Escape special regex characters in the original URL
        const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace the src in the img tag - handle both single and double quotes
        const updatedTag = fullTag.replace(
          new RegExp(`src=["']${escapedUrl}["']`, 'i'),
          `src="${base64DataUrl}"`
        );
        
        if (updatedTag !== fullTag) {
          updatedHtml = updatedHtml.replace(fullTag, updatedTag);
          convertedCount++;
          console.log(`  ✅ Successfully converted and replaced in HTML`);
        } else {
          console.warn(`  ⚠️ Tag replacement failed - URLs might not match exactly`);
          errorCount++;
        }
      } else {
        console.warn(`  ⚠️ Conversion returned original URL or invalid format`);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error converting image: ${error.message}`);
      errorCount++;
      // Continue with other images
    }
  }

  console.log(`\n📊 Conversion summary:`);
  console.log(`   ✅ Converted: ${convertedCount}`);
  console.log(`   ⏭️  Skipped (already base64): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  return updatedHtml;
}

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

    // Convert image URLs to base64 before PDF generation
    let optimizedHtml = await convertImageUrlsToBase64(htmlContent, sessionId);
    
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
            padding: 5px;
            margin: 0;
          }
          .document-container {
            width: 100%;
            margin: 0 auto;
            padding: 0;
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
        top: '15mm',
        right: '0mm',
        bottom: '15mm',
        left: '15mm'
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

