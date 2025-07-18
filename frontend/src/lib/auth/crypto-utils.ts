// Utility functions for crypto operations that work in both Node.js and Edge runtime

export async function createHmacSignature(
  secret: string,
  data: string
): Promise<string> {
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    // Node.js environment
    try {
      const crypto = require('crypto');
      return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    } catch (error) {
      // Fallback for Edge runtime
      return await webCryptoHmac(secret, data);
    }
  } else {
    // Browser or Edge runtime
    return await webCryptoHmac(secret, data);
  }
}

async function webCryptoHmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}