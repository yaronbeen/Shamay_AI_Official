# 🏗️ SHAMAY.AI DATABASE ARCHITECTURE

## 📊 **OVERVIEW**

This document outlines the complete database architecture for Shamay.AI, integrating authentication, session management, valuation workflows, and existing business data.

## 🎯 **ARCHITECTURE PRINCIPLES**

### **1. Hybrid Approach**
- **Session System**: Fast, in-memory for wizard interactions
- **Database Persistence**: PostgreSQL for long-term storage
- **Seamless Integration**: Automatic sync between session and database

### **2. Multi-Tenant Architecture**
- **Organization-Based Isolation**: Each organization has isolated data
- **Role-Based Access Control**: Different permissions per user role
- **Audit Trail**: Complete activity logging for compliance

### **3. Scalable Design**
- **JSONB Storage**: Flexible schema for complex data
- **Optimized Indexes**: Fast queries on large datasets
- **Event-Driven**: Outbox pattern for async processing

## 🗄️ **DATABASE STRUCTURE**

### **CORE AUTHENTICATION SYSTEM**

```sql
-- Organizations (Multi-tenant isolation)
organizations
├── id (TEXT, Primary Key)
├── name (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Users (Authentication)
users
├── id (TEXT, Primary Key)
├── email (TEXT, Unique)
├── name (TEXT)
├── image (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Memberships (User-Organization relationships)
memberships
├── id (TEXT, Primary Key)
├── user_id (TEXT, Foreign Key → users.id)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── role (ENUM: OWNER, ORG_ADMIN, APPRAISER, CLIENT_VIEWER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### **VALUATION SYSTEM**

```sql
-- Main Valuations Table
valuations
├── id (TEXT, Primary Key)
├── title (TEXT)
├── status (ENUM: DRAFT, IN_PROGRESS, READY, SIGNED, ARCHIVED)
├── address_full (TEXT)
├── block (TEXT) -- גוש
├── parcel (TEXT) -- חלקה
├── subparcel (TEXT) -- תת
├── meta (JSONB) -- Additional metadata
├── created_by_id (TEXT, Foreign Key → users.id)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Wizard Step Data (JSONB)
├── step1_data (JSONB) -- Initial data
├── step2_data (JSONB) -- Documents
├── step3_data (JSONB) -- Validation
├── step4_data (JSONB) -- AI Analysis
└── step5_data (JSONB) -- Export

-- GIS Data (JSONB)
├── gis_screenshots (JSONB) -- Map screenshots with annotations
└── gis_analysis (JSONB) -- GIS analysis results

-- Garmushka Data (JSONB)
├── garmushka_measurements (JSONB) -- Measurement data
└── garmushka_images (JSONB) -- Garmushka images

