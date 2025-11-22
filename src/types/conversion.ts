export type ConversionType =
  | 'base'
  | 'ascii'
  | 'unicode'
  | 'floating'
  | 'base64'
  | 'hash'
  | 'color'
  | 'timestamp'
  | 'url'
  | 'jwt'
  | 'qr'
  | 'json'
  | 'regex';

export interface Conversion {
  id: string;
  type: ConversionType;
  timestamp: number;
  input: string;
  output: string | Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ConversionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface BaseConversionOptions {
  inputBase: number;
  outputBase: number;
  customBase?: number;
}

export interface HashOptions {
  algorithm: 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'SHA3';
  encoding?: 'hex' | 'base64';
}

export interface ColorFormat {
  hex?: string;
  rgb?: { r: number; g: number; b: number };
  hsl?: { h: number; s: number; l: number };
  hsv?: { h: number; s: number; v: number };
  cmyk?: { c: number; m: number; y: number; k: number };
}

export interface QRCodeOptions {
  size: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  foreground: string;
  background: string;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'txt' | 'pdf';
  filename: string;
  data: any;
}
