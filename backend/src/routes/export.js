const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { pathToFileURL } = require('url');

// Unified file storage helper (matches FileStorageService logic)
// This ensures consistent file path resolution across frontend and backend
const FileStorageHelper = {
  /**
   * Get file path on disk (for local development only)
   * Matches FileStorageService.getFilePath() logic
   */
  getFilePath(sessionId, filename, userId = 'dev-user-id') {
    const projectRoot = path.resolve(__dirname, '../../../');
    
    // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
    if (sessionId.startsWith('users/')) {
      // sessionId already contains full path - use it directly
      return path.join(projectRoot, 'frontend', 'uploads', sessionId, filename);
    } else {
      // Regular sessionId - use users/{userId}/{sessionId} structure
      return path.join(projectRoot, 'frontend', 'uploads', 'users', userId, sessionId, filename);
    }
  },
  
  /**
   * Get all possible file paths (for backward compatibility)
   * Returns an array of paths to check, in order of priority
   */
  getPossiblePaths(sessionId, filename, userId = 'dev-user-id') {
    const projectRoot = path.resolve(__dirname, '../../../');
    const possiblePaths = [];
    
    // Check if sessionId already contains the full path (e.g., "users/{userId}/logos")
    if (sessionId.startsWith('users/')) {
      // sessionId already contains full path - use it directly
      possiblePaths.push(
        // Primary path - where files are actually stored (ABSOLUTE PATH)
        path.join(projectRoot, 'frontend', 'uploads', sessionId, filename),
        // Relative paths from different execution contexts
        path.join(process.cwd(), 'frontend', 'uploads', sessionId, filename),
        path.join(process.cwd(), 'uploads', sessionId, filename),
        path.join(__dirname, '../../../frontend/uploads', sessionId, filename),
        path.join(__dirname, '../../frontend/uploads', sessionId, filename),
        // Absolute path fallback (for local development)
        '/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/' + sessionId + '/' + filename
      );
    } else {
      // Regular sessionId - use users/{userId}/{sessionId} structure
      possiblePaths.push(
        // Primary path - where files are actually stored
        path.join(projectRoot, 'frontend', 'uploads', 'users', userId, sessionId, filename),
        // Relative paths from different execution contexts
        path.join(process.cwd(), 'frontend', 'uploads', 'users', userId, sessionId, filename),
        path.join(process.cwd(), 'uploads', 'users', userId, sessionId, filename),
        path.join(__dirname, '../../../frontend/uploads', 'users', userId, sessionId, filename),
        path.join(__dirname, '../../frontend/uploads', 'users', userId, sessionId, filename),
        // Legacy paths for backward compatibility
        path.join(process.cwd(), 'frontend', 'uploads', sessionId, filename),
        path.join(process.cwd(), 'uploads', sessionId, filename),
        // Absolute path fallback (for local development)
        '/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/' + userId + '/' + sessionId + '/' + filename
      );
    }
    
    return possiblePaths;
  }
};

/**
 * Fetch image via HTTP/HTTPS and convert to base64
 */
