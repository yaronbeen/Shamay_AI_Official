import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Import our comprehensive extraction functions
import { processAndSave, validateExtraction } from './src/lib/document-processor.js';
import { DatabaseClient } from './src/lib/database-client.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));


// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/results/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// Upload and process document using comprehensive extraction
app.post('/api/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'לא הועלה קובץ PDF' 
            });
        }

        console.log(`Processing uploaded file: ${req.file.filename}`);
        
        // Process the document using our comprehensive extraction system
        const { result, outputPath, databaseId } = await processAndSave(req.file.path, 'output', true);
        
        // Validate the extraction
        const validation = validateExtraction(result);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        console.log(`Document processed successfully with ID: ${databaseId}`);
        console.log(`Overall confidence: ${(result.confidence_scores?.overall * 100 || 0).toFixed(1)}%`);
        
        res.json({
            success: true,
            message: 'המסמך עובד בהצלחה',
            data: {
                id: databaseId,
                filename: req.file.originalname,
                extractionData: result,
                validation: validation,
                outputPath: outputPath
            }
        });
        
    } catch (error) {
        console.error('Upload processing error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'שגיאה בעיבוד המסמך: ' + error.message
        });
    }
});

// Get extraction results by ID
app.get('/api/results/:id', async (req, res) => {
    try {
        const db = new DatabaseClient();
        const result = await db.getExtractionById(parseInt(req.params.id));
        await db.disconnect();
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'תוצאות לא נמצאו'
            });
        }
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת התוצאות'
        });
    }
});

// Get recent extractions
app.get('/api/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const db = new DatabaseClient();
        const results = await db.getRecentExtractions(limit);
        await db.disconnect();
        
        res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('Get recent extractions error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת העיבודים האחרונים'
        });
    }
});

// Get property summary
app.get('/api/summary', async (req, res) => {
    try {
        const db = new DatabaseClient();
        const summary = await db.getPropertySummary();
        await db.disconnect();
        
        res.json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הסיכום'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Shamay Land Registry Server running on http://localhost:${PORT}`);
    console.log(`📄 Upload interface: http://localhost:${PORT}`);
    console.log(`🔗 API endpoints available at /api/*`);
    console.log(`💾 Using comprehensive extraction with Anthropic AI`);
});