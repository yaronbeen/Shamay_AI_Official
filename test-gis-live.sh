#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🧪 GIS LIVE TESTING - MONITORING LOGS             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Application: http://localhost:3000/wizard"
echo ""
echo "📋 TEST PROCEDURE:"
echo "1. Open browser: http://localhost:3000/wizard"
echo "2. Fill Step 1 with address: כביר 2 תל אביב"
echo "3. Go to Step 4 (GIS Analysis)"
echo "4. Wait for map to load"
echo "5. Pan/zoom to a specific location in the iframe"
echo "6. Click 'צלם מפה' (Screenshot Map)"
echo "7. Watch the logs below for verification"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 MONITORING GIS LOGS (Backend + Frontend):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitor backend logs for GIS activity
tail -f logs/backend-test.log 2>/dev/null | while read line; do
  if echo "$line" | grep -qE "(GIS|Screenshot|📸|🔒|📍|Attempt|coordinates|capturedUrl|Final captured)"; then
    echo "[BACKEND] $line"
  fi
done &
BACKEND_TAIL=$!

echo "✅ Backend log monitoring started (PID: $BACKEND_TAIL)"
echo ""
echo "🎯 What to look for in logs:"
echo "   - '🔒 Step 1: LOCKING current iframe URL' - URL is being captured"
echo "   - '✅ Target coordinates LOCKED' - Your coordinates are locked"
echo "   - '🔄 Attempt X/5' - Retry attempt number"
echo "   - '📊 Verification' - Checking if coordinates match"
echo "   - '✅ Screenshot coordinates MATCH' - Success!"
echo "   - '⚠️ Coordinates MISMATCH' - Will retry"
echo "   - 'Coordinate difference: X meters' - Distance from target"
echo ""
echo "Press Ctrl+C to stop monitoring..."
echo ""

wait $BACKEND_TAIL
