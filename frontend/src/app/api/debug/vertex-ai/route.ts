import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

/**
 * Debug endpoint for Vertex AI - 可以直接用 curl 測試
 * 
 * 測試方法：
 * curl https://your-domain/api/debug/vertex-ai
 * curl -X POST https://your-domain/api/debug/vertex-ai -H "Content-Type: application/json" -d '{"test": "simple"}'
 */

export async function GET(request: NextRequest) {
  console.log('=== Vertex AI Debug GET ===');
  
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    method: 'GET',
  };

  // 1. 環境變數檢查
  debug.env = {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'NOT_SET',
    VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION || 'NOT_SET',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    K_SERVICE: process.env.K_SERVICE || 'NOT_CLOUD_RUN',
    K_REVISION: process.env.K_REVISION || 'NOT_CLOUD_RUN',
  };

  // 2. 檢查 Service Account (如果在 Cloud Run)
  if (process.env.K_SERVICE) {
    try {
      const metadataResponse = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email',
        { headers: { 'Metadata-Flavor': 'Google' } }
      );
      debug.serviceAccount = await metadataResponse.text();
    } catch (e) {
      debug.serviceAccount = `Error: ${(e as Error).message}`;
    }
  }

  // 3. 測試 Vertex AI
  try {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013';
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    debug.vertexConfig = { project, location };
    
    const vertexAI = new VertexAI({ project, location });
    debug.vertexAI = 'Client created successfully';
    
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
    debug.model = 'Model initialized';
    
    // 簡單測試
    const result = await model.generateContent('Reply with just "OK"');
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    debug.testResult = {
      success: true,
      response: text || 'No response',
    };
    
  } catch (error) {
    debug.error = {
      message: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack?.split('\n').slice(0, 3),
    };
  }

  return NextResponse.json(debug, { 
    status: debug.error ? 500 : 200,
    headers: { 'Cache-Control': 'no-cache' }
  });
}

export async function POST(request: NextRequest) {
  console.log('=== Vertex AI Debug POST ===');
  
  const body = await request.json().catch(() => ({}));
  const test = body.test || 'full';
  
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    method: 'POST',
    testType: test,
  };

  if (test === 'simple') {
    // 只測試初始化
    try {
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });
      debug.result = 'VertexAI client created';
      debug.success = true;
    } catch (e) {
      debug.error = (e as Error).message;
      debug.success = false;
    }
  } else if (test === 'model') {
    // 測試 model 初始化
    try {
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
      debug.result = 'Model created';
      debug.success = true;
    } catch (e) {
      debug.error = (e as Error).message;
      debug.success = false;
    }
  } else {
    // 完整測試
    try {
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
      const result = await model.generateContent('Say "Hello from Vertex AI"');
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      debug.result = text || 'No response';
      debug.success = true;
    } catch (e) {
      debug.error = {
        message: (e as Error).message,
        fullError: JSON.stringify(e, null, 2).substring(0, 2000)
      };
      debug.success = false;
    }
  }

  return NextResponse.json(debug, { 
    status: debug.success ? 200 : 500,
    headers: { 'Cache-Control': 'no-cache' }
  });
}