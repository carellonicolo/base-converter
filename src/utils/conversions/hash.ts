/**
 * Hash generation utilities
 * Note: For production, use a proper crypto library like crypto-js
 */

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';

/**
 * Generate hash using Web Crypto API (SHA family only)
 */
export async function generateHash(
  input: string,
  algorithm: HashAlgorithm
): Promise<string> {
  // Convert algorithm name to Web Crypto API format
  const algoMap: Record<string, string> = {
    'SHA1': 'SHA-1',
    'SHA256': 'SHA-256',
    'SHA512': 'SHA-512',
  };

  if (algorithm === 'MD5') {
    // MD5 is not supported by Web Crypto API
    // For production, use crypto-js or similar library
    return generateMD5Fallback(input);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Simple MD5 implementation (for demonstration)
 * For production, use a proper crypto library
 */
function generateMD5Fallback(input: string): string {
  // This is a placeholder - in production, use crypto-js or similar
  console.warn('MD5 is deprecated and insecure. Use SHA-256 or SHA-512 instead.');
  return 'MD5 requires external library - use SHA-256 instead';
}

/**
 * Generate HMAC
 */
export async function generateHMAC(
  input: string,
  key: string,
  algorithm: 'SHA256' | 'SHA512' = 'SHA256'
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(input);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: `SHA-${algorithm.slice(3)}` },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Generate hash from file
 */
export async function generateFileHash(
  file: File,
  algorithm: 'SHA256' | 'SHA512' = 'SHA256'
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(`SHA-${algorithm.slice(3)}`, arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
