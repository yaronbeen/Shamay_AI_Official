/**
 * PII Redactor - Protects Personally Identifiable Information
 * Specialized for Israeli PII patterns (ID numbers, phone numbers, etc.)
 * Supports Hebrew and English
 */

export interface RedactionResult {
  redactedText: string;
  piiFound: PIIMatch[];
  containsPII: boolean;
}

export interface PIIMatch {
  type: PIIType;
  value: string;
  redactedValue: string;
  position: { start: number; end: number };
}

export type PIIType =
  | 'israeli_id'
  | 'passport'
  | 'credit_card'
  | 'bank_account'
  | 'phone'
  | 'email'
  | 'address'
  | 'name'
  | 'date_of_birth';

// Israeli ID number pattern (9 digits with optional dashes)
const ISRAELI_ID_PATTERN = /\b\d{1,2}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{1}\b|\b\d{9}\b/g;

// Israeli phone patterns
const ISRAELI_PHONE_PATTERNS = [
  /\b0[2-9]\d[-\s]?\d{3}[-\s]?\d{4}\b/g, // Landline: 02-123-4567
  /\b05\d[-\s]?\d{3}[-\s]?\d{4}\b/g,     // Mobile: 052-123-4567
  /\b\+972[-\s]?\d{1,2}[-\s]?\d{3}[-\s]?\d{4}\b/g, // International: +972-52-123-4567
  /\b972[-\s]?\d{1,2}[-\s]?\d{3}[-\s]?\d{4}\b/g,   // Without plus: 972-52-123-4567
];

// Credit card patterns
const CREDIT_CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

// Bank account pattern (Israeli format)
const BANK_ACCOUNT_PATTERN = /\b\d{2,3}[-\s]?\d{3,4}[-\s]?\d{6,9}\b/g;

// Email pattern
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Passport number pattern (Israeli passport)
const PASSPORT_PATTERN = /\b[A-Z]{1,2}\d{7,8}\b/g;

// Date of birth patterns
const DOB_PATTERNS = [
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, // DD/MM/YYYY or DD-MM-YY
  /\b(?:תאריך\s*לידה|ת\.?לידה|נולד\s*ב?)\s*[:.]?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/gi,
];

// Common Hebrew name prefixes to help identify names
const HEBREW_NAME_CONTEXT_PATTERNS = [
  /(?:שם[:\s]+|בעלים?[:\s]+|לקוח[:\s]+|מזמין[:\s]+)([\u0590-\u05FF\s]+)/g,
  /(?:גב'|מר|ד"ר|עו"ד|רו"ח)\s+([\u0590-\u05FF]+\s+[\u0590-\u05FF]+)/g,
];

// Fields that should never be exposed in full
const SENSITIVE_FIELD_NAMES = [
  'תעודת זהות',
  'ת.ז.',
  'ת.ז',
  'מספר זהות',
  'ID',
  'מספר דרכון',
  'passport',
  'כרטיס אשראי',
  'credit card',
  'חשבון בנק',
  'bank account',
  'סיסמה',
  'password',
];

/**
 * Validate Israeli ID number using Luhn-like algorithm
 */
function isValidIsraeliId(id: string): boolean {
  // Remove non-digits
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 9) return false;

  // Israeli ID validation algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(digits[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Validate credit card using Luhn algorithm
 */
function isValidCreditCard(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Redact a value, keeping first and last characters for context
 */
function redactValue(value: string, keepFirst = 2, keepLast = 2): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= keepFirst + keepLast) {
    return '*'.repeat(clean.length);
  }
  const first = clean.substring(0, keepFirst);
  const last = clean.substring(clean.length - keepLast);
  const middle = '*'.repeat(clean.length - keepFirst - keepLast);
  return first + middle + last;
}

/**
 * Redact PII from text
 */
