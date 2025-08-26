# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shamay SaaS - A comprehensive document processing system for Hebrew real estate documents with AI-powered data extraction using direct PDF and image analysis.

## Common Development Commands

- **Install dependencies**: `npm install`
- **Start web application**: `npm run webapp` (http://localhost:3000)
- **Test field extraction**: `npm test`
- **Run examples**: `npm run example`
- **Test reliability**: `node tests/test-field-reliability.js`
- **Database setup**: `sudo -u postgres psql -f database/create_land_registry_table.sql`
- **Connect to database**: `sudo -u postgres psql -d shamay_land_registry`

## Project Structure

```
shamay-slow/
├── src/
│   ├── lib/              # Core libraries
│   │   ├── pdf-to-markdown.js      # PDF processing and conversion
│   │   ├── field-extractors.js    # Specialized field extraction
│   │   └── openai_client.js       # AI integration
│   ├── utils/            # Utility functions
│   └── examples/         # Usage examples and demos
├── tests/               # Test files and reliability checks
├── docs/                # Documentation
├── output/              # Generated markdown files (authoritative source)
├── database/            # PostgreSQL schema and setup
│   ├── create_land_registry_table.sql
│   └── add_owner_fields.sql
├── public/              # Web application frontend
│   ├── index.html       # Document upload interface
│   └── results.html     # Extraction results display
├── uploads/             # Temporary file uploads
├── temp/                # Temporary processing files
├── server.js            # Express web application server
└── node_modules/        # Dependencies
```

## Core Architecture

### Document Processing Pipeline
1. **PDF Input** → Direct AI processing with Anthropic Claude
2. **Hebrew Text Processing** → AI-powered extraction with confidence scores
3. **Field Extraction** → Structured data extraction using Claude Opus model
4. **Database Storage** → Store extracted data in PostgreSQL with confidence scores
5. **Web Display** → Present results through responsive web interface

### Key Components

#### Field Extractors (`src/lib/field-extractors.js`)
- `extractGush()` - Block number extraction
- `extractChelka()` - Plot number extraction  
- `extractSubChelka()` - Sub-plot extraction
- `extractApartmentArea()` - Apartment area parsing
- `extractAttachments()` - Parking, balcony detection
- `extractOwners()` - Property owners with names, IDs, and ownership shares
- `extractAllFields()` - Comprehensive analysis with confidence scores

#### PDF Processing 
- Direct PDF processing with Anthropic Claude API
- Vision capabilities for scanned documents
- Hebrew text extraction with AI
- Structured JSON output with confidence scores

## Hebrew Text Handling

- RTL text direction support
- Common OCR error corrections
- Pattern matching for legal document formats
- Context-aware field extraction

## Testing and Reliability

- Individual field extraction tests
- Confidence scoring system
- Context validation for extracted data
- Overall reliability assessment (current: 82.5%)

## Database Integration

### PostgreSQL Schema
- **Table**: `land_registry_extracts` - stores all extracted field data
- **Core Fields**: gush, chelka, sub_chelka, apartment_area
- **Complex Data**: attachments (JSONB), owners (JSONB)
- **Owner Data**: Hebrew/English names, ID numbers, ownership shares, count
- **Confidence tracking**: per-field confidence scores and contexts
- **Metadata**: processing timestamps, document filenames, raw text
- **Views**: `property_owners`, `individual_owners` for easy querying

### Database Connection
- **Host**: localhost:5432
- **Database**: shamay_land_registry  
- **User**: postgres
- **Password**: postgres123 (development)

## Best Practices

### Data Extraction Priority
1. **Direct PDF processing** with Anthropic Claude API
2. **Extract structured data** with confidence scores
3. **Store in database** with full extraction metadata
4. **Always validate** against confidence thresholds

### Development Notes

- AI-powered Hebrew text extraction using Claude Opus
- Field extraction includes confidence metrics
- Direct PDF processing without intermediate conversions
- Comprehensive error handling with AI fallbacks
- **Primary method**: Anthropic Claude API for all extractions
- **Database stores**: complete extraction history with confidence tracking