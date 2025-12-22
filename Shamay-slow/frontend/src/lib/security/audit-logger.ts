/**
 * Security Audit Logger - Logs security events and threats
 * Rate limiting and anomaly detection
 */

import type { ThreatDetection } from './input-validator';
import type { FileThreat } from './file-scanner';
import type { PIIMatch } from './pii-redactor';

export interface SecurityEvent {
  timestamp: string;
  sessionId: string;
  eventType: SecurityEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export type SecurityEventType =
  | 'input_validation'
  | 'prompt_injection_attempt'
  | 'file_scan'
  | 'pii_detected'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'blocked_request'
  | 'output_filtered';

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitEntry {
  count: number;
  windowStart: number;
  violations: number;
}

// Rate limit configuration
const RATE_LIMITS = {
  messages_per_minute: 20,
  messages_per_hour: 100,
  file_uploads_per_hour: 50,
  max_violations_before_block: 5,
  violation_window_ms: 60 * 60 * 1000, // 1 hour
};

// Security event log (in-memory, would use proper logging in production)
const securityLog: SecurityEvent[] = [];
const MAX_LOG_SIZE = 10000;

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  securityLog.push(fullEvent);

  // Trim log if too large
  if (securityLog.length > MAX_LOG_SIZE) {
    securityLog.splice(0, securityLog.length - MAX_LOG_SIZE);
  }

  // Console log for critical events
  if (event.severity === 'critical' || event.severity === 'error') {
    console.error('[SECURITY]', JSON.stringify(fullEvent));
  } else if (event.severity === 'warning') {
    console.warn('[SECURITY]', JSON.stringify(fullEvent));
  }
}

/**
 * Log input validation result
 */
export function logInputValidation(
  sessionId: string,
  input: string,
  threats: ThreatDetection[],
  blocked: boolean
): void {
  if (threats.length === 0 && !blocked) return;

  const hasCritical = threats.some(t => t.severity === 'critical');
  const hasHigh = threats.some(t => t.severity === 'high');

  logSecurityEvent({
    sessionId,
    eventType: blocked ? 'blocked_request' : 'input_validation',
    severity: hasCritical ? 'critical' : hasHigh ? 'error' : 'warning',
    details: {
      inputLength: input.length,
      // Don't log actual user input content to prevent PII exposure in logs
      threatCount: threats.length,
      threats: threats.map(t => ({ type: t.type, severity: t.severity, desc: t.description })),
      blocked,
    },
  });

  // Track violations for rate limiting
  if (blocked || hasCritical) {
    trackViolation(sessionId);
  }
}

/**
 * Log prompt injection attempt
 */
export function logPromptInjection(
  sessionId: string,
  input: string,
  patterns: string[]
): void {
  logSecurityEvent({
    sessionId,
    eventType: 'prompt_injection_attempt',
    severity: 'critical',
    details: {
      // Don't log actual user input content to prevent PII exposure in logs
      inputLength: input.length,
      detectedPatterns: patterns,
    },
  });

  trackViolation(sessionId);
}

/**
 * Log file scan result
 */
export function logFileScan(
  sessionId: string,
  fileName: string,
  threats: FileThreat[],
  blocked: boolean
): void {
  if (threats.length === 0) return;

  const hasCritical = threats.some(t => t.severity === 'critical');

  logSecurityEvent({
    sessionId,
    eventType: 'file_scan',
    severity: hasCritical ? 'critical' : 'warning',
    details: {
      fileName,
      threats: threats.map(t => ({ type: t.type, severity: t.severity, desc: t.description })),
      blocked,
    },
  });

  if (blocked) {
    trackViolation(sessionId);
  }
}

/**
 * Log PII detection
 */
export function logPIIDetection(
  sessionId: string,
  context: 'input' | 'output',
  piiFound: PIIMatch[]
): void {
  if (piiFound.length === 0) return;

  logSecurityEvent({
    sessionId,
    eventType: 'pii_detected',
    severity: 'info',
    details: {
      context,
      piiTypes: piiFound.map(p => p.type),
      count: piiFound.length,
    },
  });
}

/**
 * Log output filtering
 */
export function logOutputFiltered(
  sessionId: string,
  redactionCount: number,
  blocked: boolean,
  reason?: string
): void {
  logSecurityEvent({
    sessionId,
    eventType: 'output_filtered',
    severity: blocked ? 'error' : 'info',
    details: {
      redactionCount,
      blocked,
      reason,
    },
  });
}