-- Final Results
├── final_valuation (DECIMAL)
├── price_per_sqm (DECIMAL)
├── comparable_data (JSONB)
└── property_analysis (JSONB)
```

### **SESSION MANAGEMENT**

```sql
-- Valuation Sessions (Wizard state management)
valuation_sessions
├── id (TEXT, Primary Key)
├── session_id (TEXT, Unique) -- Links to in-memory session
├── valuation_id (TEXT, Foreign Key → valuations.id, Nullable)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── user_id (TEXT, Foreign Key → users.id)
├── status (ENUM: ACTIVE, COMPLETED, ABANDONED, EXPIRED)
├── step_data (JSONB) -- Current step data
├── wizard_data (JSONB) -- Complete wizard data
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── expires_at (TIMESTAMP)
```

### **FILE MANAGEMENT**

```sql
-- Documents
documents
├── id (TEXT, Primary Key)
├── valuation_id (TEXT, Foreign Key → valuations.id)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── doc_type (ENUM: TABU, CONDO, PERMIT, PLANNING_INFO, GARMUSHKA, GIS_SCREENSHOT, PROPERTY_IMAGE, OTHER)
├── file_name (TEXT)
├── storage_key (TEXT) -- S3 or local storage path
├── sha256 (TEXT) -- File integrity
├── source (ENUM: USER_UPLOAD, APP_GENERATED, AI_EXTRACTED)
├── extracted (JSONB) -- AI extraction results
├── uploaded_by_id (TEXT, Foreign Key → users.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Images
images
├── id (TEXT, Primary Key)
├── valuation_id (TEXT, Foreign Key → valuations.id)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── file_name (TEXT)
├── storage_key (TEXT)
├── sha256 (TEXT)
├── room_type (ENUM: LIVING, KITCHEN, BATH, BEDROOM, EXTERIOR, OTHER)
├── features (JSONB) -- AI-extracted features
├── finish_level (ENUM: BASIC, STANDARD, PREMIUM)
├── uploaded_by_id (TEXT, Foreign Key → users.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Assets (Generated files)
assets
├── id (TEXT, Primary Key)
├── valuation_id (TEXT, Foreign Key → valuations.id)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── asset_type (ENUM: PDF, DOCX, CSV, JSON, IMAGE)
├── file_name (TEXT)
├── storage_key (TEXT)
├── sha256 (TEXT)
├── slug (TEXT) -- URL-friendly identifier
├── generated_by_id (TEXT, Foreign Key → users.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### **AUDIT & ACTIVITY LOGGING**

```sql
-- Activity Logs
activity_logs
├── id (TEXT, Primary Key)
├── organization_id (TEXT, Foreign Key → organizations.id)
├── subject_type (TEXT) -- 'valuation', 'document', 'image', 'asset', 'session'
├── subject_id (TEXT) -- ID of the subject
├── action (TEXT) -- 'created', 'updated', 'deleted', 'uploaded', 'generated', 'completed'
├── actor_id (TEXT, Foreign Key → users.id)
├── payload (JSONB) -- Additional context
└── created_at (TIMESTAMP)

-- Outbox Pattern (Event Processing)
outbox
├── id (TEXT, Primary Key)
├── event_type (TEXT)
├── payload (JSONB)
├── processed (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🔄 **DATA FLOW ARCHITECTURE**

### **1. Wizard Session Flow**

```
User starts wizard
    ↓
Create in-memory session
    ↓
User fills step data
    ↓
Auto-save to session store
    ↓
User completes step
    ↓
Save step data to database
    ↓
Continue to next step
    ↓
Repeat until completion
    ↓
Save final valuation to database
    ↓
Mark session as completed
```

### **2. Database Integration Points**

```typescript
// Session → Database sync points
const syncPoints = {
  step1: 'save_to_db',           // After Step 1 completion
  step2: 'save_to_db',           // After Step 2 completion
  step3: 'save_to_db',           // After Step 3 completion
  step4: 'save_to_db',           // After Step 4 completion
  step5: 'save_to_db',           // After Step 5 completion
  gis: 'save_gis_data',          // After GIS analysis
  garmushka: 'save_garmushka_data', // After Garmushka measurements
  final: 'save_final_results'    // After final valuation
}
```

### **3. Data Persistence Strategy**

```typescript
// Hybrid persistence approach
const persistenceStrategy = {
  session: {
    type: 'in-memory',
    purpose: 'fast wizard interactions',
    data: 'current step data only'
  },
  database: {
    type: 'postgresql',
    purpose: 'long-term storage',
    data: 'complete valuation data'
  },
  sync: {
    trigger: 'step completion',
    method: 'automatic background sync',
    fallback: 'manual save button'
  }
}
```

## 🚀 **IMPLEMENTATION GUIDE**

### **1. Setup Database**

```bash
# Run the integrated setup script
cd database
./setup-integrated-db.sh
```

### **2. Update Environment**

```env
# .env.local
DATABASE_URL="postgresql://postgres@localhost:5432/shamay_ai?schema=public"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### **3. Use Database Hooks**

```typescript
// In your wizard components
import { useValuationDB } from '@/hooks/useValuationDB'

function MyWizardComponent() {
  const { saveToDatabase, saveGISData, saveGarmushkaData } = useValuationDB()
  
  // Save data to database
  const handleSave = async () => {
    const result = await saveToDatabase(sessionId, wizardData)
    if (result.success) {
      console.log('Saved to database:', result.valuationId)
    }
  }
}
```

## 📈 **PERFORMANCE OPTIMIZATIONS**

### **1. Database Indexes**

```sql
-- Critical indexes for performance
CREATE INDEX idx_valuations_organization_id ON valuations(organization_id);
CREATE INDEX idx_valuations_status ON valuations(status);
CREATE INDEX idx_valuations_created_by_id ON valuations(created_by_id);
CREATE INDEX idx_valuation_sessions_session_id ON valuation_sessions(session_id);
CREATE INDEX idx_documents_valuation_id ON documents(valuation_id);
CREATE INDEX idx_activity_logs_organization_id ON activity_logs(organization_id);
```

### **2. JSONB Indexes**

```sql
-- JSONB indexes for complex queries
CREATE INDEX idx_valuations_step1_data_gin ON valuations USING gin (step1_data);
CREATE INDEX idx_valuations_gis_screenshots_gin ON valuations USING gin (gis_screenshots);
CREATE INDEX idx_valuations_garmushka_measurements_gin ON valuations USING gin (garmushka_measurements);
```

### **3. Query Optimization**

```sql
-- Optimized views for common queries
CREATE VIEW active_valuations AS
SELECT v.*, u.name as created_by_name, o.name as organization_name
FROM valuations v
JOIN users u ON v.created_by_id = u.id
JOIN organizations o ON v.organization_id = o.id
WHERE v.status IN ('DRAFT', 'IN_PROGRESS', 'READY');
```

## 🔒 **SECURITY & COMPLIANCE**

### **1. Data Isolation**

- **Organization-based**: All queries filtered by organization_id
- **User-based**: Users can only access their own data
- **Role-based**: Different permissions per user role

### **2. Audit Trail**

- **Complete logging**: All actions logged in activity_logs
- **User tracking**: Every action linked to user
- **Data integrity**: SHA256 hashes for file integrity

### **3. Data Protection**

- **Encryption**: Sensitive data encrypted at rest
- **Access control**: Database-level permissions
- **Backup**: Regular automated backups

## 🎯 **BEST PRACTICES**

### **1. Session Management**

```typescript
// Always sync session data to database
const syncSessionToDB = async (sessionId: string, data: any) => {
  try {
    await saveToDatabase(sessionId, data)
    console.log('Session synced to database')
  } catch (error) {
    console.error('Failed to sync session:', error)
    // Implement retry logic
  }
}
```

### **2. Error Handling**

```typescript
// Robust error handling
const handleDatabaseError = (error: any) => {
  if (error.code === 'P2002') {
    return 'Duplicate entry - please try again'
  } else if (error.code === 'P2025') {
    return 'Record not found'
  } else {
    return 'Database error - please contact support'
  }
}
```

### **3. Data Validation**

```typescript
// Validate data before saving
const validateValuationData = (data: any) => {
  const required = ['title', 'addressFull']
  const missing = required.filter(field => !data[field])
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
}
```

## 📊 **MONITORING & ANALYTICS**

### **1. Performance Metrics**

- **Query performance**: Monitor slow queries
- **Session duration**: Track wizard completion rates
- **Data volume**: Monitor database growth

### **2. Business Metrics**

- **Valuation completion**: Track success rates
- **User activity**: Monitor user engagement
- **Data quality**: Track AI extraction accuracy

### **3. System Health**

- **Database connections**: Monitor connection pool
- **Storage usage**: Track disk usage
- **Backup status**: Ensure data safety

## 🚀 **NEXT STEPS**

1. **Run Setup Script**: Execute `./setup-integrated-db.sh`
2. **Update Environment**: Configure PostgreSQL connection
3. **Test Integration**: Verify session ↔ database sync
4. **Monitor Performance**: Set up monitoring and alerts
5. **Scale as Needed**: Add read replicas for heavy queries

---

**🎉 This architecture provides a robust, scalable, and maintainable foundation for Shamay.AI's valuation system!**