export function redactPII(text: string, options: RedactOptions = {}): RedactionResult {
  const {
    redactIsraeliId = true,
    redactPhone = true,
    redactCreditCard = true,
    redactBankAccount = true,
    redactEmail = true,
    redactPassport = true,
    redactDOB = false, // Usually needed for property records
    validateNumbers = true,
  } = options;

  let redactedText = text;
  const piiFound: PIIMatch[] = [];

  // Redact Israeli ID numbers
  if (redactIsraeliId) {
    const matches = text.matchAll(ISRAELI_ID_PATTERN);
    for (const match of matches) {
      const value = match[0];
      const clean = value.replace(/\D/g, '');

      // Validate if option is set
      if (validateNumbers && !isValidIsraeliId(clean)) continue;

      // Skip if it looks like a gush/parcel number (common in property context)
      if (/\b(גוש|חלקה|מגרש)\s*[:.]?\s*$/.test(text.substring(0, match.index))) continue;

      const redacted = redactValue(value, 2, 2);
      piiFound.push({
        type: 'israeli_id',
        value: clean,
        redactedValue: redacted,
        position: { start: match.index!, end: match.index! + value.length },
      });
      redactedText = redactedText.replace(value, redacted);
    }
  }

  // Redact phone numbers
  if (redactPhone) {
    for (const pattern of ISRAELI_PHONE_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const value = match[0];
        const redacted = redactValue(value, 3, 2);
        piiFound.push({
          type: 'phone',
          value,
          redactedValue: redacted,
          position: { start: match.index!, end: match.index! + value.length },
        });
        redactedText = redactedText.replace(value, redacted);
      }
    }
  }

  // Redact credit cards
  if (redactCreditCard) {
    const matches = text.matchAll(CREDIT_CARD_PATTERN);
    for (const match of matches) {
      const value = match[0];
      const clean = value.replace(/\D/g, '');

      if (validateNumbers && !isValidCreditCard(clean)) continue;

      const redacted = '**** **** **** ' + clean.slice(-4);
      piiFound.push({
        type: 'credit_card',
        value: clean,
        redactedValue: redacted,
        position: { start: match.index!, end: match.index! + value.length },
      });
      redactedText = redactedText.replace(value, redacted);
    }
  }

  // Redact bank accounts
  if (redactBankAccount) {
    const matches = text.matchAll(BANK_ACCOUNT_PATTERN);
    for (const match of matches) {
      const value = match[0];
      // Skip if it might be gush-parcel-subparcel
      if (/\b(גוש|חלקה|רישום)\b/i.test(text.substring(Math.max(0, match.index! - 20), match.index!))) continue;

      const redacted = redactValue(value, 2, 3);
      piiFound.push({
        type: 'bank_account',
        value,
        redactedValue: redacted,
        position: { start: match.index!, end: match.index! + value.length },
      });
      redactedText = redactedText.replace(value, redacted);
    }
  }

  // Redact emails
  if (redactEmail) {
    const matches = text.matchAll(EMAIL_PATTERN);
    for (const match of matches) {
      const value = match[0];
      const [local, domain] = value.split('@');
      const redacted = local.substring(0, 2) + '***@' + domain;
      piiFound.push({
        type: 'email',
        value,
        redactedValue: redacted,
        position: { start: match.index!, end: match.index! + value.length },
      });
      redactedText = redactedText.replace(value, redacted);
    }
  }

  // Redact passport numbers
  if (redactPassport) {
    const matches = text.matchAll(PASSPORT_PATTERN);
    for (const match of matches) {
      const value = match[0];
      const redacted = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
      piiFound.push({
        type: 'passport',
        value,
        redactedValue: redacted,
        position: { start: match.index!, end: match.index! + value.length },
      });
      redactedText = redactedText.replace(value, redacted);
    }
  }

  return {
    redactedText,
    piiFound,
    containsPII: piiFound.length > 0,
  };
}

export interface RedactOptions {
  redactIsraeliId?: boolean;
  redactPhone?: boolean;
  redactCreditCard?: boolean;
  redactBankAccount?: boolean;
  redactEmail?: boolean;
  redactPassport?: boolean;
  redactDOB?: boolean;
  validateNumbers?: boolean;
}

/**
 * Check if text contains PII without redacting
 */
export function containsPII(text: string): boolean {
  const patterns = [
    ISRAELI_ID_PATTERN,
    ...ISRAELI_PHONE_PATTERNS,
    CREDIT_CARD_PATTERN,
    EMAIL_PATTERN,
    PASSPORT_PATTERN,
  ];

  // Reset ALL patterns BEFORE testing to avoid state mutation bugs
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
  }

  for (const pattern of patterns) {
    const result = pattern.test(text);
    pattern.lastIndex = 0; // Reset IMMEDIATELY after each test
    if (result) return true;
  }

  return false;
}

/**
 * Redact PII from context before sending to AI
 * Use this to protect data sent to Claude
 */
export function redactForAI(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'owner_id', 'ownerId', 'id_number', 'idNumber',
    'credit_card', 'creditCard', 'card_number', 'cardNumber',
    'bank_account', 'bankAccount', 'account_number', 'accountNumber',
    'phone', 'mobile', 'telephone', 'טלפון', 'נייד',
    'email', 'אימייל', 'דוא"ל',
    'password', 'סיסמה',
  ];

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      // Redact sensitive fields
      if (typeof value === 'string') {
        redacted[key] = redactValue(value, 2, 2);
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof value === 'string') {
      // Check string values for embedded PII
      const result = redactPII(value);
      redacted[key] = result.redactedText;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects
      redacted[key] = redactForAI(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Create a safe summary of owner info (for display purposes)
 */
export function createSafeOwnerSummary(owner: {
  name?: string;
  idNumber?: string;
  share?: string;
}): string {
  const parts: string[] = [];

  if (owner.name) {
    // Show full name - usually not considered sensitive for property records
    parts.push(owner.name);
  }

  if (owner.idNumber) {
    // Redact ID, show only last 4 digits
    const lastFour = owner.idNumber.replace(/\D/g, '').slice(-4);
    parts.push(`(ת.ז. ****${lastFour})`);
  }

  if (owner.share) {
    parts.push(`- ${owner.share}`);
  }

  return parts.join(' ');
}