async function fetchImageViaHttp(imageUrl) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 [HTTP FETCH] Starting fetch for image source`);
    const client = imageUrl.startsWith('https://') ? https : http;
    const timeout = 30000; // 30 second timeout (increased for large images)
    
    const request = client.get(imageUrl, (response) => {
      console.log(`🌐 [HTTP FETCH] Response status: ${response.statusCode}`);
      console.log(`🌐 [HTTP FETCH] Content-Type: ${response.headers['content-type']}`);
      console.log(`🌐 [HTTP FETCH] Content-Length: ${response.headers['content-length'] || 'unknown'}`);
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      let totalSize = 0;
      response.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const contentType = response.headers['content-type'] || 'image/png';
        console.log(`✅ [HTTP FETCH] Successfully fetched: ${Math.round(buffer.length / 1024)}KB, type: ${contentType}`);
        const dataUrl = `data:${contentType};base64,${base64}`;
        console.log(`✅ [HTTP FETCH] Base64 data URL length: ${Math.round(dataUrl.length / 1024)}KB`);
        resolve(dataUrl);
      });
      
      response.on('error', (err) => {
        reject(new Error(`Response stream error: ${err.message}`));
      });
    });

    request.on('error', (err) => {
      console.error(`❌ [HTTP FETCH] Request error:`, err.message);
      reject(new Error(`HTTP request failed: ${err.message}`));
    });

    request.setTimeout(timeout, () => {
      console.error(`❌ [HTTP FETCH] Request timeout after ${timeout}ms`);
      request.destroy();
      reject(new Error(`HTTP request timed out after ${timeout}ms`));
    });
  });
}

/**
 * Convert file URL to base64 data URL
 */
const MAX_INLINE_IMAGE_KB = parseInt(process.env.MAX_INLINE_IMAGE_KB || '450', 10);

function encodePathSegments(pathname) {
  return pathname
    .split('/')
    .map((segment, index) => {
      if (segment === '' && index === 0) {
        return '';
      }
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (error) {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function buildAbsoluteUrl(originalUrl) {
  try {
    let urlToUse = originalUrl;
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      if (!originalUrl.startsWith('/')) {
        urlToUse = `/${originalUrl}`;
      }
      urlToUse = `${baseUrl}${urlToUse}`;
    }

    const parsed = new URL(urlToUse);
    parsed.pathname = encodePathSegments(parsed.pathname);
    return parsed.toString();
  } catch (error) {
    console.warn(`⚠️ [CONVERT] Failed to build absolute URL for ${originalUrl}:`, error.message);
    return encodeURI(originalUrl);
  }
}

async function convertUrlToBase64(imageUrl, sessionId, userId = 'dev-user-id') {
  try {
    // If it's already a base64 data URL, return as-is
    if (imageUrl.startsWith('data:image/')) {
      console.log(`✅ Image already in base64 format`);
      return imageUrl;
    }

    console.log(`🔄 Converting image source to base64`);

    let filename = null;
    
    // Handle API route URLs (e.g., /api/files/sessionId/filename or /api/files/users/userId/logos/filename)
    if (imageUrl.includes('/api/files/')) {
      // Remove query string and hash if present
      const cleanUrl = imageUrl.split('?')[0].split('#')[0];
      const urlParts = cleanUrl.split('/api/files/')[1].split('/');
      
      console.log(`📋 [CONVERT] URL parts:`, urlParts);
      
      if (urlParts.length > 1) {
        // Check if this is a logo path FIRST (users/userId/logos/filename)
        if (urlParts[0] === 'users' && urlParts.length >= 4 && urlParts[2] === 'logos') {
          // This is a logo: users/userId/logos/filename
          // The filename is everything after /logos/ (may contain spaces, encoded as %20)
          filename = urlParts.slice(3).join('/'); // Join all parts after /logos/ in case filename has spaces
          console.log(`📋 [CONVERT] Logo detected from URL parts: filename="${filename}"`);
        } else {
          // Regular file: sessionId/filename or users/userId/sessionId/filename
        filename = urlParts[urlParts.length - 1];
          console.log(`📋 [CONVERT] Regular file detected: filename="${filename}"`);
        }
      } else {
        filename = urlParts[0];
        console.log(`📋 [CONVERT] Single part URL: filename="${filename}"`);
      }
      
      // Decode URL-encoded filename (handle spaces, special chars)
      if (filename) {
        filename = decodeURIComponent(filename.replace(/\+/g, ' '));
        console.log(`📋 [CONVERT] Decoded filename: "${filename}"`);
      }
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

    // Check if this is a logo/signature URL (users/userId/logos/filename)
    // Handle both /api/files/users/userId/logos/filename and direct blob URLs
    console.log(`🔍 [CONVERT] Checking if image source is a logo`);
    
    // Try to match logo URL pattern
    // URL format: /api/files/users/{userId}/logos/{filename}
    // filename may contain spaces, encoded as %20, and special chars
    // We need to capture everything after /logos/ until the end (or query string)
    const logoMatch = imageUrl.match(/\/api\/files\/users\/([^\/]+)\/logos\/(.+?)(?:\?|$|#)/);
    let possiblePaths = [];
    let isLogoFile = false;
    let effectiveUserId = userId;
    let effectiveFilename = filename;
    
    if (logoMatch) {
      // This is a logo/signature file - look in users/{userId}/logos/ directory
      isLogoFile = true;
      const userIdFromUrl = logoMatch[1];
      let logoFilename = logoMatch[2];
      
      // Decode URL-encoded filename (handle spaces, special chars)
      // Spaces in URLs are encoded as %20 or +, so we decode both
      logoFilename = decodeURIComponent(logoFilename.replace(/\+/g, ' '));
      
      // Use userId from URL or fallback to provided userId parameter
      effectiveUserId = userIdFromUrl || userId;
      effectiveFilename = logoFilename;
      
      console.log(`📋 [CONVERT] Logo/signature detected: userId=${effectiveUserId}, filename="${logoFilename}"`);
      
      // THE EXACT PATH WHERE FILES ARE STORED:
      // /Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/dev-user-id/logos/{filename}
      const exactPath = `/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/${effectiveUserId}/logos/${logoFilename}`;
      
      // Build paths - START WITH THE EXACT PATH FIRST
      possiblePaths = [
        // PRIMARY: The exact path where files are stored
        exactPath,
        // Fallbacks for different execution contexts
        path.join(process.cwd(), 'frontend', 'uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(process.cwd(), 'uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(__dirname, '../../../frontend/uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(__dirname, '../../frontend/uploads', 'users', effectiveUserId, 'logos', logoFilename),
      ];
      
      console.log(`📋 [CONVERT] Logo paths to check: ${possiblePaths.length} paths`);
      possiblePaths.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
      
      // Also try to find logo files by type prefix (company-, footer-, signature-)
      // in case the filename doesn't match exactly (e.g., spaces or special chars)
      const logoType = logoFilename.startsWith('company-') ? 'company' : 
                       logoFilename.startsWith('footer-') ? 'footer' : 
                       logoFilename.startsWith('signature-') ? 'signature' : null;
      
      if (logoType) {
        // THE EXACT BASE DIRECTORY WHERE LOGOS ARE STORED:
        const exactBaseDir = `/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/${effectiveUserId}/logos`;
        const baseDirs = [
          // PRIMARY: The exact directory
          exactBaseDir,
          // Fallbacks
          path.join(process.cwd(), 'frontend', 'uploads', 'users', effectiveUserId, 'logos'),
          path.join(process.cwd(), 'uploads', 'users', effectiveUserId, 'logos'),
          path.join(__dirname, '../../../frontend/uploads', 'users', effectiveUserId, 'logos'),
        ];
        
        for (const baseDir of baseDirs) {
          try {
            if (await fs.access(baseDir).then(() => true).catch(() => false)) {
              const files = await fs.readdir(baseDir);
              const matchingFiles = files.filter(f => f.startsWith(`${logoType}-`));
              if (matchingFiles.length > 0) {
                // Use the most recent logo file of this type
                const sortedFiles = matchingFiles.sort((a, b) => {
                  const aTime = a.match(/\d+/)?.[0] || '0';
                  const bTime = b.match(/\d+/)?.[0] || '0';
                  return parseInt(bTime) - parseInt(aTime);
                });
                const latestFile = sortedFiles[0];
                const latestPath = path.join(baseDir, latestFile);
                possiblePaths.unshift(latestPath); // Add to beginning for priority
                console.log(`📋 [CONVERT] Found latest ${logoType} logo: ${latestFile} at ${baseDir}`);
              }
            }
          } catch (err) {
            // Ignore - continue to next path
          }
        }
      }
    } else {
      // Regular file - look in sessionId directory
      console.log(`📋 [CONVERT] Regular file detected: sessionId=${sessionId}, filename="${filename}"`);
      
      // Use unified FileStorageHelper to get all possible paths
      possiblePaths = FileStorageHelper.getPossiblePaths(sessionId, filename, userId);
      
      console.log(`📋 [CONVERT] File paths to check: ${possiblePaths.length} paths`);
      possiblePaths.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    }

    let filePath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        console.log(`✅ [CONVERT] Found file at: ${filePath}`);
        break;
      } catch (err) {
        // Continue to next path
        console.log(`  ❌ [CONVERT] Not found: ${testPath}`);
      }
    }

    if (!filePath) {
      console.warn(`⚠️ [CONVERT] File not found locally for image source`);
      console.warn(`📁 [CONVERT] Searched ${possiblePaths.length} paths:`);
      possiblePaths.forEach((p, i) => console.warn(`   ${i + 1}. ${p}`));
      
      // Try to fetch via HTTP if it's an API route or absolute URL
      if (imageUrl.startsWith('/api/files/') || imageUrl.includes('://')) {
        console.log(`🌐 [CONVERT] Attempting HTTP fetch for image source`);
        
        // Build the full URL if it's a relative API route
        let httpUrl = imageUrl;
        if (imageUrl.startsWith('/api/files/') && !imageUrl.startsWith('http')) {
          // Try to construct full URL from environment
          // For local development, use localhost:3000 (Next.js frontend)
          // For production, use the actual domain
          const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                         process.env.FRONTEND_URL ||
                         process.env.BACKEND_URL || 
                         'http://localhost:3000'; // Use frontend port for API routes
          // URL is already encoded, just combine it
          httpUrl = `${baseUrl}${imageUrl}`;
          console.log(`🌐 [CONVERT] Constructed full URL for HTTP fetch`);
        }
        
        try {
          const base64DataUrl = await fetchImageViaHttp(httpUrl);
          console.log(`✅ [CONVERT] HTTP fetch successful, converted to base64`);
          return base64DataUrl;
        } catch (httpError) {
          console.error(`❌ [CONVERT] HTTP fetch also failed:`, httpError.message);
          console.error(`   [CONVERT] Tried normalized HTTP fetch URL`);
          // Don't throw - try to continue with original URL as fallback
          console.warn(`⚠️ [CONVERT] Returning original URL - image may not appear in PDF`);
          return imageUrl;
        }
      }
      
      throw new Error(`File not found for requested image source`);
    }

    console.log(`📁 [CONVERT] Reading file from: ${filePath}`);
    const fileBuffer = await fs.readFile(filePath);
    const fileSizeKb = Math.round(fileBuffer.length / 1024);

    const ext = path.extname(effectiveFilename || filename).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    console.log(`✅ [CONVERT] Inlined ${isLogoFile ? 'logo' : 'non-logo'} image as base64 (${Math.round(dataUrl.length / 1024)}KB)`);
    return dataUrl;
  } catch (error) {
    console.error(`❌ Failed to convert image source to base64`, error.message);
    console.error(`   Error stack:`, error.stack);
    // Return original URL as fallback - but log warning
    console.warn(`⚠️ Returning original URL - image may not appear in PDF`);
    return imageUrl;
  }
}

/**
 * Convert all image URLs in HTML to base64
 */
async function convertImageUrlsToBase64(htmlContent, sessionId, userId = 'dev-user-id') {
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
    
    // Skip if already base64
    if (imageUrl.startsWith('data:image/')) {
      console.log(`  ✅ Already base64, skipping`);
      skippedCount++;
      continue;
    }

    try {
      const convertedSource = await convertUrlToBase64(imageUrl, sessionId, userId);
      
      if (convertedSource !== imageUrl) {
        // Escape special regex characters in the original URL
        const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace the src in the img tag - handle both single and double quotes
        const updatedTag = fullTag.replace(
          new RegExp(`src=["']${escapedUrl}["']`, 'i'),
          `src="${convertedSource}"`
        );
        
        if (updatedTag !== fullTag) {
          updatedHtml = updatedHtml.replace(fullTag, updatedTag);
          convertedCount++;
          const conversionNote = convertedSource.startsWith('data:image/') ? 'converted to base64' : 'normalized URL';
          console.log(`  ✅ Successfully replaced image src (${conversionNote})`);
        } else {
          console.warn(`  ⚠️ Tag replacement failed - URLs might not match exactly`);
          errorCount++;
        }
      } else {
        console.log(`  ⏭️  Conversion returned original URL - leaving src unchanged`);
        skippedCount++;
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
    console.log(`👤 User ID: ${req.body.userId || 'dev-user-id'}`);
    console.log(`📝 HTML content length: ${htmlContent.length} characters`);
    
    // Check if HTML contains logo images
    const logoMatches = htmlContent.match(/<img[^>]+src=["']([^"']*logo[^"']*)["'][^>]*>/gi);
    if (logoMatches) {
      console.log(`📸 Found ${logoMatches.length} logo image(s) in HTML`);
      logoMatches.forEach((match, idx) => {
        const urlMatch = match.match(/src=["']([^"']+)["']/);
        if (urlMatch) {
          const url = urlMatch[1];
          // Don't log full base64 data URLs - they're too long and cut off logs
          if (url.startsWith('data:image/')) {
            const sizeKB = Math.round(url.length / 1024);
            console.log(`   Logo ${idx + 1}: [base64 data URL, ~${sizeKB}KB]`);
          } else {
            // Truncate long URLs to avoid cutting off logs
            const displayUrl = url.length > 150 ? url.substring(0, 150) + '...' : url;
            console.log(`   Logo ${idx + 1}: ${displayUrl}`);
          }
        }
      });
    } else {
      console.warn(`⚠️ No logo images found in HTML!`);
      
      // DEBUG: Check what image URLs are in HTML
      const allImageMatches = htmlContent.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
      if (allImageMatches) {
        console.log(`📸 Found ${allImageMatches.length} total image(s) in HTML:`);
        allImageMatches.forEach((match, idx) => {
          const urlMatch = match.match(/src=["']([^"']+)["']/);
          if (urlMatch) {
            const url = urlMatch[1];
            // Don't log full base64 data URLs - they're too long and cut off logs
            if (url.startsWith('data:image/')) {
              const sizeKB = Math.round(url.length / 1024);
              // Check if it's a logo (company, footer, or signature) by checking surrounding context
              const isLogoUrl = match.includes('company') || match.includes('footer') || match.includes('signature');
              console.log(`   Image ${idx + 1}: [base64 data URL, ~${sizeKB}KB] ${isLogoUrl ? '(LOGO!)' : ''}`);
            } else {
              // Check if it's a logo URL
              const isLogoUrl = url.includes('/logos/') || url.includes('company') || url.includes('footer') || url.includes('signature');
              // Truncate long URLs to avoid cutting off logs
              const displayUrl = url.length > 100 ? url.substring(0, 100) + '...' : url;
              console.log(`   Image ${idx + 1}: ${displayUrl} ${isLogoUrl ? '(LOGO!)' : ''}`);
            }
          }
        });
      } else {
        console.warn(`⚠️ No images found in HTML at all!`);
      }
      
      // DEBUG: Check if HTML contains logo-related text
      if (htmlContent.includes('Company Logo') || htmlContent.includes('Footer Logo') || htmlContent.includes('signature')) {
        console.log(`📝 HTML contains logo-related text, but no <img> tags found`);
        // Try to find the logo section
        const logoSection = htmlContent.match(/Company Logo[^<]*<[^>]*>/i);
        if (logoSection) {
          console.log(`   Found logo section: ${logoSection[0].substring(0, 200)}`);
        }
      }
    }

    // Convert image URLs to base64 before PDF generation
    // Pass userId if available (for logo paths)
    const userId = req.body.userId || 'dev-user-id';
    let optimizedHtml = await convertImageUrlsToBase64(htmlContent, sessionId, userId);
    
    // Count and log base64 images for debugging
    const base64Matches = optimizedHtml.match(/data:image\/(png|jpeg|jpg);base64,/g);
    if (base64Matches) {
      
      // Log sizes of base64 images
      const imageSizes = [];
      let totalBase64Size = 0;
      optimizedHtml.replace(
        /data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/]+=*)/g,
        (match, type, base64Data) => {
          const sizeBytes = base64Data.length;
          const sizeKB = Math.round(sizeBytes / 1024);
          totalBase64Size += sizeBytes;
          imageSizes.push(`${type}: ${sizeKB}KB`);
          
          // Check if this is a logo (company, footer, or signature)
          const logoCheck = optimizedHtml.substring(
            optimizedHtml.indexOf(match) - 100,
            optimizedHtml.indexOf(match) + match.length
          );
          
          return match;
        }
      );
    }

    // Detect environment and use appropriate Puppeteer setup
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    
    if (isVercel) {
      // Vercel: Use puppeteer-core with @sparticuz/chromium
      console.log(`🚀 Using serverless Chromium for PDF generation...`);
      const puppeteerCore = require('puppeteer-core');
      const chromium = require('@sparticuz/chromium');
      
      browser = await puppeteerCore.launch({
        args: [...chromium.args, '--allow-file-access-from-files'],
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
      });
    }

    const page = await browser.newPage();
    
    // Use the full HTML from document-template.ts directly - it's already a complete document
    // with all the CSS and styling unified with export.js. We just need to convert images to base64,
    // which we already did. The optimizedHtml is the full HTML document from document-template.ts
    // with base64 images, so we can use it directly.
    const fullHtml = optimizedHtml;
    
    // Set content and wait for it to fully load
    await page.setContent(fullHtml, { 
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: 30000 
    });
    
    // Wait a bit more to ensure all content is rendered
    await page.evaluateHandle('document.fonts.ready');

    // Ensure all images are fully loaded before generating the PDF
    await page.evaluate(async () => {
      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })
      );
    });
    
    await page.emulateMediaType('screen');
    
    // Generate PDF with proper settings
    console.log('📄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    await browser.close();
    browser = null;

    const finalPdfBuffer = pdfBuffer;

    const pdfSizeBytes = finalPdfBuffer.length;
    const pdfSizeKB = Math.round(pdfSizeBytes / 1024);
    const pdfSizeMB = (pdfSizeBytes / (1024 * 1024)).toFixed(2);
    
    // Verify the buffer is valid
    if (!finalPdfBuffer || finalPdfBuffer.length === 0) {
      throw new Error('PDF generation resulted in empty buffer');
    }

    // Send PDF as response with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shamay-valuation-${sessionId}.pdf"`);
    res.setHeader('Content-Length', finalPdfBuffer.length.toString());
    
    // Send as Buffer to ensure binary data is preserved
    res.status(200).end(finalPdfBuffer, 'binary');

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

// React-PDF route (new, faster alternative to Puppeteer)

module.exports = router;

