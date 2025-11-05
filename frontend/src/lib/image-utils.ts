/**
 * Image utilities for certificate generation
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert local image to base64 data URL
 */
export function imageToBase64DataURL(imagePath: string): string {
  const fullPath = path.join(process.cwd(), 'public', imagePath);
  const imageBuffer = fs.readFileSync(fullPath);
  const base64 = imageBuffer.toString('base64');

  // Determine MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  return `data:${mimeType};base64,${base64}`;
}
