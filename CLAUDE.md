# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shamay SaaS - A comprehensive document processing system for Hebrew real estate documents with AI-powered data extraction using direct PDF and image analysis. The system processes various Hebrew real estate document types through specialized modules, each handling specific document categories with dedicated AI extractors and database clients.

## Development Philosophy

**Claude Code Guidelines:**
- **Plan First:** Always analyze the current codebase structure before making changes
- **Create Deliberately:** Follow existing architectural patterns and conventions  
- **Validate Results:** Test functionality before considering tasks complete
- **Be Patient:** Don't rush to create new files - understand what exists first
- **Ask Questions:** When uncertain about requirements, clarify before implementing

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
├── building-permits/              # Building permit documents (היתר בנייה מילולי)
│   ├── ai-field-extractor.js     # AI extraction for building permits
│   ├── database-client.js        # PostgreSQL operations
│   ├── field-parser.js           # Legacy regex patterns
│   └── index.js                  # Main module orchestration
├── land-registry-management/     # Land registry documents (נסח טאבו)
│   ├── ai-field-extractor.js     # AI extraction for land registry
│   ├── database-client.js        # PostgreSQL operations
│   └── index.js                  # Main module orchestration
├── shared-building-order/        # Shared building orders (צו רישום בית משותף)
│   ├── ai-field-extractor.js     # AI extraction for shared buildings
│   ├── field-parser.js           # Legacy regex patterns
│   └── index.js                  # Main module orchestration
├── comparable-data-management/   # Property comparable data
│   ├── database-client.js        # PostgreSQL operations
│   └── index.js                  # CSV import and management
├── property-assessment/          # Property assessments (שומות שווי)
│   ├── database-client.js        # PostgreSQL operations
│   ├── index.js                  # Main module orchestration
│   └── validator.js              # Input validation
├── images-management/            # Property images and documents
│   ├── database-client.js        # PostgreSQL operations
│   └── index.js                  # Image management
├── garmushka-management/         # Garmushka measurement documents
│   ├── database-client.js        # PostgreSQL operations
│   └── index.js                  # Main module orchestration
├── database/                     # PostgreSQL schema and setup
│   ├── create_land_registry_table.sql
│   ├── create_building_permits_table.sql
│   ├── create_shared_building_order_table.sql
│   ├── create_comparable_data_table.sql
│   ├── create_property_assessment_table.sql
│   ├── create_images_table.sql
│   ├── create_garmushka_table.sql
│   └── comprehensive_schema.sql
├── output/                       # Generated extraction results
├── docs/                         # Documentation
├── test-building-permit-extraction.js  # Working test script
├── package.json                  # Project configuration
└── CLAUDE.md                     # This documentation file
```

## Core Architecture

### Document Processing Pipeline
1. **PDF Input** → Direct AI processing with Anthropic Claude
2. **Hebrew Text Processing** → AI-powered extraction with confidence scores
3. **Field Extraction** → Structured data extraction using Claude Opus model
4. **Database Storage** → Store extracted data in PostgreSQL with confidence scores
5. **Web Display** → Present results through responsive web interface

### Key Components

#### Modular Architecture
Each document type has a dedicated management module with consistent structure:
- **AI Field Extractor** - Anthropic Claude-based extraction with Hebrew expertise
- **Database Client** - PostgreSQL operations with confidence tracking
- **Index Module** - Main orchestration and business logic
- **Optional Components** - Validators, parsers, or specialized utilities

#### Document Types Supported
- **Building Permits** (היתר בנייה מילולי) - Construction permission documents
- **Land Registry** (נסח טאבו) - Property ownership and cadastral information  
- **Shared Building Orders** (צו רישום בית משותף) - Condominium registration documents
- **Property Assessments** (שומות שווי) - User-input property valuation data
- **Comparable Data** - Property sales and market data from CSV imports
- **Images** - Property photos and document images with metadata
- **Garmushka** - Measurement and survey documents

#### AI Processing Features
- Direct PDF processing with Anthropic Claude Opus
- Vision capabilities for scanned documents
- Hebrew text extraction with RTL support
- Structured JSON output with confidence scores
- Cost tracking and token usage monitoring

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