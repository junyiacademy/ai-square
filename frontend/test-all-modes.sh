#!/bin/bash

# Test all three learning modes APIs
echo "🧪 Testing All Learning Modes APIs"
echo "================================="

echo ""
echo "📊 Assessment Scenarios:"
curl -s "http://localhost:3000/api/assessment/scenarios?lang=en" | jq '.data.scenarios | length' 2>/dev/null && echo "✅ Assessment API working"

echo ""
echo "🎯 PBL Scenarios:"
curl -s "http://localhost:3000/api/pbl/scenarios?lang=en" | jq '.data.scenarios | length' 2>/dev/null && echo "✅ PBL API working"

echo ""
echo "🔍 Discovery Scenarios:"
curl -s "http://localhost:3000/api/discovery/scenarios?lang=en" | jq '. | length' 2>/dev/null && echo "✅ Discovery API working"

echo ""
echo "📈 Database Summary:"
echo "=================="

# Test database queries
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_square_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-aisquare2025local}"

PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "
SELECT 
  mode, 
  COUNT(*) as count,
  string_agg(title->>'en', ', ') as titles
FROM scenarios 
GROUP BY mode 
ORDER BY mode;
"

echo ""
echo "🎉 All learning modes are ready for testing!"
echo ""
echo "URLs to test:"
echo "- Assessment: http://localhost:3000/assessment/scenarios"
echo "- PBL: http://localhost:3000/pbl/scenarios"  
echo "- Discovery: http://localhost:3000/discovery/scenarios"