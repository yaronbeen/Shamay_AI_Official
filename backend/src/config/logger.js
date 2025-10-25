// Winston logger configuration
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Determine if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || !fs.existsSync('/tmp');
const isProduction = process.env.NODE_ENV === 'production';

// Create transports array
const transports = [];

// In serverless or production, ONLY log to console
if (isServerless || isProduction) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
} else {
  // In local development, log to files AND console
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  transports.push(
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'shamay-backend' },
  transports,
});

module.exports = logger;

