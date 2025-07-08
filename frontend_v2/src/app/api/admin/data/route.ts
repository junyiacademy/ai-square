import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper to determine data type and directory
function getDataPaths(dataType: string, filename: string) {
  const isRubrics = dataType === 'rubrics';
  const jsonDir = isRubrics ? 'rubrics_data_json' : 'pbl_data_json';
  const yamlDir = isRubrics ? 'rubrics_data' : 'pbl_data';
  
  return {
    jsonPath: path.join(process.cwd(), 'public', jsonDir, `${filename}.json`),
    yamlPath: path.join(process.cwd(), 'public', yamlDir, `${filename}.yaml`)
  };
}

// GET - Read JSON data
export async function GET(request: NextRequest) {
  try {
    const dataType = request.nextUrl.searchParams.get('type');
    const filename = request.nextUrl.searchParams.get('filename');
    const jsonPath = request.nextUrl.searchParams.get('path');
    
    if (!dataType || !filename) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and filename' },
        { status: 400 }
      );
    }
    
    const { jsonPath: filePath } = getDataPaths(dataType, filename);
    
    // Read JSON file
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    
    // If specific path requested, navigate to it
    if (jsonPath) {
      const keys = jsonPath.split('.');
      let result = data;
      
      for (const key of keys) {
        result = result[key];
        if (result === undefined) {
          return NextResponse.json(
            { error: `Path not found: ${jsonPath}` },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json({ data: result, path: jsonPath });
    }
    
    return NextResponse.json({ data, filename });
  } catch (error) {
    console.error('Error reading data:', error);
    return NextResponse.json(
      { error: 'Failed to read data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update JSON data (partial update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, filename, updates, syncToYaml = true } = body;
    
    if (!type || !filename || !updates) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, filename, and updates' },
        { status: 400 }
      );
    }
    
    const { jsonPath, yamlPath } = getDataPaths(type, filename);
    
    // Read current data
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    
    // Deep merge updates
    const updatedData = deepMerge(currentData, updates);
    
    // Save updated JSON
    await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));
    
    // Sync to YAML if requested
    if (syncToYaml) {
      await syncJsonToYaml(jsonPath, yamlPath);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data updated successfully',
      syncedToYaml: syncToYaml 
    });
  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json(
      { error: 'Failed to update data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, filename, path: targetPath, data, syncToYaml = true } = body;
    
    if (!type || !filename || !targetPath || !data) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, filename, path, and data' },
        { status: 400 }
      );
    }
    
    const { jsonPath, yamlPath } = getDataPaths(type, filename);
    
    // Read current data
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    
    // Navigate to target path and add new data
    const keys = targetPath.split('.');
    let target = currentData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    // Check if key already exists
    const lastKey = keys[keys.length - 1];
    if (target[lastKey]) {
      return NextResponse.json(
        { error: `Entry already exists at path: ${targetPath}` },
        { status: 409 }
      );
    }
    
    target[lastKey] = data;
    
    // Save updated JSON
    await fs.writeFile(jsonPath, JSON.stringify(currentData, null, 2));
    
    // Sync to YAML if requested
    if (syncToYaml) {
      await syncJsonToYaml(jsonPath, yamlPath);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Entry created successfully',
      path: targetPath,
      syncedToYaml: syncToYaml 
    });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete entry
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, filename, path: targetPath, syncToYaml = true } = body;
    
    if (!type || !filename || !targetPath) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, filename, and path' },
        { status: 400 }
      );
    }
    
    const { jsonPath, yamlPath } = getDataPaths(type, filename);
    
    // Read current data
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    
    // Navigate to target and delete
    const keys = targetPath.split('.');
    let target = currentData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
      if (!target) {
        return NextResponse.json(
          { error: `Path not found: ${targetPath}` },
          { status: 404 }
        );
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (!target[lastKey]) {
      return NextResponse.json(
        { error: `Entry not found at path: ${targetPath}` },
        { status: 404 }
      );
    }
    
    delete target[lastKey];
    
    // Save updated JSON
    await fs.writeFile(jsonPath, JSON.stringify(currentData, null, 2));
    
    // Sync to YAML if requested
    if (syncToYaml) {
      await syncJsonToYaml(jsonPath, yamlPath);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Entry deleted successfully',
      path: targetPath,
      syncedToYaml: syncToYaml 
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper: Deep merge objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Helper: Sync JSON to YAML
async function syncJsonToYaml(jsonPath: string, yamlPath: string): Promise<void> {
  try {
    // Use the yaml-json-crud-system.js script
    const scriptPath = path.join(process.cwd(), 'scripts', 'yaml-json-crud-system.js');
    const type = jsonPath.includes('rubrics_data_json') ? 'rubrics' : 'pbl';
    const filename = path.basename(jsonPath, '.json');
    
    await execAsync(`node ${scriptPath} sync ${type} ${filename}`);
  } catch (error) {
    console.error('Failed to sync to YAML:', error);
    // Don't throw - allow operation to succeed even if sync fails
  }
}