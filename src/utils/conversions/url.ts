/**
 * URL encoding/decoding utilities
 */

// Encode URL
export function encodeURL(input: string): string {
  return encodeURIComponent(input);
}

// Decode URL
export function decodeURL(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch (error) {
    throw new Error('Invalid URL-encoded string');
  }
}

// Encode URI (entire URL)
export function encodeFullURL(input: string): string {
  return encodeURI(input);
}

// Decode URI (entire URL)
export function decodeFullURL(input: string): string {
  try {
    return decodeURI(input);
  } catch (error) {
    throw new Error('Invalid URL string');
  }
}

// Parse query string to object
export function parseQueryString(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://example.com${url}`);
    const params = new URLSearchParams(urlObj.search);
    const result: Record<string, string> = {};

    params.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  } catch (error) {
    // If URL parsing fails, try parsing as query string directly
    const params = new URLSearchParams(url.startsWith('?') ? url : `?${url}`);
    const result: Record<string, string> = {};

    params.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }
}

// Object to query string
export function objectToQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });

  return params.toString();
}

// Parse URL into components
export interface URLComponents {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  full: string;
}

export function parseURL(url: string): URLComponents | null {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      full: urlObj.href,
    };
  } catch (error) {
    return null;
  }
}

// Validate URL
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Slugify string (for URLs)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}
