#!/bin/bash

# SHAMAY.AI Debug Cleanup Script
# Removes all debug console.log statements from the codebase

echo "🧹 Cleaning up debug statements..."

# Remove debug logs from wizard page
sed -i.bak '/console\.log.*🔍 Database load result/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*✅ Loaded existing data from database/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*🔍 \[LOAD\] Uploads from database/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*🔍 \[LOAD\] Uploads status/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*💾 \[DEBOUNCED SAVE\] Starting save/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*💾 \[DEBOUNCED SAVE\] Uploads status/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*⚠️  No existing data found/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*✅ Data saved to database/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*✅ Uploads with status saved/d' frontend/src/app/wizard/page.tsx
sed -i.bak '/console\.log.*⏭️ Skipping save during initial load/d' frontend/src/app/wizard/page.tsx

# Remove debug logs from PDF export
sed -i.bak '/console\.log.*🔍 PDF Export - gisScreenshots debug/,+5d' frontend/src/app/api/session/\[sessionId\]/export-pdf/route.ts

# Remove debug logs from Step3Validation
sed-i.bak '/console\.log.*🔍 getAllFilesFromSessionData/d' frontend/src/components/steps/Step3Validation.tsx
sed -i.bak '/console\.log.*🔍 Processing upload/d' frontend/src/components/steps/Step3Validation.tsx
sed -i.bak '/console\.log.*🔍 Upload details/,+7d' frontend/src/components/steps/Step3Validation.tsx
sed -i.bak '/console\.log.*🔍 PDF check for/,+5d' frontend/src/components/steps/Step3Validation.tsx

# Remove debug logs from Step4
sed -i.bak '/console\.log.*🔍 Step4 - data\.uploads/d' frontend/src/components/steps/Step4AIAnalysis.tsx
sed -i.bak '/console\.log.*🔍 Step4 - Upload/,+6d' frontend/src/components/steps/Step4AIAnalysis.tsx

# Remove debug logs from GIS components
sed -i.bak '/console\.log.*🔍 GISMapViewer data/d' frontend/src/components/ui/GISMapViewer.tsx
sed -i.bak '/console\.log.*🔍 DEBUG: Checking session/,+3d' frontend/src/components/ui/GISMapViewer.tsx
sed -i.bak '/console\.log.*🔍 ensureBase64Format input/d' frontend/src/components/ui/GISMapViewer.tsx
sed -i.bak '/console\.log.*🔍 GISData/d' frontend/src/components/ui/GISMapViewer.tsx

# Remove debug logs from AI analysis routes
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Frontend:/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Session data structure/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Available data keys/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Using uploaded PDF/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Spawning child process/,+3d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Backend script exit code/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Backend stdout/d' {} \;
find frontend/src/app/api/session/\[sessionId\]/*-analysis -name "route.ts" -exec sed -i.bak '/console\.log.*🔍 Backend stderr/d' {} \;

# Remove debug logs from upload route
sed -i.bak '/console\.log.*🔍 GET request for session uploads/d' frontend/src/app/api/session/\[sessionId\]/upload/route.ts

# Remove debug logs from DocumentContent
sed -i.bak '/console\.log.*🔍 DocumentContent - Data received/d' frontend/src/components/DocumentContent.tsx

# Remove debug logs from Step4Review
sed -i.bak '/console\.log.*🔍 Frontend: Fetching comparable/d' frontend/src/components/steps/Step4Review.tsx
sed -i.bak '/console\.log.*🔍 Frontend: Data object/,+7d' frontend/src/components/steps/Step4Review.tsx
sed -i.bak '/console\.log.*🔍 Debug query result/d' frontend/src/components/steps/Step4Review.tsx
sed -i.bak '/console\.log.*📊 Debug info/d' frontend/src/components/steps/Step4Review.tsx
sed -i.bak '/console\.log.*📊 Sample data item/d' frontend/src/components/steps/Step4Review.tsx

# Remove debug logs from comparable data route
sed -i.bak '/console\.log.*🔍 Frontend: Using EXISTING/d' frontend/src/app/api/session/\[sessionId\]/comparable-data/route.ts
sed -i.bak '/console\.log.*🔍 Project root/d' frontend/src/app/api/session/\[sessionId\]/comparable-data/route.ts
sed -i.bak '/console\.log.*🔍 Backend script path/d' frontend/src/app/api/session/\[sessionId\]/comparable-data/route.ts
sed -i.bak '/console\.log.*🔍 Backend script exit code/,+2d' frontend/src/app/api/session/\[sessionId\]/comparable-data/route.ts

# Remove debug logs from session store
sed -i.bak '/console\.log.*🔍 Looking for session/d' frontend/src/lib/session-store.ts
sed -i.bak '/console\.log.*🔍 Looking for session/d' frontend/src/lib/session-store-simple.ts

# Clean up backup files
find frontend -name "*.bak" -delete

echo "✅ Debug cleanup complete!"
echo "📊 Summary:"
echo "   - Removed wizard page debug logs"
echo "   - Removed PDF export debug logs"
echo "   - Removed component debug logs"  
echo "   - Removed API route debug logs"
echo "   - Cleaned up backup files"

