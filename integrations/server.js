import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Store session data (in production, use Redis or database)
const sessions = new Map();

// API Routes
app.post('/api/session', (req, res) => {
  const sessionId = Date.now().toString();
  sessions.set(sessionId, {
    step: 1,
    data: {},
    documents: {},
    calculations: {}
  });
  res.json({ sessionId });
});

app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.put('/api/session/:sessionId/step/:step', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.step = parseInt(req.params.step);
  session.data = { ...session.data, ...req.body };
  
  sessions.set(req.params.sessionId, session);
  res.json(session);
});

app.post('/api/session/:sessionId/upload', upload.array('documents'), (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const uploadedFiles = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    size: file.size,
    type: file.mimetype
  }));
  
  session.documents = { ...session.documents, ...req.body, files: uploadedFiles };
  sessions.set(req.params.sessionId, session);
  
  res.json({ success: true, files: uploadedFiles });
});

app.post('/api/session/:sessionId/calculate', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Mock calculation logic - replace with your actual calculation modules
  const { comparableData, propertyData } = req.body;
  
  // Calculate average from comparable data
  const validComparables = comparableData.filter(item => item.include);
  const average = validComparables.length > 0 
    ? validComparables.reduce((sum, item) => sum + parseFloat(item.pricePerSqm), 0) / validComparables.length
    : 0;
  
  // Calculate final value
  const builtArea = parseFloat(propertyData.builtArea) || 0;
  const balconyArea = parseFloat(propertyData.balconyArea) || 0;
  const equivalentArea = builtArea + (balconyArea * 0.5);
  const finalValue = equivalentArea * average;
  
  session.calculations = {
    average,
    equivalentArea,
    finalValue: Math.round(finalValue),
    finalValueText: numberToHebrewText(Math.round(finalValue))
  };
  
  sessions.set(req.params.sessionId, session);
  res.json(session.calculations);
});

app.get('/api/session/:sessionId/export', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Generate PDF report (mock implementation)
  const reportData = generateReportData(session);
  res.json({ success: true, reportData });
});

// Helper function to convert numbers to Hebrew text
function numberToHebrewText(num) {
  const ones = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה'];
  const tens = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
  const hundreds = ['', 'מאה', 'מאתיים', 'שלוש מאות', 'ארבע מאות', 'חמש מאות', 'שש מאות', 'שבע מאות', 'שמונה מאות', 'תשע מאות'];
  
  if (num === 0) return 'אפס';
  if (num < 10) return ones[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ו' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return hundreds[hundred] + (remainder > 0 ? ' ו' + numberToHebrewText(remainder) : '');
  }
  
  // For larger numbers, return a simplified version
  return num.toLocaleString('he-IL') + ' שקלים';
}

function generateReportData(session) {
  return {
    title: 'הערכת שווי זכויות נדל"ן',
    address: session.data.address || '[כתובת]',
    clientName: session.data.clientName || '[מבקש השומה]',
    reportDate: new Date().toLocaleDateString('he-IL'),
    propertyDetails: session.data,
    calculations: session.calculations,
    documents: session.documents
  };
}

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SHAMAY.AI server running on http://localhost:${PORT}`);
  console.log(`📊 Web interface available at http://localhost:${PORT}`);
});
