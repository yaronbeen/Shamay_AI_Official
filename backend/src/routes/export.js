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
    const client = imageUrl.startsWith('https://') ? https : http;
    const timeout = 30000;
    
    const request = client.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const contentType = response.headers['content-type'] || 'image/png';
        const dataUrl = `data:${contentType};base64,${base64}`;
        resolve(dataUrl);
      });
      
      response.on('error', (err) => {
        reject(new Error(`Response stream error: ${err.message}`));
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
    return encodeURI(originalUrl);
  }
}

const base64Cache = new Map();

async function convertUrlToBase64(imageUrl, sessionId, userId = 'dev-user-id') {
  try {
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }

    if (base64Cache.has(imageUrl)) {
      return base64Cache.get(imageUrl);
    }

    if (/^https?:\/\/.+\.blob\.vercel-storage\.com\//.test(imageUrl)) {
      try {
        const base64Image = await fetchImageViaHttp(imageUrl);
        base64Cache.set(imageUrl, base64Image);
        return base64Image;
      } catch (error) {
        base64Cache.set(imageUrl, imageUrl);
        return imageUrl;
      }
    }

    let workingUrl = imageUrl;
    if (/^https?:\/\//.test(imageUrl)) {
      try {
        const parsed = new URL(imageUrl);
        const pathIncludesFiles = parsed.pathname.includes('/api/files/');
        
        if (!pathIncludesFiles && !parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
          try {
            const base64Image = await fetchImageViaHttp(imageUrl);
            base64Cache.set(imageUrl, base64Image);
            return base64Image;
          } catch (error) {
            base64Cache.set(imageUrl, imageUrl);
            return imageUrl;
          }
        }
        
        workingUrl = `${parsed.pathname}${parsed.search || ''}`;
      } catch (parseError) {
        try {
          const base64Image = await fetchImageViaHttp(imageUrl);
          base64Cache.set(imageUrl, base64Image);
          return base64Image;
        } catch (error) {
          base64Cache.set(imageUrl, imageUrl);
          return imageUrl;
        }
      }
    }

    let filename = null;
    
    if (workingUrl.includes('/api/files/')) {
      const cleanUrl = workingUrl.split('?')[0].split('#')[0];
      const urlParts = cleanUrl.split('/api/files/')[1].split('/');
      
      if (urlParts.length > 1) {
        if (urlParts[0] === 'users' && urlParts.length >= 4 && urlParts[2] === 'logos') {
          filename = urlParts.slice(3).join('/');
        } else {
        filename = urlParts[urlParts.length - 1];
        }
      } else {
        filename = urlParts[0];
      }
      
      if (filename) {
        filename = decodeURIComponent(filename.replace(/\+/g, ' '));
      }
    }
    else if (workingUrl.includes('/uploads/') || workingUrl.includes('uploads/')) {
      const urlParts = workingUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }
      if (filename.includes('#')) {
        filename = filename.split('#')[0];
      }
    }
    else {
      const urlParts = workingUrl.split('/');
      filename = urlParts[urlParts.length - 1];
      if (filename.includes('?')) filename = filename.split('?')[0];
      if (filename.includes('#')) filename = filename.split('#')[0];
    }

    if (!filename) {
      throw new Error('Could not extract filename from URL');
    }

    const logoMatch = imageUrl.match(/\/api\/files\/users\/([^\/]+)\/logos\/(.+?)(?:\?|$|#)/);
    let possiblePaths = [];
    let isLogoFile = false;
    let effectiveUserId = userId;
    let effectiveFilename = filename;
    
    if (logoMatch) {
      isLogoFile = true;
      const userIdFromUrl = logoMatch[1];
      let logoFilename = logoMatch[2];
      
      logoFilename = decodeURIComponent(logoFilename.replace(/\+/g, ' '));
      
      effectiveUserId = userIdFromUrl || userId;
      effectiveFilename = logoFilename;
      
      const exactPath = `/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/${effectiveUserId}/logos/${logoFilename}`;
      
      possiblePaths = [
        exactPath,
        path.join(process.cwd(), 'frontend', 'uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(process.cwd(), 'uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(__dirname, '../../../frontend/uploads', 'users', effectiveUserId, 'logos', logoFilename),
        path.join(__dirname, '../../frontend/uploads', 'users', effectiveUserId, 'logos', logoFilename),
      ];
      
      const logoType = logoFilename.startsWith('company-') ? 'company' : 
                       logoFilename.startsWith('footer-') ? 'footer' : 
                       logoFilename.startsWith('signature-') ? 'signature' : null;
      
      if (logoType) {
        const exactBaseDir = `/Users/shalom.m/Documents/Code/Shamay-slow/frontend/uploads/users/${effectiveUserId}/logos`;
        const baseDirs = [
          exactBaseDir,
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
                const sortedFiles = matchingFiles.sort((a, b) => {
                  const aTime = a.match(/\d+/)?.[0] || '0';
                  const bTime = b.match(/\d+/)?.[0] || '0';
                  return parseInt(bTime) - parseInt(aTime);
                });
                const latestFile = sortedFiles[0];
                const latestPath = path.join(baseDir, latestFile);
                possiblePaths.unshift(latestPath);
              }
            }
          } catch (err) {
            // Ignore
          }
        }
      }
    } else {
      possiblePaths = FileStorageHelper.getPossiblePaths(sessionId, filename, userId);
    }

    let filePath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        break;
      } catch (err) {
        // Continue to next path
      }
    }

    if (!filePath) {
      const absoluteUrl = buildAbsoluteUrl(imageUrl);
      base64Cache.set(imageUrl, absoluteUrl);
      return absoluteUrl;
    }

    const fileBuffer = await fs.readFile(filePath);

    const ext = path.extname(effectiveFilename || filename).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    base64Cache.set(imageUrl, dataUrl);
    return dataUrl;
  } catch (error) {
    console.error(`Failed to convert image to base64:`, error.message);
    base64Cache.set(imageUrl, imageUrl);
    return imageUrl;
  }
}

