#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route test files
const routeTestFiles = glob.sync('src/**/__tests__/route.test.{ts,tsx}');

let totalFixed = 0;

routeTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Determine the correct params based on file path
  const filePath = file.replace('/__tests__/route.test.ts', '');
  let expectedParams = 'Promise<{}>';
  
  if (filePath.includes('[taskId]')) {
    expectedParams = 'Promise<{ id: string; programId: string; taskId: string; }>';
  } else if (filePath.includes('[programId]') && filePath.includes('[id]')) {
    expectedParams = 'Promise<{ id: string; programId: string; }>';
  } else if (filePath.includes('[programId]')) {
    expectedParams = 'Promise<{ programId: string; }>';
  } else if (filePath.includes('[id]')) {
    expectedParams = 'Promise<{ id: string; }>';
  }
  
  // Fix all params declarations in the file
  const paramsRegex = /params: Promise<\{[^}]*\}>/g;
  content = content.replace(paramsRegex, `params: ${expectedParams}`);
  
  // Fix POST function calls that need context parameter
  if (file.includes('translate')) {
    content = content.replace(/await POST\(request\)/g, 'await POST(request, {})');
    content = content.replace(/await GET\(request\)/g, 'await GET(request, {})');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\nFixed ${totalFixed} route test files`);

// Fix other common TypeScript issues
const allTsFiles = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/*.d.ts']
});

allTsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fixed = false;
  
  // Fix type assertion issues
  content = content.replace(/as\s+Record<string,\s*$/gm, 'as Record<string, unknown>');
  content = content.replace(/:\s+Record<string,\s*$/gm, ': Record<string, unknown>');
  
  // Fix incomplete generic types
  content = content.replace(/Array<Record<string,\s*$/gm, 'Array<Record<string, unknown>');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed type issues in ${file}`);
    totalFixed++;
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);