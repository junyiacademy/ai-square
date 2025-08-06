import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';

// GET - 獲取法律文件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const version = searchParams.get('version');
    const language = searchParams.get('language') || 'en';

    const pool = getPool();
    
    let query = `
      SELECT 
        id,
        type,
        version,
        title,
        content,
        summary_of_changes,
        effective_date,
        created_at
      FROM legal_documents
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (version) {
      params.push(version);
      query += ` AND version = $${params.length}`;
    } else {
      // 如果沒有指定版本，獲取最新版本
      query = `
        SELECT DISTINCT ON (type)
          id,
          type,
          version,
          title,
          content,
          summary_of_changes,
          effective_date,
          created_at
        FROM legal_documents
        ${type ? 'WHERE type = $1' : ''}
        ORDER BY type, created_at DESC
      `;
    }

    const { rows } = await pool.query(query, params);

    // 處理多語言
    const documents = rows.map(doc => ({
      id: doc.id,
      type: doc.type,
      version: doc.version,
      title: doc.title[language] || doc.title.en || Object.values(doc.title)[0],
      content: doc.content[language] || doc.content.en || Object.values(doc.content)[0],
      summaryOfChanges: doc.summary_of_changes ? 
        (doc.summary_of_changes[language] || doc.summary_of_changes.en || Object.values(doc.summary_of_changes)[0]) : 
        null,
      effectiveDate: doc.effective_date,
      createdAt: doc.created_at
    }));

    return NextResponse.json({
      success: true,
      documents
    });

  } catch (error) {
    console.error('Get legal documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get legal documents' },
      { status: 500 }
    );
  }
}