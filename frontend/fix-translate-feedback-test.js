const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/api/discovery/programs/[programId]/translate-feedback/__tests__/route.test.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix the syntax errors - remove extra closing braces after POST(request)
content = content.replace(/await POST\(request\)\s*\}/g, 'await POST(request)');
content = content.replace(/await GET\(request\)\s*\}/g, 'await GET(request)');

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed translate-feedback test syntax errors');