/**
 * Track a security violation for a session
 */
function trackViolation(sessionId: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId) || {
    count: 0,
    windowStart: now,
    violations: 0,
  };

  // Reset if window expired
  if (now - entry.windowStart > RATE_LIMITS.violation_window_ms) {
    entry.violations = 0;
    entry.windowStart = now;
  }

  entry.violations++;
  rateLimitStore.set(sessionId, entry);

  if (entry.violations >= RATE_LIMITS.max_violations_before_block) {
    logSecurityEvent({
      sessionId,
      eventType: 'suspicious_activity',
      severity: 'critical',
      details: {
        violations: entry.violations,
        message: 'Session flagged for excessive security violations',
      },
    });
  }
}

/**
 * Check if session should be blocked due to violations
 */
export function isSessionBlocked(sessionId: string): boolean {
  const entry = rateLimitStore.get(sessionId);
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.windowStart > RATE_LIMITS.violation_window_ms) {
    // Window expired, reset
    rateLimitStore.delete(sessionId);
    return false;
  }

  return entry.violations >= RATE_LIMITS.max_violations_before_block;
}

/**
 * Check rate limit for a session (and optionally by IP)
 */
export function checkRateLimit(
  sessionId: string,
  type: 'message' | 'file_upload' = 'message',
  clientIp?: string
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  const limit = type === 'message'
    ? RATE_LIMITS.messages_per_minute
    : RATE_LIMITS.file_uploads_per_hour;

  const windowMs = type === 'message' ? 60 * 1000 : 60 * 60 * 1000;

  // Check session-based rate limit
  const sessionKey = `${sessionId}:${type}`;
  const sessionResult = checkSingleRateLimit(sessionKey, limit, windowMs, now);
  if (!sessionResult.allowed) {
    logSecurityEvent({
      sessionId,
      eventType: 'rate_limit_exceeded',
      severity: 'warning',
      details: { type, scope: 'session', retryAfter: sessionResult.retryAfter },
    });
    return sessionResult;
  }

  // Check IP-based rate limit (stricter: 3x per-session limit per IP)
  if (clientIp && clientIp !== 'unknown') {
    const ipKey = `ip:${clientIp}:${type}`;
    const ipLimit = limit * 3;
    const ipResult = checkSingleRateLimit(ipKey, ipLimit, windowMs, now);
    if (!ipResult.allowed) {
      logSecurityEvent({
        sessionId,
        eventType: 'rate_limit_exceeded',
        severity: 'warning',
        details: { type, scope: 'ip', clientIp, retryAfter: ipResult.retryAfter },
      });
      return ipResult;
    }
  }

  return { allowed: true };
}

/**
 * Helper to check a single rate limit key
 */
function checkSingleRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): { allowed: boolean; retryAfter?: number } {
  const entry = rateLimitStore.get(key) || {
    count: 0,
    windowStart: now,
    violations: 0,
  };

  // Reset if window expired
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Get security events for a session
 */
export function getSessionSecurityEvents(
  sessionId: string,
  since?: Date
): SecurityEvent[] {
  return securityLog.filter(event => {
    if (event.sessionId !== sessionId) return false;
    if (since && new Date(event.timestamp) < since) return false;
    return true;
  });
}

/**
 * Get security summary for a session
 */
export function getSecuritySummary(sessionId: string): {
  totalEvents: number;
  criticalCount: number;
  warningCount: number;
  isBlocked: boolean;
  violations: number;
} {
  const events = getSessionSecurityEvents(sessionId);
  const entry = rateLimitStore.get(sessionId);

  return {
    totalEvents: events.length,
    criticalCount: events.filter(e => e.severity === 'critical').length,
    warningCount: events.filter(e => e.severity === 'warning').length,
    isBlocked: isSessionBlocked(sessionId),
    violations: entry?.violations || 0,
  };
}

/**
 * Clear rate limit data for a session (use carefully)
 */
export function clearSessionRateLimits(sessionId: string): void {
  const keysToDelete: string[] = [];
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(sessionId)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Export security log for analysis
 */
export function exportSecurityLog(
  startDate?: Date,
  endDate?: Date
): SecurityEvent[] {
  return securityLog.filter(event => {
    const eventDate = new Date(event.timestamp);
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    return true;
  });
}
