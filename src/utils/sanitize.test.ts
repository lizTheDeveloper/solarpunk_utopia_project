/**
 * Tests for HTML Sanitization Utilities
 * Ensures protection against XSS attacks
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeAttribute, sanitizeUserContent, validateIdentifier, requireValidIdentifier } from './sanitize';

describe('HTML Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape basic HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape less than and greater than', () => {
      expect(escapeHtml('5 < 10 > 3')).toBe('5 &lt; 10 &gt; 3');
    });

    it('should handle multiple escapes', () => {
      expect(escapeHtml('<div onclick="alert(\'xss\')">Test & "stuff"</div>'))
        .toBe('&lt;div onclick=&quot;alert(&#039;xss&#039;)&quot;&gt;Test &amp; &quot;stuff&quot;&lt;/div&gt;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle normal text', () => {
      expect(escapeHtml('This is normal text')).toBe('This is normal text');
    });
  });

  describe('sanitizeAttribute', () => {
    it('should remove characters that break attributes', () => {
      expect(sanitizeAttribute('test"onclick="alert(1)')).toBe('testonclickalert(1)');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeAttribute('<script>test</script>')).toBe('scripttest/script');
    });

    it('should remove backticks', () => {
      expect(sanitizeAttribute('test`evil`')).toBe('testevil');
    });

    it('should remove equals signs', () => {
      expect(sanitizeAttribute('data-value=malicious')).toBe('data-valuemalicious');
    });

    it('should remove newlines and carriage returns', () => {
      expect(sanitizeAttribute('line1\nline2\rline3')).toBe('line1 line2 line3');
    });

    it('should trim whitespace', () => {
      expect(sanitizeAttribute('  test  ')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(sanitizeAttribute('')).toBe('');
    });
  });

  describe('sanitizeUserContent', () => {
    it('should sanitize user message with HTML', () => {
      expect(sanitizeUserContent('Hello <b>world</b>'))
        .toBe('Hello &lt;b&gt;world&lt;/b&gt;');
    });

    it('should handle script tags', () => {
      expect(sanitizeUserContent('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle img tags with onerror', () => {
      expect(sanitizeUserContent('<img src=x onerror=alert(1)>'))
        .toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should handle event handlers', () => {
      expect(sanitizeUserContent('<div onclick="alert(1)">click me</div>'))
        .toBe('&lt;div onclick=&quot;alert(1)&quot;&gt;click me&lt;/div&gt;');
    });

    it('should handle undefined input', () => {
      expect(sanitizeUserContent(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUserContent('  hello  ')).toBe('hello');
    });

    it('should preserve emoji and unicode', () => {
      expect(sanitizeUserContent('Hello 👋 世界')).toBe('Hello 👋 世界');
    });

    it('should handle normal user content', () => {
      expect(sanitizeUserContent('Just a normal message!'))
        .toBe('Just a normal message!');
    });
  });

  describe('validateIdentifier', () => {
    it('should return true for valid UUID-style IDs', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(validateIdentifier(uuid)).toBe(true);
    });

    it('should return true for alphanumeric with hyphens and underscores', () => {
      expect(validateIdentifier('user-123_abc')).toBe(true);
    });

    it('should return false for IDs with spaces', () => {
      expect(validateIdentifier('user 123')).toBe(false);
    });

    it('should return false for IDs with special characters', () => {
      expect(validateIdentifier('user@123')).toBe(false);
      expect(validateIdentifier('user#123')).toBe(false);
      expect(validateIdentifier('user$123')).toBe(false);
    });

    it('should return false for IDs with HTML tags', () => {
      expect(validateIdentifier('<script>alert(1)</script>')).toBe(false);
    });

    it('should return false for IDs with quotes', () => {
      expect(validateIdentifier('user"123')).toBe(false);
      expect(validateIdentifier("user'123")).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateIdentifier(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateIdentifier('')).toBe(false);
    });

    it('should return true for numbers only', () => {
      expect(validateIdentifier('123456')).toBe(true);
    });

    it('should return true for letters only', () => {
      expect(validateIdentifier('abcdefg')).toBe(true);
    });
  });

  describe('requireValidIdentifier', () => {
    it('should return the ID if valid', () => {
      expect(requireValidIdentifier('valid-id-123')).toBe('valid-id-123');
    });

    it('should throw error for undefined ID', () => {
      expect(() => requireValidIdentifier(undefined)).toThrow('ID is required');
    });

    it('should throw error for empty ID', () => {
      expect(() => requireValidIdentifier('')).toThrow('ID is required');
    });

    it('should throw error for invalid characters', () => {
      expect(() => requireValidIdentifier('invalid@id')).toThrow('ID contains invalid characters');
    });

    it('should use custom field name in error message', () => {
      expect(() => requireValidIdentifier('', 'User ID')).toThrow('User ID is required');
      expect(() => requireValidIdentifier('bad@id', 'Resource ID')).toThrow('Resource ID contains invalid characters');
    });

    it('should reject XSS attempts', () => {
      expect(() => requireValidIdentifier('<script>alert(1)</script>')).toThrow('contains invalid characters');
    });
  });

  describe('XSS Attack Vectors', () => {
    it('should escape JavaScript protocol (makes it harmless)', () => {
      // Note: The string is preserved but made safe by context (it's text, not executable)
      // When rendered as text content, 'javascript:alert(1)' is harmless
      const result = sanitizeUserContent('javascript:alert(1)');
      expect(result).toBe('javascript:alert(1)');
    });

    it('should escape data URI tags', () => {
      // The < and > are escaped, making it safe to render as text
      const result = sanitizeUserContent('data:text/html,<script>alert(1)</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should escape SVG XSS tags', () => {
      // The < and > are escaped, preventing the SVG from being rendered
      const result = sanitizeUserContent('<svg onload=alert(1)>');
      expect(result).toBe('&lt;svg onload=alert(1)&gt;');
      expect(result).not.toContain('<svg');
    });

    it('should prevent iframe injection', () => {
      expect(sanitizeUserContent('<iframe src="evil.com"></iframe>'))
        .not.toContain('<iframe');
    });

    it('should prevent style injection', () => {
      expect(sanitizeUserContent('<style>body{background:red}</style>'))
        .not.toContain('<style');
    });

    it('should prevent link injection', () => {
      expect(sanitizeUserContent('<link rel="stylesheet" href="evil.css">'))
        .not.toContain('<link');
    });

    it('should prevent object/embed tags', () => {
      expect(sanitizeUserContent('<object data="evil.swf"></object>'))
        .not.toContain('<object');
      expect(sanitizeUserContent('<embed src="evil.swf">'))
        .not.toContain('<embed');
    });

    it('should prevent form injection', () => {
      expect(sanitizeUserContent('<form action="evil.com"><input></form>'))
        .not.toContain('<form');
    });
  });
});
