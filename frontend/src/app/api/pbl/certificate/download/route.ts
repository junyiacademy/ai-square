/**
 * Certificate PDF Download API
 * Generates and downloads certificate as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePDFFromHTML } from '@/lib/pdf-generator';
import { generateCertificateHTML } from '@/lib/certificate-template';
import { imageToBase64DataURL } from '@/lib/image-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentName, scenarioTitle, completionDate, language } = body;

    // Validation
    if (!studentName || !scenarioTitle || !completionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load and convert logos to base64
    const junyiLogoBase64 = imageToBase64DataURL('images/junyi_logo.jpg');
    const aiSquareLogoBase64 = imageToBase64DataURL('images/logo.png');

    // Generate HTML
    const html = generateCertificateHTML({
      studentName,
      scenarioTitle,
      completionDate,
      language: language || 'en',
      junyiLogoBase64,
      aiSquareLogoBase64,
    });

    // Generate PDF
    const pdfBuffer = await generatePDFFromHTML(html, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${encodeURIComponent(studentName)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout
