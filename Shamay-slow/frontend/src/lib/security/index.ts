/**
 * Security Module - Main entry point
 * Provides unified security layer for the chat system
 */

export * from './input-validator';
export * from './output-filter';
export * from './file-scanner';
export * from './pii-redactor';
export * from './audit-logger';

import { validateInput, calculateRiskScore, type ValidationResult } from './input-validator';
import { filterOutput, addDefensiveSuffix, stripMarkdown, type FilterResult } from './output-filter';
import { scanFile, quickValidate, sanitizeFilename, type ScanResult } from './file-scanner';
import { redactPII, redactForAI, containsPII, type RedactionResult } from './pii-redactor';
import {
  logInputValidation,
  logPromptInjection,
  logFileScan,
  logPIIDetection,
  logOutputFiltered,
  checkRateLimit,
  isSessionBlocked,
  getSecuritySummary,
} from './audit-logger';

/**
 * Security check result for chat messages
 */
export interface SecurityCheckResult {
  allowed: boolean;
  sanitizedMessage: string;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
  riskScore: number;
}

/**
 * Perform full security check on user input
 */
export function securityCheckInput(
  message: string,
  sessionId: string
): SecurityCheckResult {
  const warnings: string[] = [];

  // Check if session is blocked due to previous violations
  if (isSessionBlocked(sessionId)) {
    return {
      allowed: false,
      sanitizedMessage: '',
      warnings: ['Session blocked due to security violations'],
      blocked: true,
      blockReason: 'הפעילות שלך נחסמה זמנית עקב פעילות חשודה. נסה שוב מאוחר יותר.',
      riskScore: 100,
    };
  }

  // Check rate limit
  const rateCheck = checkRateLimit(sessionId, 'message');
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      sanitizedMessage: '',
      warnings: ['Rate limit exceeded'],
      blocked: true,
      blockReason: `יותר מדי הודעות. נסה שוב בעוד ${rateCheck.retryAfter} שניות.`,
      riskScore: 50,
    };
  }

  // Validate input
  const validation = validateInput(message, sessionId);

  // Log security events
  if (validation.threats.length > 0) {
    logInputValidation(sessionId, message, validation.threats, validation.blocked);

    // Check for prompt injection specifically
    const injectionThreats = validation.threats.filter(t => t.type === 'prompt_injection');
    if (injectionThreats.length > 0) {
      logPromptInjection(sessionId, message, injectionThreats.map(t => t.pattern));
    }
  }

  // Add warnings for non-critical threats
  for (const threat of validation.threats) {
    if (threat.severity === 'medium' || threat.severity === 'low') {
      warnings.push(threat.description);
    }
  }

  // Calculate risk score
  const riskScore = calculateRiskScore(message);

  // Check for PII in input (for logging purposes)
  const piiResult = redactPII(message);
  if (piiResult.containsPII) {
    logPIIDetection(sessionId, 'input', piiResult.piiFound);
    warnings.push('המסר מכיל מידע אישי שעשוי להישמר');
  }

  return {
    allowed: !validation.blocked,
    sanitizedMessage: validation.sanitizedInput,
    warnings,
    blocked: validation.blocked,
    blockReason: validation.blockReason,
    riskScore,
  };
}

/**
 * Perform security check on AI output
 */
export function securityCheckOutput(
  output: string,
  sessionId: string
): FilterResult & { strippedMarkdown: string } {
  // Filter output
  const filtered = filterOutput(output);

  // Strip markdown
  const strippedMarkdown = stripMarkdown(filtered.filteredOutput);

  // Log if filtered
  if (filtered.wasFiltered || filtered.blocked) {
    logOutputFiltered(
      sessionId,
      filtered.redactions.length,
      filtered.blocked,
      filtered.blockReason
    );
  }

  // Check for PII in output
  const piiResult = redactPII(strippedMarkdown);
  if (piiResult.containsPII) {
    logPIIDetection(sessionId, 'output', piiResult.piiFound);
  }

  return {
    ...filtered,
    filteredOutput: piiResult.redactedText, // Apply PII redaction
    strippedMarkdown: piiResult.redactedText,
  };
}

/**
 * Perform security check on file upload
 */
export async function securityCheckFile(
  file: File,
  sessionId: string
): Promise<ScanResult & { sanitizedName: string }> {
  // Quick validation first
  const quickCheck = quickValidate(file);
  if (!quickCheck.valid) {
    return {
      isValid: false,
      isSafe: false,
      threats: [{
        type: 'invalid_type',
        severity: 'high',
        description: quickCheck.error || 'Invalid file',
      }],
      blockReason: quickCheck.error,
      sanitizedName: sanitizeFilename(file.name),
    };
  }

  // Check rate limit for file uploads
  const rateCheck = checkRateLimit(sessionId, 'file_upload');
  if (!rateCheck.allowed) {
    return {
      isValid: false,
      isSafe: false,
      threats: [{
        type: 'size_exceeded',
        severity: 'medium',
        description: 'Rate limit exceeded for file uploads',
      }],
      blockReason: `יותר מדי קבצים. נסה שוב בעוד ${rateCheck.retryAfter} שניות.`,
      sanitizedName: sanitizeFilename(file.name),
    };
  }

  // Full scan
  const scanResult = await scanFile(file);

  // Log results
  if (scanResult.threats.length > 0) {
    logFileScan(sessionId, file.name, scanResult.threats, !scanResult.isValid);
  }

  return {
    ...scanResult,
    sanitizedName: sanitizeFilename(file.name),
  };
}

/**
 * Enhance system prompt with security measures
 */
export function enhanceSystemPrompt(basePrompt: string): string {
  return addDefensiveSuffix(basePrompt);
}

/**
 * Prepare session data for AI context (with PII redaction)
 */
export function prepareSecureContext(
  sessionData: Record<string, unknown>
): Record<string, unknown> {
  return redactForAI(sessionData);
}

/**
 * Get security status for a session
 */
export function getSessionSecurityStatus(sessionId: string) {
  return getSecuritySummary(sessionId);
}
