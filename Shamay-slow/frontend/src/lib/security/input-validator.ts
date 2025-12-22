/**
 * Input Validator - Security layer for user input
 * Detects prompt injection, malicious patterns, and validates input
 * Supports Hebrew and English
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedInput: string;
  threats: ThreatDetection[];
  blocked: boolean;
  blockReason?: string;
}

export interface ThreatDetection {
  type: 'prompt_injection' | 'jailbreak' | 'data_extraction' | 'xss' | 'command_injection' | 'excessive_length';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
}

// Prompt injection patterns - English
const ENGLISH_INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i, severity: 'critical' as const, desc: 'Ignore instructions attempt' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|rules?|guidelines?)/i, severity: 'critical' as const, desc: 'Disregard instructions attempt' },
  { pattern: /forget\s+(everything|all|your)\s+(you|instructions?|rules?)/i, severity: 'critical' as const, desc: 'Forget instructions attempt' },
  { pattern: /you\s+are\s+now\s+(a|an|the)/i, severity: 'high' as const, desc: 'Role override attempt' },
  { pattern: /pretend\s+(you\s+are|to\s+be)/i, severity: 'high' as const, desc: 'Pretend role attempt' },
  { pattern: /act\s+as\s+(if|a|an|the)/i, severity: 'medium' as const, desc: 'Act as attempt' },
  { pattern: /new\s+(instruction|rule|prompt|persona)/i, severity: 'high' as const, desc: 'New instruction injection' },
  { pattern: /system\s*prompt/i, severity: 'critical' as const, desc: 'System prompt access attempt' },
  { pattern: /reveal\s+(your|the)\s+(instructions?|prompts?|rules?|system)/i, severity: 'critical' as const, desc: 'Reveal instructions attempt' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?)/i, severity: 'high' as const, desc: 'Query instructions attempt' },
  { pattern: /bypass\s+(security|filter|restriction|rule)/i, severity: 'critical' as const, desc: 'Bypass security attempt' },
  { pattern: /jailbreak/i, severity: 'critical' as const, desc: 'Jailbreak keyword' },
  { pattern: /DAN\s*mode/i, severity: 'critical' as const, desc: 'DAN mode attempt' },
  { pattern: /developer\s+mode/i, severity: 'high' as const, desc: 'Developer mode attempt' },
  { pattern: /admin(istrator)?\s+mode/i, severity: 'high' as const, desc: 'Admin mode attempt' },
  { pattern: /override\s+(all\s+)?(restrictions?|limitations?|rules?)/i, severity: 'critical' as const, desc: 'Override restrictions attempt' },
  { pattern: /execute\s+(code|command|script)/i, severity: 'critical' as const, desc: 'Code execution attempt' },
  { pattern: /\]\s*\}\s*[;,]?\s*\{/i, severity: 'medium' as const, desc: 'JSON injection attempt' },
];

// Prompt injection patterns - Hebrew
const HEBREW_INJECTION_PATTERNS = [
  { pattern: /התעלם\s+(מכל\s+)?ה?(הוראות|הנחיות|כללים)/i, severity: 'critical' as const, desc: 'התעלמות מהוראות' },
  { pattern: /שכח\s+(את\s+)?(כל\s+)?(ההוראות|ההנחיות|הכללים)/i, severity: 'critical' as const, desc: 'שכחת הוראות' },
  { pattern: /אתה\s+עכשיו/i, severity: 'high' as const, desc: 'שינוי תפקיד' },
  { pattern: /התנהג\s+כ(אילו|מו)/i, severity: 'medium' as const, desc: 'התנהגות כמו' },
  { pattern: /העמד\s+פנים/i, severity: 'high' as const, desc: 'העמדת פנים' },
  { pattern: /הוראה\s+חדשה/i, severity: 'high' as const, desc: 'הוראה חדשה' },
  { pattern: /חשוף\s+(את\s+)?(ההוראות|ההנחיות|המערכת)/i, severity: 'critical' as const, desc: 'חשיפת הוראות' },
  { pattern: /מה\s+(הן\s+)?ה(הוראות|הנחיות)\s+שלך/i, severity: 'high' as const, desc: 'שאילתת הוראות' },
  { pattern: /עקוף\s+(את\s+)?(האבטחה|ההגבלות|הכללים)/i, severity: 'critical' as const, desc: 'עקיפת אבטחה' },
  { pattern: /מצב\s+(מפתח|אדמין|ניהול)/i, severity: 'high' as const, desc: 'מצב מיוחד' },
  { pattern: /בטל\s+(את\s+)?(כל\s+)?(ההגבלות|הכללים)/i, severity: 'critical' as const, desc: 'ביטול הגבלות' },
  { pattern: /הרץ\s+(קוד|פקודה|סקריפט)/i, severity: 'critical' as const, desc: 'הרצת קוד' },
  { pattern: /תן\s+לי\s+(את\s+)?כל\s+המידע/i, severity: 'medium' as const, desc: 'בקשת כל המידע' },
  { pattern: /הצג\s+(את\s+)?הפרומפט/i, severity: 'critical' as const, desc: 'הצגת פרומפט' },
];

// Data extraction patterns
const DATA_EXTRACTION_PATTERNS = [
  { pattern: /show\s+me\s+(all\s+)?(users?|data|records|information)/i, severity: 'medium' as const, desc: 'Data extraction attempt' },
  { pattern: /list\s+(all\s+)?(users?|sessions?|data)/i, severity: 'medium' as const, desc: 'List data attempt' },
  { pattern: /הצג\s+(את\s+)?(כל\s+)?(המשתמשים|הנתונים|המידע)/i, severity: 'medium' as const, desc: 'בקשת נתונים' },
  { pattern: /תראה\s+לי\s+(את\s+)?(כל\s+)?ה(משתמשים|נתונים)/i, severity: 'medium' as const, desc: 'הצגת נתונים' },
  { pattern: /database|sql|query/i, severity: 'high' as const, desc: 'Database access attempt' },
  { pattern: /password|סיסמ[אה]/i, severity: 'high' as const, desc: 'Password access attempt' },
  { pattern: /api[_\s]?key/i, severity: 'critical' as const, desc: 'API key access attempt' },
  { pattern: /secret|token|credential/i, severity: 'high' as const, desc: 'Credential access attempt' },
];

// XSS and injection patterns
const XSS_PATTERNS = [
  { pattern: /<script[\s>]/i, severity: 'critical' as const, desc: 'Script tag injection' },
  { pattern: /javascript:/i, severity: 'critical' as const, desc: 'JavaScript protocol' },
  { pattern: /on(error|load|click|mouse|key|focus|blur)\s*=/i, severity: 'high' as const, desc: 'Event handler injection' },
  { pattern: /<iframe/i, severity: 'high' as const, desc: 'Iframe injection' },
  { pattern: /<object/i, severity: 'high' as const, desc: 'Object tag injection' },
  { pattern: /<embed/i, severity: 'high' as const, desc: 'Embed tag injection' },
  { pattern: /eval\s*\(/i, severity: 'critical' as const, desc: 'Eval function' },
  { pattern: /document\.(cookie|location|write)/i, severity: 'critical' as const, desc: 'Document manipulation' },
  { pattern: /window\.(location|open)/i, severity: 'high' as const, desc: 'Window manipulation' },
];

// Configuration
const MAX_INPUT_LENGTH = 10000; // 10KB max
const MAX_CONSECUTIVE_SPECIAL_CHARS = 50;

/**
 * Find excessive consecutive special characters using linear-time iteration
 * Prevents ReDoS vulnerability from regex-based approach
 */
