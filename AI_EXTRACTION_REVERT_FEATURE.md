# AI Extraction Revert Feature

## 🎯 **Feature Overview**
This feature allows users to:
1. **Edit AI-extracted fields** in the UI (Step 3)
2. **Preserve original AI extractions** in a separate database table
3. **Revert to original AI values** at any time if they change their mind

---

## 📊 **Database Schema**

### New Table: `ai_extractions`
```sql
CREATE TABLE ai_extractions (
  id SERIAL PRIMARY KEY,
  shuma_id INTEGER REFERENCES shuma(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  
  -- Extraction metadata
  extraction_type VARCHAR(50) NOT NULL, -- 'land_registry', 'building_permit', 'combined', etc.
  extraction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Original AI response (full JSON)
  raw_ai_response JSONB NOT NULL,
  
  -- Parsed extracted data (for quick access)
  extracted_fields JSONB NOT NULL,
  
  -- AI processing metadata
  ai_model VARCHAR(100),
  processing_cost DECIMAL(10,4),
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  
  -- Document reference
  document_filename VARCHAR(255),
  document_path TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE, -- false if user has overridden
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields**:
- `raw_ai_response`: Complete unmodified AI response
- `extracted_fields`: Parsed data in standard format
- `is_active`: Tracks if user has made manual edits
- `extraction_type`: Type of extraction (for querying specific extractions)

---

## 🔄 **Data Flow**

### 1. **AI Processing (Step 2)**
```
User uploads documents
    ↓
Clicks "עבד מסמכים" (Process Documents)
    ↓
AI APIs process documents
    ↓
Results merged into combinedData
    ↓
[NEW] Save to ai_extractions table (original, immutable)
    ↓
Save to shuma.extracted_data (user-editable)
```

### 2. **User Edits (Step 3)**
```
User views extracted data
    ↓
Edits a field (e.g., changes "9905" to "9906")
    ↓
Updated value saves to shuma.extracted_data
    ↓
[OPTIONAL] Mark ai_extractions as is_active=false
```

### 3. **Revert to Original**
```
User clicks "Revert to AI" button
    ↓
Fetch from ai_extractions table
    ↓
Restore original values to shuma.extracted_data
    ↓
Mark ai_extractions as is_active=true
    ↓
