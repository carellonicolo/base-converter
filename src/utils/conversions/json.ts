/**
 * JSON formatting and validation utilities
 */

export interface JSONValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
}

// Format JSON with indentation
export function formatJSON(input: string, indent: number = 2): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, indent);
  } catch (error) {
    throw new Error('Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Minify JSON
export function minifyJSON(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
  } catch (error) {
    throw new Error('Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Validate JSON
export function validateJSON(input: string): JSONValidationResult {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Try to extract line and column from error message
      const match = error.message.match(/at position (\d+)/);
      const position = match ? parseInt(match[1]) : undefined;

      let line: number | undefined;
      let column: number | undefined;

      if (position !== undefined) {
        const lines = input.substring(0, position).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      return {
        valid: false,
        error: error.message,
        line,
        column,
      };
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Convert JSON to different formats
export function jsonToYAML(input: string): string {
  // Simple YAML conversion (for basic objects)
  try {
    const obj = JSON.parse(input);
    return objectToYAML(obj);
  } catch (error) {
    throw new Error('Invalid JSON');
  }
}

function objectToYAML(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => `${spaces}- ${objectToYAML(item, indent + 1)}`).join('\n');
  }

  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${objectToYAML(value, indent + 1)}`;
      }
      return `${spaces}${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');
}

// Sort JSON keys
export function sortJSON(input: string, reverse: boolean = false): string {
  try {
    const parsed = JSON.parse(input);
    const sorted = sortObject(parsed, reverse);
    return JSON.stringify(sorted, null, 2);
  } catch (error) {
    throw new Error('Invalid JSON');
  }
}

function sortObject(obj: any, reverse: boolean = false): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObject(item, reverse));
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();

  if (reverse) {
    keys.reverse();
  }

  keys.forEach(key => {
    sorted[key] = sortObject(obj[key], reverse);
  });

  return sorted;
}

// Escape/Unescape JSON strings
export function escapeJSON(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function unescapeJSON(input: string): string {
  return input
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

// JSON path query (simple implementation)
export function queryJSON(input: string, path: string): any {
  try {
    const obj = JSON.parse(input);
    const parts = path.split('.').filter(Boolean);

    let result: any = obj;
    for (const part of parts) {
      if (result === undefined || result === null) {
        throw new Error(`Path not found: ${path}`);
      }

      // Handle array indices
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        result = result[key]?.[parseInt(index)];
      } else {
        result = result[part];
      }
    }

    return result;
  } catch (error) {
    throw new Error('Failed to query JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
