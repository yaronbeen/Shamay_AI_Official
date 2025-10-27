// SHAMAY.AI Express Backend Server
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import logger from './config/logger.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Initialize server as async function
async function createServer() {
  const app = express();

  // ============================================
  // MIDDLEWARE
  // ============================================

  // Trust proxy - REQUIRED for Vercel/serverless environments
  app.set('trust proxy', 1);

  // Security
  app.use(helmet());

  // CORS - Allow frontend to make requests
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Compression
  app.use(compression());

  // HTTP request logging
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // ============================================
  // ROUTES
  // ============================================

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // API routes - Import dynamically for ES modules
  const apiRoutes = await Promise.all([
    import('./routes/valuations.js'),
    import('./routes/sessions.js'),
    import('./routes/files.js'),
    import('./routes/ai.js'),
    import('./routes/gis.js'),
    import('./routes/gis-screenshot.js'),
    import('./routes/garmushka.js'),
    import('./routes/export.js')
  ]);

  app.use('/api/valuations', apiRoutes[0].default);
  app.use('/api/sessions', apiRoutes[1].default);
  app.use('/api/files', apiRoutes[2].default);
  app.use('/api/ai', apiRoutes[3].default);
  app.use('/api/gis', apiRoutes[4].default);
  app.use('/api/gis-screenshot', apiRoutes[5].default);
  app.use('/api/garmushka', apiRoutes[6].default);
  app.use('/api/export', apiRoutes[7].default);

  // Static file serving for uploads
  app.use('/uploads', express.static('uploads'));

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.url}`,
      path: req.url
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    });

    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // ============================================
  // START SERVER
  // ============================================

  // Only listen if not in Vercel (serverless) environment
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ============================================');
      console.log('🚀 SHAMAY.AI Backend Server');
      console.log('🚀 ============================================');
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Server running on: http://localhost:${PORT}`);
      console.log(`🚀 Health check: http://localhost:${PORT}/health`);
      console.log(`🚀 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log('🚀 ============================================');
      console.log('');
    });
  }

  // Graceful shutdown (only in non-serverless environment)
  if (process.env.VERCEL !== '1') {
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      app.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  }

  return app;
}

// Create and export the server
const app = await createServer();
export default app;
