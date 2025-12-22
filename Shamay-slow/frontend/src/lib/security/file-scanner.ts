/**
 * File Scanner - Security layer for file uploads
 * Validates file types, checks for malicious content, enforces size limits
 */

export interface ScanResult {
  isValid: boolean;
  isSafe: boolean;
  threats: FileThreat[];
  sanitizedFile?: File;
  blockReason?: string;
}

export interface FileThreat {
  type: 'invalid_type' | 'size_exceeded' | 'malicious_content' | 'suspicious_name' | 'polyglot';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

// Allowed MIME types
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

// Magic bytes for file type validation
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

// Dangerous patterns in file content
const DANGEROUS_PATTERNS = [
  { pattern: /<script/i, desc: 'Script tag in file' },
  { pattern: /javascript:/i, desc: 'JavaScript protocol' },
  { pattern: /<%|%>/i, desc: 'Server-side code markers' },
  { pattern: /<\?php/i, desc: 'PHP code' },
  { pattern: /eval\s*\(/i, desc: 'Eval function' },
  { pattern: /document\.cookie/i, desc: 'Cookie access' },
  { pattern: /window\.location/i, desc: 'Location manipulation' },
];

// Suspicious filename patterns
const SUSPICIOUS_FILENAME_PATTERNS = [
  { pattern: /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|msi|dll)$/i, desc: 'Executable extension' },
  { pattern: /\.(php|asp|aspx|jsp|cgi)$/i, desc: 'Server-side script' },
  { pattern: /\.{2,}/, desc: 'Multiple dots (extension hiding)' },
  { pattern: /[<>:"|?*]/, desc: 'Invalid filename characters' },
  { pattern: /\x00/, desc: 'Null byte injection' },
];

// Size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSIONS = 8000; // 8000x8000 max

/**
 * Scan a file for security issues
 */
export async function scanFile(file: File): Promise<ScanResult> {
  const threats: FileThreat[] = [];
  let isValid = true;
  let isSafe = true;
  let blockReason: string | undefined;

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    threats.push({
      type: 'size_exceeded',
      severity: 'medium',
      description: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    });
    isValid = false;
    blockReason = 'הקובץ גדול מדי';
  }

  // Check filename
  for (const { pattern, desc } of SUSPICIOUS_FILENAME_PATTERNS) {
    if (pattern.test(file.name)) {
      threats.push({
        type: 'suspicious_name',
        severity: 'high',
        description: `${desc}: ${file.name}`,
      });
      isSafe = false;
      blockReason = 'שם קובץ חשוד';
    }
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES[file.type]) {
    threats.push({
      type: 'invalid_type',
      severity: 'high',
      description: `Unsupported file type: ${file.type}`,
    });
    isValid = false;
    blockReason = 'סוג קובץ לא נתמך';
  } else {
    // Validate extension matches MIME type
    const allowedExtensions = ALLOWED_MIME_TYPES[file.type];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      threats.push({
        type: 'polyglot',
        severity: 'high',
        description: `Extension ${fileExt} does not match MIME type ${file.type}`,
      });
      isSafe = false;
    }
  }

  // Validate magic bytes
  const magicBytesValid = await validateMagicBytes(file);
  if (!magicBytesValid) {
    threats.push({
      type: 'polyglot',
      severity: 'critical',
      description: 'File signature does not match declared type (possible polyglot)',
    });
    isSafe = false;
    blockReason = 'חתימת קובץ לא תקינה';
  }

  // Scan content for dangerous patterns (for text-like content in PDFs)
  if (file.type === 'application/pdf') {
    const contentSafe = await scanPdfContent(file);
    if (!contentSafe.safe) {
      threats.push({
        type: 'malicious_content',
        severity: 'critical',
        description: contentSafe.reason || 'Suspicious content in PDF',
      });
      isSafe = false;
      blockReason = 'תוכן חשוד בקובץ PDF';
    }
  }

  return {
    isValid: isValid && isSafe,
    isSafe,
    threats,
    blockReason,
  };
}

/**
 * Validate file magic bytes match declared type
 */
async function validateMagicBytes(file: File): Promise<boolean> {
  const signatures = FILE_SIGNATURES[file.type];
  if (!signatures) return true; // No signature defined, skip check

  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const signature of signatures) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Scan PDF content for suspicious patterns
 * Scans multiple positions (beginning, middle, end) to catch hidden malicious content
 */
async function scanPdfContent(file: File): Promise<{ safe: boolean; reason?: string }> {
  try {
    const chunkSize = 10 * 1024;
    // Scan beginning, middle, and end of file
    const positions = [
      0,                                                        // Beginning
      Math.max(0, Math.floor(file.size / 2) - chunkSize / 2),  // Middle
      Math.max(0, file.size - chunkSize),                       // End
    ];

    const dangerousPatterns = [
      { pattern: /\/JavaScript/i, reason: 'JavaScript embedded in PDF' },
      { pattern: /\/JS\s/i, reason: 'JavaScript embedded in PDF' },
      { pattern: /\/OpenAction/i, reason: 'Auto-action in PDF' },
      { pattern: /\/AA\s/i, reason: 'Auto-action in PDF' },
      { pattern: /\/EmbeddedFile/i, reason: 'Embedded file in PDF' },
      { pattern: /\/SubmitForm/i, reason: 'Form submission action in PDF' },
      { pattern: /\/Launch/i, reason: 'Launch action in PDF' },
    ];

    for (const pos of positions) {
      const slice = file.slice(pos, pos + chunkSize);
      const text = await slice.text();

      for (const { pattern, reason } of dangerousPatterns) {
        if (pattern.test(text)) {
          return { safe: false, reason };
        }
      }
    }

    return { safe: true };
  } catch {
    // If we can't read it, reject it for safety
    return { safe: false, reason: 'Unable to scan PDF content' };
  }
}

/**
 * Strip metadata from images (EXIF, etc.)
 * Note: This is a basic implementation. For production, use a proper library.
 */
export async function stripImageMetadata(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    // For images, we re-encode to strip metadata
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);

    // Convert back to blob
    const blob = await canvas.convertToBlob({
      type: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
      quality: 0.95,
    });

    return new File([blob], file.name, { type: file.type });
  } catch {
    // If stripping fails, return original
    return file;
  }
}

/**
 * Generate a safe filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators
  let safe = filename.replace(/[/\\]/g, '_');

  // Remove null bytes
  safe = safe.replace(/\x00/g, '');

  // Remove other dangerous characters
  safe = safe.replace(/[<>:"|?*]/g, '_');

  // Limit length
  if (safe.length > 255) {
    const ext = safe.split('.').pop() || '';
    const name = safe.slice(0, 250 - ext.length);
    safe = name + '.' + ext;
  }

  // Ensure it doesn't start with a dot (hidden file)
  if (safe.startsWith('.')) {
    safe = '_' + safe;
  }

  return safe;
}

/**
 * Quick validation for client-side use
 */
export function quickValidate(file: File): { valid: boolean; error?: string } {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  // Check type
  if (!ALLOWED_MIME_TYPES[file.type]) {
    return { valid: false, error: 'סוג קובץ לא נתמך. אנא העלה תמונה או PDF' };
  }

  // Check extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ALLOWED_MIME_TYPES[file.type];
  if (!allowedExts.includes(ext)) {
    return { valid: false, error: 'סיומת קובץ לא תואמת לסוג הקובץ' };
  }

  return { valid: true };
}