UI refreshes with original AI values
```

---

## 🛠️ **Implementation**

### Backend Methods (ShumaDB)

#### 1. `saveAIExtraction(sessionId, extractionType, aiResponse, extractedFields, metadata)`
Saves original AI extraction result.

**Parameters**:
- `sessionId`: Session identifier
- `extractionType`: Type of extraction ('combined', 'land_registry', etc.)
- `aiResponse`: Full unmodified AI API response
- `extractedFields`: Parsed fields in standard format
- `metadata`: Optional metadata (aiModel, cost, confidence, etc.)

**Returns**: `{ success: true, extractionId: number }`

#### 2. `getAIExtractions(sessionId, extractionType?)`
Retrieves all AI extractions for a session.

**Parameters**:
- `sessionId`: Session identifier
- `extractionType`: Optional filter by type

**Returns**: `{ success: true, extractions: [] }`

#### 3. `getLatestAIExtraction(sessionId, extractionType)`
Gets the most recent active extraction for a specific type.

**Returns**: `{ success: true, extraction: {...} }`

#### 4. `deactivateAIExtraction(extractionId)`
Marks an extraction as inactive (user has overridden).

#### 5. `restoreAIExtraction(sessionId, extractionId)`
Restores original AI values back to `shuma.extracted_data`.

**Flow**:
1. Fetches AI extraction from `ai_extractions` table
2. Merges extracted_fields into current `extractedData`
3. Saves to `shuma` table
4. Marks extraction as `is_active=true`

---

## 🌐 **API Endpoints**

### `POST /api/session/[sessionId]/ai-extractions`
Save a new AI extraction.

**Request Body**:
```json
{
  "extractionType": "combined",
  "extractedFields": {
    "gush": "9905",
    "parcel": "88",
    "buildingYear": "2015",
    ...
  },
  "metadata": {
    "aiModel": "gpt-4-vision-preview",
    "extractionDate": "2025-10-24T21:10:49.625Z",
    "documentTypes": ["tabu", "permit"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "extractionId": 123
}
```

### `GET /api/session/[sessionId]/ai-extractions?type=combined`
Get all AI extractions for a session (optionally filtered by type).

**Response**:
```json
{
  "success": true,
  "extractions": [
    {
      "id": 123,
      "extraction_type": "combined",
      "extracted_fields": {...},
      "is_active": true,
      "extraction_date": "2025-10-24T21:10:49.625Z"
    }
  ]
}
```

### `PUT /api/session/[sessionId]/ai-extractions`
Restore or deactivate an AI extraction.

**Request Body (Restore)**:
```json
{
  "extractionId": 123,
  "action": "restore"
}
```

**Request Body (Deactivate)**:
```json
{
  "extractionId": 123,
  "action": "deactivate"
}
```

**Response (Restore)**:
```json
{
  "success": true,
  "restoredFields": {
    "gush": "9905",
    "parcel": "88",
    ...
  }
}
```

---

## 🎨 **UI Implementation (Step 3)**

### UI Components to Add

#### 1. **"Revert to AI" Button** for Each Field
```tsx
<div className="flex items-center gap-2">
  <span>{extractedData.gush}</span>
  <button
    onClick={() => handleRevertField('gush')}
    className="text-xs text-blue-600 hover:text-blue-800"
  >
    ↺ Revert to AI
  </button>
</div>
```

#### 2. **AI Extraction History Panel**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <h4 className="font-semibold mb-2">AI Extraction History</h4>
  <div className="space-y-2">
    {aiExtractions.map(extraction => (
      <div key={extraction.id} className="flex justify-between items-center">
        <div>
          <span className="text-sm">{extraction.extraction_date}</span>
          <span className={extraction.is_active ? "text-green-600" : "text-gray-400"}>
            {extraction.is_active ? " (Active)" : " (Overridden)"}
          </span>
        </div>
        <button
          onClick={() => restoreExtraction(extraction.id)}
          disabled={extraction.is_active}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Restore This Version
        </button>
      </div>
    ))}
  </div>
</div>
```

#### 3. **Visual Indicator for AI vs Manual Values**
```tsx
{/* Show if value is from AI or manually edited */}
<div className="flex items-center gap-1">
  {isFromAI ? (
    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
      🤖 AI
    </span>
  ) : (
    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
      ✏️ Edited
    </span>
  )}
</div>
```

---

## 💡 **Usage Examples**

### Example 1: Save AI Extraction After Processing
```typescript
// In Step2Documents.tsx after AI processing
await fetch(`/api/session/${sessionId}/ai-extractions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    extractionType: 'combined',
    extractedFields: combinedData,
    metadata: {
      extractionDate: new Date().toISOString(),
      documentTypes: ['tabu', 'permit', 'exterior_image']
    }
  })
})
```

### Example 2: Load AI Extractions in Step 3
```typescript
// In Step3Validation.tsx
const loadAIExtractions = async () => {
  const response = await fetch(`/api/session/${sessionId}/ai-extractions`)
  const data = await response.json()
  setAIExtractions(data.extractions)
}
```

### Example 3: Restore Original AI Values
```typescript
const restoreAIExtraction = async (extractionId: number) => {
  const response = await fetch(`/api/session/${sessionId}/ai-extractions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      extractionId,
      action: 'restore'
    })
  })
  
  if (response.ok) {
    const { restoredFields } = await response.json()
    // Update UI with restored fields
    setExtractedData(prev => ({ ...prev, ...restoredFields }))
  }
}
```

---

## 🔐 **Security Considerations**

1. **Immutability**: Original AI extractions in `ai_extractions` table are never modified, only marked as active/inactive
2. **Audit Trail**: Full history of AI extractions is preserved with timestamps
3. **Cost Tracking**: `processing_cost` field helps track AI processing expenses
4. **Confidence Scores**: Helps users understand reliability of AI extractions

---

## 📈 **Benefits**

1. ✅ **User Confidence**: Users can experiment with edits knowing they can revert
2. ✅ **Audit Trail**: Complete history of AI extractions and user modifications
3. ✅ **Cost Analysis**: Track AI processing costs over time
4. ✅ **Data Quality**: Compare AI vs manual corrections to improve prompts
5. ✅ **Undo Capability**: Simple revert mechanism without complex version control

---

## 🚀 **Next Steps**

### Phase 1 (Current)
- ✅ Database schema created
- ✅ Backend methods implemented
- ✅ API endpoints created
- ✅ Basic save on AI processing

### Phase 2 (UI Integration)
- [ ] Add "Revert to AI" buttons in Step 3
- [ ] Add AI extraction history panel
- [ ] Add visual indicators (AI vs Edited)
- [ ] Add bulk restore option

### Phase 3 (Advanced)
- [ ] Field-level revert (restore individual fields)
- [ ] Compare view (original AI vs current values)
- [ ] Export AI extraction history
- [ ] AI confidence visualization

---

## 📝 **Migration Command**

```bash
psql -U postgres -d shamay_land_registry -f database/migrations/002_add_ai_extractions_table.sql
```

This will create the `ai_extractions` table and all necessary indexes.

---

**Last Updated**: 2025-10-24  
**Status**: ✅ Backend Complete, UI Integration Pending