function findExcessiveSpecialChars(input: string, threshold: number = 20): string | null {
  let consecutiveCount = 0;
  let startIndex = -1;
  const allowedCharRegex = /[\w\s\u0590-\u05FF]/;

  for (let i = 0; i < input.length; i++) {
    const isAllowed = allowedCharRegex.test(input[i]);

    if (!isAllowed) {
      if (consecutiveCount === 0) startIndex = i;
      consecutiveCount++;
      if (consecutiveCount >= threshold) {
        return input.substring(startIndex, startIndex + Math.min(50, consecutiveCount));
      }
    } else {
      consecutiveCount = 0;
    }
  }
  return null;
}

/**
 * Validate and sanitize user input
 */
export function validateInput(input: string, sessionId?: string): ValidationResult {
  const threats: ThreatDetection[] = [];
  let sanitizedInput = input;
  let blocked = false;
  let blockReason: string | undefined;

  // Check length
  if (input.length > MAX_INPUT_LENGTH) {
    threats.push({
      type: 'excessive_length',
      severity: 'medium',
      pattern: `Length: ${input.length}`,
      description: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
    });
    sanitizedInput = input.substring(0, MAX_INPUT_LENGTH);
  }

  // Check for excessive special characters (potential obfuscation)
  // Use iterative approach instead of regex to prevent ReDoS
  const specialCharResult = findExcessiveSpecialChars(input, 20);
  if (specialCharResult) {
    threats.push({
      type: 'command_injection',
      severity: 'medium',
      pattern: specialCharResult.substring(0, 50),
      description: 'Excessive special characters detected',
    });
  }

  // Check English injection patterns
  for (const { pattern, severity, desc } of ENGLISH_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: 'prompt_injection',
        severity,
        pattern: input.match(pattern)?.[0] || '',
        description: desc,
      });
      if (severity === 'critical') {
        blocked = true;
        blockReason = `Blocked: ${desc}`;
      }
    }
  }

  // Check Hebrew injection patterns
  for (const { pattern, severity, desc } of HEBREW_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: 'prompt_injection',
        severity,
        pattern: input.match(pattern)?.[0] || '',
        description: desc,
      });
      if (severity === 'critical') {
        blocked = true;
        blockReason = `נחסם: ${desc}`;
      }
    }
  }

  // Check data extraction patterns
  for (const { pattern, severity, desc } of DATA_EXTRACTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: 'data_extraction',
        severity,
        pattern: input.match(pattern)?.[0] || '',
        description: desc,
      });
      if (severity === 'critical') {
        blocked = true;
        blockReason = `Blocked: ${desc}`;
      }
    }
  }

  // Check XSS patterns
  for (const { pattern, severity, desc } of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push({
        type: 'xss',
        severity,
        pattern: input.match(pattern)?.[0] || '',
        description: desc,
      });
      // Always sanitize XSS, block critical
      sanitizedInput = sanitizedInput.replace(pattern, '[REMOVED]');
      if (severity === 'critical') {
        blocked = true;
        blockReason = `Blocked: ${desc}`;
      }
    }
  }

  // Sanitize HTML entities
  sanitizedInput = sanitizeHtml(sanitizedInput);

  return {
    isValid: threats.filter(t => t.severity === 'critical' || t.severity === 'high').length === 0,
    sanitizedInput,
    threats,
    blocked,
    blockReason,
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * @deprecated SECURITY WARNING: This function reverses XSS protections.
 * Only use in server-side contexts where content has been verified safe.
 * NEVER use with user-controlled data in browser context.
 * @internal
 */
export function decodeHtml(input: string): string {
  // Block usage in browser context
  if (typeof window !== 'undefined') {
    console.error('[SECURITY] decodeHtml should not be called in browser context');
    return input; // Return encoded version for safety
  }

  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Check if input contains potential prompt injection without blocking
 * Returns a risk score 0-100
 */
export function calculateRiskScore(input: string): number {
  let score = 0;
  const allPatterns = [
    ...ENGLISH_INJECTION_PATTERNS,
    ...HEBREW_INJECTION_PATTERNS,
    ...DATA_EXTRACTION_PATTERNS,
    ...XSS_PATTERNS,
  ];

  for (const { pattern, severity } of allPatterns) {
    if (pattern.test(input)) {
      switch (severity) {
        case 'critical': score += 40; break;
        case 'high': score += 25; break;
        case 'medium': score += 10; break;
        case 'low': score += 5; break;
      }
    }
  }

  // Cap at 100
  return Math.min(score, 100);
}
