import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db/get-pool';
import { z } from 'zod';

// 同意記錄 schema
const consentSchema = z.object({
  documentType: z.enum(['terms_of_service', 'privacy_policy']),
  documentVersion: z.string(),
  consent: z.boolean()
});

// POST - 記錄用戶同意
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 驗證輸入
    const validationResult = consentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { documentType, documentVersion, consent } = validationResult.data;

    if (!consent) {
      return NextResponse.json(
        { success: false, error: 'Consent is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // 查找文件
    const { rows: documents } = await pool.query(
      'SELECT id FROM legal_documents WHERE type = $1 AND version = $2',
      [documentType, documentVersion]
    );

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // 記錄同意
    await pool.query(
      `INSERT INTO user_consents
       (user_id, document_id, document_type, document_version, ip_address, user_agent, consent_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.user.id,
        documents[0].id,
        documentType,
        documentVersion,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        request.headers.get('user-agent'),
        'click'
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully'
    });

  } catch (error) {
    console.error('Record consent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

// GET - 獲取用戶的同意記錄
export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const pool = getPool();

    // 獲取最新的同意記錄
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (uc.document_type)
        uc.document_type,
        uc.document_version,
        uc.consented_at,
        ld.title,
        ld.effective_date
       FROM user_consents uc
       JOIN legal_documents ld ON uc.document_id = ld.id
       WHERE uc.user_id = $1
       ORDER BY uc.document_type, uc.consented_at DESC`,
      [session.user.id]
    );

    // 檢查是否有新版本需要同意
    const { rows: latestDocs } = await pool.query(
      `SELECT DISTINCT ON (type)
        type, version, title, effective_date
       FROM legal_documents
       ORDER BY type, created_at DESC`
    );

    const consents = rows.map(consent => ({
      type: consent.document_type,
      version: consent.document_version,
      consentedAt: consent.consented_at,
      title: consent.title,
      effectiveDate: consent.effective_date
    }));

    const requiresConsent = latestDocs.filter(doc => {
      const userConsent = consents.find(c => c.type === doc.type);
      return !userConsent || userConsent.version !== doc.version;
    }).map(doc => ({
      type: doc.type,
      version: doc.version,
      title: doc.title,
      effectiveDate: doc.effective_date
    }));

    return NextResponse.json({
      success: true,
      consents,
      requiresConsent
    });

  } catch (error) {
    console.error('Get consents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get consents' },
      { status: 500 }
    );
  }
}
