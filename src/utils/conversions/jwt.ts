/**
 * JWT (JSON Web Token) utilities
 */

export interface JWTHeader {
  alg: string;
  typ: string;
  [key: string]: any;
}

export interface JWTPayload {
  iss?: string; // Issuer
  sub?: string; // Subject
  aud?: string | string[]; // Audience
  exp?: number; // Expiration Time
  nbf?: number; // Not Before
  iat?: number; // Issued At
  jti?: string; // JWT ID
  [key: string]: any;
}

export interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

export interface JWTValidation {
  valid: boolean;
  expired: boolean;
  notYetValid: boolean;
  expiresIn: number | null;
  validFrom: number | null;
  errors: string[];
}

// Decode JWT
export function decodeJWT(token: string): DecodedJWT {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
    }

    const [headerB64, payloadB64, signature] = parts;

    // Decode header
    const headerJson = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(headerJson);

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    return {
      header,
      payload,
      signature,
      raw: {
        header: headerB64,
        payload: payloadB64,
        signature,
      },
    };
  } catch (error) {
    throw new Error('Failed to decode JWT: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Validate JWT (structure and timestamps only - not cryptographic validation)
export function validateJWT(token: string): JWTValidation {
  const errors: string[] = [];
  let decoded: DecodedJWT;

  try {
    decoded = decodeJWT(token);
  } catch (error) {
    return {
      valid: false,
      expired: false,
      notYetValid: false,
      expiresIn: null,
      validFrom: null,
      errors: [error instanceof Error ? error.message : 'Invalid JWT'],
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const { payload } = decoded;

  // Check expiration
  let expired = false;
  let expiresIn: number | null = null;
  if (payload.exp) {
    expired = payload.exp < now;
    expiresIn = payload.exp - now;
    if (expired) {
      errors.push(`Token expired on ${new Date(payload.exp * 1000).toISOString()}`);
    }
  }

  // Check not before
  let notYetValid = false;
  let validFrom: number | null = null;
  if (payload.nbf) {
    notYetValid = payload.nbf > now;
    validFrom = payload.nbf - now;
    if (notYetValid) {
      errors.push(`Token not valid until ${new Date(payload.nbf * 1000).toISOString()}`);
    }
  }

  // Check required fields
  if (!decoded.header.alg) {
    errors.push('Missing algorithm in header');
  }
  if (!decoded.header.typ) {
    errors.push('Missing type in header');
  }

  const valid = errors.length === 0;

  return {
    valid,
    expired,
    notYetValid,
    expiresIn,
    validFrom,
    errors,
  };
}

// Get JWT info summary
export function getJWTInfo(token: string): string {
  try {
    const decoded = decodeJWT(token);
    const validation = validateJWT(token);

    let info = `Algorithm: ${decoded.header.alg}\n`;
    info += `Type: ${decoded.header.typ}\n`;

    if (decoded.payload.iss) info += `Issuer: ${decoded.payload.iss}\n`;
    if (decoded.payload.sub) info += `Subject: ${decoded.payload.sub}\n`;
    if (decoded.payload.aud) info += `Audience: ${decoded.payload.aud}\n`;
    if (decoded.payload.iat) info += `Issued At: ${new Date(decoded.payload.iat * 1000).toISOString()}\n`;
    if (decoded.payload.exp) info += `Expires: ${new Date(decoded.payload.exp * 1000).toISOString()}\n`;
    if (decoded.payload.nbf) info += `Not Before: ${new Date(decoded.payload.nbf * 1000).toISOString()}\n`;

    info += `\nStatus: ${validation.valid ? '✓ Valid' : '✗ Invalid'}\n`;
    if (validation.expired) info += `✗ Expired\n`;
    if (validation.notYetValid) info += `✗ Not yet valid\n`;

    return info;
  } catch (error) {
    return 'Invalid JWT token';
  }
}

// Format JWT for display
export function formatJWT(token: string): string {
  try {
    const decoded = decodeJWT(token);

    let formatted = '// Header\n';
    formatted += JSON.stringify(decoded.header, null, 2);
    formatted += '\n\n// Payload\n';
    formatted += JSON.stringify(decoded.payload, null, 2);
    formatted += '\n\n// Signature\n';
    formatted += decoded.signature;

    return formatted;
  } catch (error) {
    throw new Error('Failed to format JWT');
  }
}
