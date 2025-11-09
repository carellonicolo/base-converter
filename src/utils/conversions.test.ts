import { describe, it, expect } from 'vitest';
import { textToAscii, asciiToText, textToBinary, textToHex } from './conversions';

describe('conversion utilities', () => {
  describe('textToAscii', () => {
    it('should convert a simple string to ASCII codes', () => {
      expect(textToAscii('Hello')).toBe('72 101 108 108 111');
    });

    it('should handle an empty string', () => {
      expect(textToAscii('')).toBe('');
    });
  });

  describe('asciiToText', () => {
    it('should convert ASCII codes to a string', () => {
      expect(asciiToText('72 101 108 108 111')).toBe('Hello');
    });

    it('should handle comma-separated codes', () => {
      expect(asciiToText('72,101,108,108,111')).toBe('Hello');
    });

    it('should handle an empty string', () => {
      expect(asciiToText('')).toBe('');
    });
  });

  describe('textToBinary', () => {
    it('should convert a simple string to binary', () => {
      expect(textToBinary('Hi')).toBe('01001000 01101001');
    });

    it('should handle an empty string', () => {
      expect(textToBinary('')).toBe('');
    });
  });

  describe('textToHex', () => {
    it('should convert a simple string to hex', () => {
      expect(textToHex('Hi')).toBe('48 69');
    });

    it('should handle an empty string', () => {
      expect(textToHex('')).toBe('');
    });
  });
});