/**
 * Convert all image URLs in HTML to base64
 */
async function convertImageUrlsToBase64(htmlContent, sessionId, userId = 'dev-user-id') {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];
  
  if (matches.length === 0) {
    return htmlContent;
  }

  const replacementTasks = matches.map(async (match) => {
    const fullTag = match[0];
    const imageUrl = match[1];

    if (imageUrl.startsWith('data:image/')) {
      return null;
    }

    try {
      const convertedSource = await convertUrlToBase64(imageUrl, sessionId, userId);

      if (convertedSource === imageUrl) {
        return null;
      }

      const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const updatedTag = fullTag.replace(
        new RegExp(`src=["']${escapedUrl}["']`, 'i'),
        `src="${convertedSource}"`
      );

      if (updatedTag !== fullTag) {
        return { fullTag, updatedTag };
      }

      return null;
    } catch (error) {
      return null;
    }
  });

  const replacements = await Promise.all(replacementTasks);
  const successfulReplacements = replacements.filter((entry) => entry !== null);

  let updatedHtml = htmlContent;
  successfulReplacements.forEach(({ fullTag, updatedTag }) => {
    updatedHtml = updatedHtml.replace(fullTag, updatedTag);
  });

  return updatedHtml;
}

/**
 * POST /api/export/pdf
 * Generate PDF from HTML template using Puppeteer
 */
router.post('/pdf', async (req, res) => {
  let browser = null;
  
  try {
    const { sessionId, htmlContent, userId: requestUserId } = req.body;

    if (!sessionId || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or htmlContent'
      });
    }

    const userId = requestUserId || 'dev-user-id';
    console.log(`Generating PDF for session: ${sessionId}`);
    
    let optimizedHtml = await convertImageUrlsToBase64(htmlContent, sessionId, userId);

    // Detect environment and use appropriate Puppeteer setup
    const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    
    if (isVercel) {
      const puppeteerCore = require('puppeteer-core');
      const chromium = require('@sparticuz/chromium');
      
      browser = await puppeteerCore.launch({
        args: [...chromium.args, '--allow-file-access-from-files'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = require('puppeteer');
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
      });
    }

    const renderTimeout = parseInt(process.env.PDF_RENDER_TIMEOUT_MS || '120000', 10);
    
    // ===== STRATEGY: Render cover and content separately, then merge =====
    const coverMatch = optimizedHtml.match(/<section[^>]*class="[^"]*cover[^"]*"[^>]*>([\s\S]*?)<\/section>/);
    const headerLogoMatch = optimizedHtml.match(/<section class="pages">[\s\S]*?<header><img src="([^"]+)"[^>]*>/);
    const footerLogoMatch = optimizedHtml.match(/<section class="pages">[\s\S]*?<footer><img src="([^"]+)"[^>]*>/);
    
    const headerLogoSrc = headerLogoMatch ? headerLogoMatch[1] : '';
    const footerLogoSrc = footerLogoMatch ? footerLogoMatch[1] : '';
    
    const contentMatch = optimizedHtml.match(/<section class="pages">[\s\S]*?<main>([\s\S]*?)<\/main>/);
    const cssMatch = optimizedHtml.match(/<style>([\s\S]*?)<\/style>/);
    const css = cssMatch ? cssMatch[1] : '';
    
    if (!coverMatch || !contentMatch) {
      throw new Error('Could not extract cover or content sections from HTML');
    }
    
    // Extract custom edits script and remove it from content
    const customEditsScriptMatch = contentMatch[1].match(/(<script>[\s\S]*?window\.__customEditsApplied[\s\S]*?<\/script>)/);
    const customEditsScript = customEditsScriptMatch ? customEditsScriptMatch[1] : '';
    
    // Remove custom edits script from content to avoid it being in the table
    const cleanContent = contentMatch[1].replace(/(<script>[\s\S]*?window\.__customEditsApplied[\s\S]*?<\/script>)/, '');
    
    const coverHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8" />
          <style>
            ${css}
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <section class="cover">
            ${coverMatch[1]}
          </section>
          ${customEditsScript}
        </body>
      </html>
    `;
    
    const coverPage = await browser.newPage();
    coverPage.setDefaultNavigationTimeout(renderTimeout);
    coverPage.setDefaultTimeout(renderTimeout);
    
    await coverPage.setContent(coverHtml, { 
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: renderTimeout 
    });
    
    await coverPage.evaluateHandle('document.fonts.ready');
    
    if (customEditsScript) {
      await coverPage.evaluate(() => {
        return new Promise((resolve) => {
          if (window.__customEditsApplied) {
            resolve();
            return;
          }
          
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            if (window.__customEditsApplied || (Date.now() - startTime > 2000)) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
        });
      });
    }
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    await coverPage.emulateMediaType('print');
    
    const coverPdf = await coverPage.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
    
    await coverPage.close();
    
    // Use TABLE-BASED layout for reliable header/footer on every page
    const headerHtml = headerLogoSrc ? `
      <thead style="display: table-header-group;">
        <tr>
          <td style="height: 70px; padding: 10px 0; text-align: center; vertical-align: middle; border: none;">
            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
              <img src="${headerLogoSrc}" style="max-height: 55px; max-width: 90%; object-fit: contain;" />
            </div>
          </td>
        </tr>
      </thead>
    ` : '<thead style="display: table-header-group;"><tr><td style="height: 20px; border: none;"></td></tr></thead>';
    
    const footerHtml = footerLogoSrc ? `
      <tfoot style="display: table-footer-group;">
        <tr>
          <td style="height: 70px; padding: 10px 0; text-align: center; vertical-align: middle; border-top: 1px solid rgba(148, 163, 184, 0.15); border-bottom: none; border-left: none; border-right: none;">
            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
              <img src="${footerLogoSrc}" style="max-height: 55px; max-width: 90%; object-fit: contain;" />
            </div>
          </td>
        </tr>
      </tfoot>
    ` : '<tfoot style="display: table-footer-group;"><tr><td style="height: 20px; border: none;"></td></tr></tfoot>';
    
    const contentHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8" />
          <style>
            ${css}
            @page { 
              size: A4; 
              margin: 15mm 15mm 20mm 15mm;
              @bottom-left {
                content: "עמוד " counter(page) " מתוך " counter(pages);
                font-size: 9pt;
                color: #4b5563;
                font-family: "Noto Sans Hebrew", "Rubik", "Arial Hebrew", Arial, sans-serif;
              }
            }
            body { 
              margin: 0; 
              padding: 0; 
              direction: rtl;
            }
            /* Table-based layout for headers/footers */
            .page-table {
              display: table;
              width: 100%;
              height: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            .page-table thead {
              display: table-header-group;
            }
            .page-table tfoot {
              display: table-footer-group;
            }
            .page-table tbody {
              display: table-row-group;
            }
            .page-table tbody tr {
              page-break-inside: avoid;
            }
            .page-table tbody td {
              padding: 10px 8px;
              vertical-align: top;
              border: none;
            }
            .page-table thead td,
            .page-table tfoot td {
              border-left: none;
              border-right: none;
            }
            /* Content wrapper inside table cell */
            .content-wrapper {
              width: 100%;
              box-sizing: border-box;
            }
            /* Flatten page wrappers for natural content flow */
            .page { 
              padding: 0 !important; 
              margin: 0 !important; 
              border: none !important; 
              page-break-after: auto !important; 
              page-break-inside: auto !important; 
            }
            .page-body { 
              padding: 0 8px !important;
              margin: 0 !important;
            }
            .page-header-brand, .page-footer, .page-number { 
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Ensure no empty pages from .page sections */
            .page:empty,
            .page-body:empty {
              display: none !important;
            }
            /* Remove any min-height from page sections */
            .page {
              min-height: 0 !important;
              height: auto !important;
            }
            /* CRITICAL: Ensure content breaks to new pages, never gets cut */
            * {
              orphans: 3;
              widows: 3;
              box-sizing: border-box;
            }
            
            /* GLOBAL COMPACT SPACING: Reduce all margins/padding to minimize breaks */
            body * {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }
            
            /* Re-add minimal spacing only where needed */
            .chapter-title {
              margin-top: 0 !important;
              margin-bottom: 16px !important;
              padding-bottom: 8px !important;
            }
            
            .section-block {
              margin-bottom: 10px !important;
              margin-top: 10px !important;
            }
            
            .sub-title {
              margin-top: 12px !important;
              margin-bottom: 6px !important;
            }
            
            p {
              margin-top: 4px !important;
              margin-bottom: 4px !important;
              line-height: 1.5 !important;
              orphans: 2;
              widows: 2;
            }
            
            /* Compact list spacing */
            ul, ol {
              margin-top: 6px !important;
              margin-bottom: 6px !important;
              padding-right: 16px !important;
            }
            
            ul li, ol li {
              margin-bottom: 4px !important;
              line-height: 1.4 !important;
            }
            
            .bullet-list li, .legal-list li {
              margin-bottom: 6px !important;
              padding: 8px 8px 8px 12px !important; /* Right padding for RTL bullet */
              padding-right: 28px !important; /* Extra right padding for bullet in RTL */
              position: relative !important;
            }
            
            /* Fix bullet position - ensure it doesn't overlap text */
            .bullet-list li::before,
            .legal-list li::before {
              position: absolute !important;
              right: 12px !important;
              top: 8px !important;
              font-size: 18px !important;
              line-height: 1 !important;
            }
            
            /* Compact callouts and notes */
            .callout {
              margin-top: 10px !important;
              margin-bottom: 10px !important;
              padding: 10px 14px !important;
            }
            
            .page-note {
              margin-top: 8px !important;
              margin-bottom: 8px !important;
              padding: 8px 12px !important;
              font-size: 8.5pt !important;
              line-height: 1.4 !important;
            }
            
            /* Compact info grids */
            .info-grid {
              padding: 8px !important;
              gap: 8px !important;
              margin-top: 8px !important;
              margin-bottom: 8px !important;
            }
            
            .info-grid p {
              margin: 0 !important;
            }
            
            /* Compact key-value pairs */
            .key-value {
              margin-bottom: 4px !important;
            }
            
            /* Compact media galleries */
            .media-gallery {
              gap: 10px !important;
              margin-top: 8px !important;
              margin-bottom: 8px !important;
            }
            
            .media-card {
              min-height: 140px !important;
            }
            
            .media-caption {
              padding: 6px 10px !important;
              font-size: 8.5pt !important;
            }
            
            /* Compact valuation cards */
            .valuation-card {
              padding: 12px 14px !important;
              margin-bottom: 8px !important;
            }
            
            .valuation-summary {
              gap: 10px !important;
              margin-top: 8px !important;
              margin-bottom: 8px !important;
            }
            
            /* Compact signature block */
            .signature-block {
              margin-top: 20px !important;
            }
            
            /* Allow natural breaking for large containers */
            .section-block, .info-grid, .valuation-card, .media-gallery, 
            .comparables-table-block { 
              page-break-inside: auto; 
            }
            
            /* TABLES: Try to keep together, use compact spacing */
            table { 
              page-break-inside: avoid; /* Try to keep table on one page */
              border-collapse: separate !important;
              border-spacing: 0 !important;
              width: 100% !important;
              table-layout: fixed !important; /* Prevent overlapping cells */
            }
            
            /* Compact table spacing to fit more on one page */
            table th,
            table td {
              padding: 6px 8px !important; /* Reduced from default */
              line-height: 1.4 !important;
              page-break-inside: avoid;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              vertical-align: top !important;
              box-sizing: border-box !important;
            }
            
            /* Even more compact for comparables tables (lots of columns) */
            .comparables {
              table-layout: auto !important; /* Let columns size naturally */
            }
            
            .comparables th,
            .comparables td {
              padding: 4px 6px !important;
              line-height: 1.3 !important;
              font-size: 8.5pt !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
            }
            
            /* Reduce spacing between table rows */
            table tbody tr {
              margin: 0 !important;
            }
            
            /* If table MUST break, keep rows together */
            tr { 
              page-break-inside: avoid;
            }
            
            th, td { 
              page-break-inside: avoid;
            }
            
            /* Keep headers with content */
            thead {
              display: table-header-group;
            }
            
            /* Compact table margins */
            table {
              margin-top: 6px !important;
              margin-bottom: 6px !important;
            }
            
            /* SMART SECTION BREAKS: Start major sections on new page if near bottom */
            .chapter-title {
              page-break-before: auto;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            /* Keep chapter title with next content (at least first paragraph) */
            .chapter-title + * {
              page-break-before: avoid;
            }
            
            /* Keep sub-sections together with their content */
            .sub-title {
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            /* Keep sub-title with next 2-3 lines of content */
            .sub-title + p,
            .sub-title + div,
            .sub-title + table,
            .sub-title + .info-grid,
            .sub-title + ul {
              page-break-before: avoid;
            }
            
            /* Major sections: prefer starting on new page */
            .section-block:has(.chapter-title),
            .page-body > .chapter-title:first-child {
              page-break-before: auto;
            }
            
            /* Signature/final section: keep together or push to new page */
            .signature-block {
              page-break-inside: avoid;
              page-break-before: auto;
            }
            
            /* Valuation summary (final section): try to keep on one page */
            .valuation-summary {
              page-break-inside: avoid;
            }
            
            /* Keep headings with content */
            h1, h2, h3 { 
              page-break-inside: avoid; 
              page-break-after: avoid; 
            }
            
            h1 + *, h2 + *, h3 + * {
              page-break-before: avoid;
            }
            
            .callout { 
              page-break-inside: avoid; 
            }
            
            /* Ensure these elements don't break */
            p.page-note, .key-value, .bullet-list li, .legal-list li {
              page-break-inside: avoid;
            }
            
            /* Images and media should not break */
            img, .media-card, figure {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          <table class="page-table">
            ${headerHtml}
            ${footerHtml}
            <tbody>
              <tr>
                <td>
                  <div class="content-wrapper">
                    ${cleanContent}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          ${customEditsScript}
        </body>
      </html>
    `;
    
    const contentPage = await browser.newPage();
    contentPage.setDefaultNavigationTimeout(renderTimeout);
    contentPage.setDefaultTimeout(renderTimeout);
    
    await contentPage.setContent(contentHtml, { 
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: renderTimeout 
    });
    
    await contentPage.evaluateHandle('document.fonts.ready');
    
    await contentPage.evaluate(() => {
      return new Promise((resolve) => {
        if (window.__customEditsApplied) {
          resolve();
          return;
        }
        
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (window.__customEditsApplied || (Date.now() - startTime > 2000)) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    });
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Ensure all images are loaded
    await contentPage.evaluate(async () => {
      const images = Array.from(document.images || []);
      const LOAD_FAILSAFE_MS = 8000;
      await Promise.all(
        images.map((img) =>
          new Promise((resolve) => {
            const finalize = () => { clearTimeout(timeoutId); resolve(); };
            const timeoutId = setTimeout(finalize, LOAD_FAILSAFE_MS);
            if (img.complete && img.naturalWidth > 0) { finalize(); return; }
            img.addEventListener('load', finalize, { once: true });
            img.addEventListener('error', finalize, { once: true });
          })
        )
      );
    });
    
    await contentPage.emulateMediaType('print');
    
    const contentPdf = await contentPage.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });
    
    await contentPage.close();
    
    const { PDFDocument } = require('pdf-lib');
    
    const coverPdfDoc = await PDFDocument.load(coverPdf);
    const contentPdfDoc = await PDFDocument.load(contentPdf);
    const mergedPdfDoc = await PDFDocument.create();
    
    // Add cover page
    const [coverPageCopy] = await mergedPdfDoc.copyPages(coverPdfDoc, [0]);
    mergedPdfDoc.addPage(coverPageCopy);
    
    // Add all content pages
    const contentPageIndices = contentPdfDoc.getPageIndices();
    const contentPages = await mergedPdfDoc.copyPages(contentPdfDoc, contentPageIndices);
    contentPages.forEach((page) => mergedPdfDoc.addPage(page));
    
    const finalPdfBuffer = Buffer.from(await mergedPdfDoc.save());
    
    await browser.close();
    browser = null;

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

