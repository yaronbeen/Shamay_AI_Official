import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Convert PDF to markdown using MarkItDown Python package (with fallback to pdf-parse)
 * @param {string} pdfPath - Path to the input PDF file
 * @param {string} outputPath - Path where the markdown should be saved
 * @returns {Promise<Object>} - Conversion result with metadata
 */
async function convertPdfToMarkdown(pdfPath, outputPath) {
  // First try direct PDF text extraction as fallback
  try {
    console.log('Trying direct PDF text extraction as fallback...');
    return await convertPdfToMarkdownFallback(pdfPath, outputPath);
  } catch (fallbackError) {
    console.log('Direct extraction failed, trying MarkItDown...');
    return await convertPdfToMarkdownMarkItDown(pdfPath, outputPath);
  }
}

/**
 * Fallback PDF to text conversion using pdf-parse
 */
async function convertPdfToMarkdownFallback(pdfPath, outputPath) {
  const startTime = Date.now();
  
  // Validate input file exists
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Extract text from PDF
  console.log('📄 Extracting text from PDF using pdf-parse...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const documentText = pdfData.text;
  
  // Convert to basic markdown format
  const markdownContent = `# Document: ${path.basename(pdfPath)}

${documentText}
`;

  // Save to output file
  fs.writeFileSync(outputPath, markdownContent, 'utf8');
  
  const processingTime = Date.now() - startTime;
  
  return {
    success: true,
    outputPath: outputPath,
    markdownContent: markdownContent,
    processingTimeMs: processingTime,
    characterCount: markdownContent.length,
    method: 'pdf-parse-fallback',
    stdout: 'PDF extracted successfully using pdf-parse',
    stderr: ''
  };
}

/**
 * Original MarkItDown conversion method
 */
async function convertPdfToMarkdownMarkItDown(pdfPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Validate input file exists
    if (!fs.existsSync(pdfPath)) {
      return reject(new Error(`PDF file not found: ${pdfPath}`));
    }

    // For uploaded files without .pdf extension, create a temporary copy with proper extension
    let actualPdfPath = pdfPath;
    let tempFileCreated = false;
    
    if (!pdfPath.toLowerCase().endsWith('.pdf')) {
      actualPdfPath = pdfPath + '.pdf';
      fs.copyFileSync(pdfPath, actualPdfPath);
      tempFileCreated = true;
      console.log(`Created temporary PDF copy: ${actualPdfPath}`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const startTime = Date.now();
    
    // Spawn Python process with MarkItDown conversion
    const pythonProcess = spawn('markitdown_env/bin/python', [
      'convert-pdf-markitdown.py',
      actualPdfPath,
      outputPath
    ], {
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      const processingTime = Date.now() - startTime;
      
      console.log(`Python process exited with code ${code}`);
      console.log(`Stdout: ${stdout}`);
      console.log(`Stderr: ${stderr}`);
      
      if (code !== 0) {
        return reject(new Error(`MarkItDown conversion failed with code ${code}. Stderr: ${stderr}, Stdout: ${stdout}`));
      }

      // Verify output file was created
      if (!fs.existsSync(outputPath)) {
        return reject(new Error(`Output markdown file was not created: ${outputPath}`));
      }

      // Read the generated markdown content
      const markdownContent = fs.readFileSync(outputPath, 'utf8');
      
      // Clean up temporary PDF file if created
      if (tempFileCreated && fs.existsSync(actualPdfPath)) {
        fs.unlinkSync(actualPdfPath);
        console.log(`Cleaned up temporary PDF: ${actualPdfPath}`);
      }
      
      resolve({
        success: true,
        outputPath: outputPath,
        markdownContent: markdownContent,
        processingTimeMs: processingTime,
        characterCount: markdownContent.length,
        method: 'markitdown',
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    pythonProcess.on('error', (error) => {
      // Clean up temporary PDF file if created
      if (tempFileCreated && fs.existsSync(actualPdfPath)) {
        fs.unlinkSync(actualPdfPath);
      }
      reject(new Error(`Failed to spawn MarkItDown process: ${error.message}`));
    });

    // Set timeout for long-running conversions
    setTimeout(() => {
      pythonProcess.kill();
      // Clean up temporary PDF file if created
      if (tempFileCreated && fs.existsSync(actualPdfPath)) {
        fs.unlinkSync(actualPdfPath);
      }
      reject(new Error('MarkItDown conversion timed out after 30 seconds'));
    }, 30000);
  });
}

export {
  convertPdfToMarkdown
};