/**
 * Tests for input sanitization utilities
 * Security review: Phase 2, Group D
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeStringArray,
  sanitizeCommunityName,
  sanitizeCoreValues,
  sanitizeDescription,
  sanitizeLocation
} from './input-sanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\n\ttest\t\n')).toBe('test');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('hello\0world')).toBe('helloworld');
      expect(sanitizeString('\0test\0')).toBe('test');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(20000);
      const sanitized = sanitizeString(longString);
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });

    it('should enforce custom max length', () => {
      const longString = 'a'.repeat(500);
      const sanitized = sanitizeString(longString, 100);
      expect(sanitized.length).toBe(100);
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
      expect(sanitizeString({} as any)).toBe('');
    });

    it('should preserve valid unicode characters', () => {
      expect(sanitizeString('Hello 世界 🌻')).toBe('Hello 世界 🌻');
      expect(sanitizeString('Café résumé')).toBe('Café résumé');
    });
  });

  describe('sanitizeStringArray', () => {
    it('should sanitize each element', () => {
      const input = ['  hello  ', '  world  '];
      const result = sanitizeStringArray(input);
      expect(result).toEqual(['hello', 'world']);
    });

    it('should filter out empty strings', () => {
      const input = ['valid', '', '   ', 'also valid'];
      const result = sanitizeStringArray(input);
      expect(result).toEqual(['valid', 'also valid']);
    });

    it('should enforce max array length', () => {
      const input = Array(200).fill('test');
      const result = sanitizeStringArray(input, 50);
      expect(result.length).toBe(50);
    });

    it('should enforce max value length', () => {
      const longValue = 'a'.repeat(500);
      const input = [longValue];
      const result = sanitizeStringArray(input, 100, 100);
      expect(result[0].length).toBe(100);
    });

    it('should handle non-array input', () => {
      expect(sanitizeStringArray(null as any)).toEqual([]);
      expect(sanitizeStringArray(undefined as any)).toEqual([]);
      expect(sanitizeStringArray('not an array' as any)).toEqual([]);
    });

    it('should remove null bytes from array elements', () => {
      const input = ['hello\0world', 'test\0'];
      const result = sanitizeStringArray(input);
      expect(result).toEqual(['helloworld', 'test']);
    });
  });

  describe('sanitizeCommunityName', () => {
    it('should sanitize valid community names', () => {
      expect(sanitizeCommunityName('  Oakland Mutual Aid  ')).toBe('Oakland Mutual Aid');
      expect(sanitizeCommunityName('Sunrise Commune')).toBe('Sunrise Commune');
    });

    it('should throw error for empty name', () => {
      expect(() => sanitizeCommunityName('')).toThrow('Community name cannot be empty');
      expect(() => sanitizeCommunityName('   ')).toThrow('Community name cannot be empty');
    });

    it('should enforce 200 character limit', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeCommunityName(longName);
      expect(result.length).toBe(200);
    });

    it('should preserve unicode in community names', () => {
      expect(sanitizeCommunityName('Café Cooperativa')).toBe('Café Cooperativa');
      expect(sanitizeCommunityName('互助社区 Mutual Aid')).toBe('互助社区 Mutual Aid');
    });
  });

  describe('sanitizeCoreValues', () => {
    it('should sanitize core values array', () => {
      const values = ['  mutual aid  ', '  solidarity  ', '  ecology  '];
      const result = sanitizeCoreValues(values);
      expect(result).toEqual(['mutual aid', 'solidarity', 'ecology']);
    });

    it('should filter out empty values', () => {
      const values = ['valid', '', '   ', 'also valid'];
      const result = sanitizeCoreValues(values);
      expect(result).toEqual(['valid', 'also valid']);
    });

    it('should limit to 50 values', () => {
      const values = Array(100).fill('value');
      const result = sanitizeCoreValues(values);
      expect(result.length).toBe(50);
    });

    it('should limit each value to 100 characters', () => {
      const longValue = 'a'.repeat(200);
      const values = [longValue];
      const result = sanitizeCoreValues(values);
      expect(result[0].length).toBe(100);
    });
  });

  describe('sanitizeDescription', () => {
    it('should sanitize description text', () => {
      const desc = '  A community for mutual aid and solidarity  ';
      expect(sanitizeDescription(desc)).toBe('A community for mutual aid and solidarity');
    });

    it('should allow longer descriptions (5000 chars)', () => {
      const longDesc = 'a'.repeat(4000);
      const result = sanitizeDescription(longDesc);
      expect(result.length).toBe(4000);
    });

    it('should truncate very long descriptions', () => {
      const veryLongDesc = 'a'.repeat(10000);
      const result = sanitizeDescription(veryLongDesc);
      expect(result.length).toBe(5000);
    });

    it('should preserve paragraph structure', () => {
      const multiline = `First paragraph.

Second paragraph.

Third paragraph.`;
      const result = sanitizeDescription(multiline);
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });
  });

  describe('sanitizeLocation', () => {
    it('should sanitize location strings', () => {
      expect(sanitizeLocation('  Oakland, CA  ')).toBe('Oakland, CA');
      expect(sanitizeLocation('Rural Vermont')).toBe('Rural Vermont');
    });

    it('should limit to 500 characters', () => {
      const longLocation = 'a'.repeat(1000);
      const result = sanitizeLocation(longLocation);
      expect(result.length).toBe(500);
    });

    it('should preserve international location names', () => {
      expect(sanitizeLocation('São Paulo, Brazil')).toBe('São Paulo, Brazil');
      expect(sanitizeLocation('东京 Tokyo')).toBe('东京 Tokyo');
    });
  });

  describe('Security - XSS Prevention', () => {
    it('should not execute script tags (handled by escapeHtml in UI)', () => {
      // Note: sanitization doesn't strip HTML, that's done by escapeHtml in the UI layer
      // These tests verify sanitization doesn't introduce vulnerabilities
      const malicious = '<script>alert("xss")</script>';
      const result = sanitizeString(malicious);
      // String is preserved, XSS prevention happens in the UI rendering layer
      expect(result).toBe(malicious);
    });

    it('should handle SQL injection attempts (not applicable but good to document)', () => {
      // We use IndexedDB with key-value storage, no SQL injection possible
      const sqlInjection = "'; DROP TABLE users; --";
      const result = sanitizeString(sqlInjection);
      expect(result).toBe(sqlInjection);
    });

    it('should handle very long inputs without crashing', () => {
      const huge = 'a'.repeat(1000000);
      expect(() => sanitizeString(huge)).not.toThrow();
      const result = sanitizeString(huge);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle null byte injection attacks', () => {
      // Null bytes can cause issues in C-based systems
      const nullBytes = 'hello\0\0\0world';
      const result = sanitizeString(nullBytes);
      expect(result).not.toContain('\0');
      expect(result).toBe('helloworld');
    });
  });

  describe('Edge Cases', () => {
    it('should handle only whitespace', () => {
      expect(sanitizeString('     ')).toBe('');
      expect(sanitizeString('\n\n\n')).toBe('');
      expect(sanitizeString('\t\t\t')).toBe('');
    });

    it('should handle mixed whitespace types', () => {
      expect(sanitizeString(' \n\t  test  \t\n ')).toBe('test');
    });

    it('should handle unicode whitespace', () => {
      // Non-breaking spaces and other unicode whitespace are trimmed by .trim()
      expect(sanitizeString('\u00A0test\u00A0')).toBe('test');
      // But unicode characters within the string are preserved
      expect(sanitizeString('hello\u00A0world')).toBe('hello\u00A0world');
    });

    it('should handle empty arrays', () => {
      expect(sanitizeStringArray([])).toEqual([]);
    });

    it('should handle arrays with only empty strings', () => {
      const input = ['', '   ', '\n', '\t'];
      expect(sanitizeStringArray(input)).toEqual([]);
    });

    it('should handle special characters in values', () => {
      const values = ['mutual-aid', 'anti_capitalism', 'ecology&justice'];
      const result = sanitizeCoreValues(values);
      expect(result).toEqual(values);
    });
  });
});
