/**
 * Client-side PDF Generator using modern-screenshot + jsPDF
 * Uses modern-screenshot which supports all modern CSS including oklch/oklab
 */

import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

/**
 * Generate PDF from HTML element
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  try {
    // A4 Portrait dimensions in pixels (at 96 DPI)
    // A4 = 210mm x 297mm = 794px x 1123px
    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;

    // Save original styles
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;
    const originalMaxWidth = element.style.maxWidth;
    const originalMinWidth = element.style.minWidth;
    const originalTransform = element.style.transform;

    // Force A4 portrait dimensions
    element.style.width = `${A4_WIDTH_PX}px`;
    element.style.height = `${A4_HEIGHT_PX}px`;
    element.style.maxWidth = `${A4_WIDTH_PX}px`;
    element.style.minWidth = `${A4_WIDTH_PX}px`;

    // Wait for layout to settle
    await new Promise(resolve => setTimeout(resolve, 150));

    // Capture at exact A4 dimensions
    const dataUrl = await domToPng(element, {
      scale: 2, // High quality (2x resolution)
      backgroundColor: '#ffffff',
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
    });

    // Restore original styles
    element.style.width = originalWidth;
    element.style.height = originalHeight;
    element.style.maxWidth = originalMaxWidth;
    element.style.minWidth = originalMinWidth;
    element.style.transform = originalTransform;

    // Create PDF with A4 portrait
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add image filling entire A4 page
    pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);

    // Save PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
