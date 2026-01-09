/**
 * Security Tests for Phase 2, Group B: Simple Resource Sharing
 *
 * These tests verify that the resource sharing implementation is secure against:
 * - XSS (Cross-Site Scripting) via resource names, descriptions, tags
 * - URL injection via photo URLs
 * - Attribute breaking attacks
 * - Invalid identifier attacks
 *
 * Following solarpunk values:
 * - Security through simplicity
 * - Privacy protection
 * - Community safety
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, LocalDatabase } from '../core/database';
import {
  escapeHtml,
  sanitizeUserContent,
  sanitizeAttribute,
  sanitizeUrl,
  validateIdentifier,
  requireValidIdentifier,
} from '../utils/sanitize';
import {
  postResource,
  updateResource,
  searchResources,
} from './resource-posting';
import { postItemToShare, updateItem } from './resource-sharing';

describe('Sanitization Utilities - Security Tests', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(escapeHtml("'test'")).toBe('&#039;test&#039;');
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle Unicode characters', () => {
      expect(escapeHtml('你好 🌻')).toBe('你好 🌻');
    });
  });

  describe('sanitizeUserContent', () => {
    it('should handle undefined', () => {
      expect(sanitizeUserContent(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUserContent('  hello  ')).toBe('hello');
    });

    it('should escape XSS payloads', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg/onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(1)">',
      ];

      for (const payload of xssPayloads) {
        const sanitized = sanitizeUserContent(payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
      }
    });
  });

  describe('sanitizeAttribute', () => {
    it('should remove characters that break attributes', () => {
      expect(sanitizeAttribute('test"value')).toBe('testvalue');
      expect(sanitizeAttribute("test'value")).toBe('testvalue');
      expect(sanitizeAttribute('test<value')).toBe('testvalue');
      expect(sanitizeAttribute('test>value')).toBe('testvalue');
      expect(sanitizeAttribute('test=value')).toBe('testvalue');
      expect(sanitizeAttribute('test`value')).toBe('testvalue');
    });

    it('should replace newlines with spaces', () => {
      expect(sanitizeAttribute('line1\nline2')).toBe('line1 line2');
      expect(sanitizeAttribute('line1\rline2')).toBe('line1 line2');
    });

    it('should trim whitespace', () => {
      expect(sanitizeAttribute('  test  ')).toBe('test');
    });
  });

  describe('sanitizeUrl', () => {
    describe('allowed URL schemes', () => {
      it('should allow blob: URLs', () => {
        const blobUrl = 'blob:http://localhost:3000/12345-abcd';
        expect(sanitizeUrl(blobUrl)).toBe(blobUrl);
      });

      it('should allow data:image/ URLs', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
        expect(sanitizeUrl(dataUrl)).toBe(dataUrl);
      });

      it('should allow https:// URLs', () => {
        const httpsUrl = 'https://example.com/image.jpg';
        expect(sanitizeUrl(httpsUrl)).toBe(httpsUrl);
      });

      it('should allow http:// URLs', () => {
        const httpUrl = 'http://example.com/image.jpg';
        expect(sanitizeUrl(httpUrl)).toBe(httpUrl);
      });
    });

    describe('blocked URL schemes', () => {
      it('should block javascript: URLs', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
      });

      it('should block data: URLs that are not images', () => {
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
        expect(sanitizeUrl('data:application/javascript,alert(1)')).toBe('');
      });

      it('should block vbscript: URLs', () => {
        expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      });

      it('should block file: URLs', () => {
        expect(sanitizeUrl('file:///etc/passwd')).toBe('');
      });

      it('should block ftp: URLs', () => {
        expect(sanitizeUrl('ftp://example.com/file')).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined', () => {
        expect(sanitizeUrl(undefined)).toBe('');
      });

      it('should handle empty string', () => {
        expect(sanitizeUrl('')).toBe('');
      });

      it('should trim whitespace', () => {
        expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      });

      it('should escape HTML in HTTPS URLs', () => {
        const maliciousUrl = 'https://example.com/path?q=<script>';
        const sanitized = sanitizeUrl(maliciousUrl);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('&lt;script&gt;');
      });
    });
  });

  describe('validateIdentifier', () => {
    it('should accept valid identifiers', () => {
      expect(validateIdentifier('abc123')).toBe(true);
      expect(validateIdentifier('user-1')).toBe(true);
      expect(validateIdentifier('item_2')).toBe(true);
      expect(validateIdentifier('ABC-123_def')).toBe(true);
    });

    it('should reject invalid identifiers', () => {
      expect(validateIdentifier('')).toBe(false);
      expect(validateIdentifier(undefined)).toBe(false);
      expect(validateIdentifier('<script>')).toBe(false);
      expect(validateIdentifier('id with space')).toBe(false);
      expect(validateIdentifier('id/slash')).toBe(false);
      expect(validateIdentifier('id.dot')).toBe(false);
    });
  });

  describe('requireValidIdentifier', () => {
    it('should return valid identifier', () => {
      expect(requireValidIdentifier('valid-id')).toBe('valid-id');
    });

    it('should throw for undefined', () => {
      expect(() => requireValidIdentifier(undefined)).toThrow('ID is required');
    });

    it('should throw for invalid identifier', () => {
      expect(() => requireValidIdentifier('<script>')).toThrow('contains invalid characters');
    });

    it('should use custom field name in error', () => {
      expect(() => requireValidIdentifier(undefined, 'User ID')).toThrow('User ID is required');
    });
  });
});

describe('Resource Sharing - Security Integration Tests', () => {
  beforeEach(async () => {
    await db.init();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('XSS Prevention in Resource Creation', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      '"><script>alert(1)</script><"',
      "'-alert(1)-'",
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should escape XSS payload in name: ${payload.substring(0, 30)}...`, async () => {
        const resource = await postItemToShare(
          'test-user',
          payload,
          'Safe description',
          'tool',
          'give'
        );

        // HTML should be escaped (< becomes &lt;) so it cannot execute
        expect(resource.name).not.toContain('<script');
        expect(resource.name).not.toContain('<img');
        expect(resource.name).not.toContain('<svg');
        expect(resource.name).not.toContain('<body');
        expect(resource.name).not.toContain('<input');
        // Escaped content should contain HTML entities
        if (payload.includes('<')) {
          expect(resource.name).toContain('&lt;');
        }
      });

      it(`should escape XSS payload in description: ${payload.substring(0, 30)}...`, async () => {
        const resource = await postItemToShare(
          'test-user',
          'Safe name',
          payload,
          'tool',
          'give'
        );

        // HTML should be escaped so it cannot execute
        expect(resource.description).not.toContain('<script');
        expect(resource.description).not.toContain('<img');
        expect(resource.description).not.toContain('<svg');
        expect(resource.description).not.toContain('<body');
        // Escaped content should contain HTML entities
        if (payload.includes('<')) {
          expect(resource.description).toContain('&lt;');
        }
      });
    });

    it('should escape XSS in tags', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Safe name',
        'Safe description',
        'tool',
        'give',
        {
          tags: ['<script>alert(1)</script>', 'safe-tag'],
        }
      );

      // Tags should have HTML escaped
      expect(resource.tags?.[0]).not.toContain('<script');
      expect(resource.tags?.[0]).toContain('&lt;script&gt;');
      expect(resource.tags?.[1]).toBe('safe-tag');
    });

    it('should sanitize XSS in location', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Safe name',
        'Safe description',
        'tool',
        'give',
        {
          location: '<script>alert("XSS")</script>North Oakland',
        }
      );

      expect(resource.location).not.toContain('<script');
    });
  });

  describe('XSS Prevention in Resource Updates', () => {
    it('should escape updated name', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Original name',
        'Description',
        'tool',
        'give'
      );

      await updateItem(resource.id, {
        name: '<script>alert(1)</script>Updated',
      });

      const updated = db.getResource(resource.id);
      // Should be escaped, not contain raw HTML tag
      expect(updated?.name).not.toContain('<script');
      expect(updated?.name).toContain('&lt;script&gt;');
    });

    it('should escape updated description', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Name',
        'Original description',
        'tool',
        'give'
      );

      await updateItem(resource.id, {
        description: '<img src=x onerror=alert(1)>Updated',
      });

      const updated = db.getResource(resource.id);
      // Should be escaped, not contain raw HTML tag
      expect(updated?.description).not.toContain('<img');
      expect(updated?.description).toContain('&lt;img');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty resource name', async () => {
      await expect(
        postResource({
          name: '',
          description: 'Description',
          resourceType: 'tool',
          shareMode: 'give',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Resource name is required');
    });

    it('should reject empty description', async () => {
      await expect(
        postResource({
          name: 'Name',
          description: '',
          resourceType: 'tool',
          shareMode: 'give',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Resource description is required');
    });

    it('should reject invalid owner ID', async () => {
      await expect(
        postResource({
          name: 'Name',
          description: 'Description',
          resourceType: 'tool',
          shareMode: 'give',
          ownerId: '<script>',
        })
      ).rejects.toThrow('invalid characters');
    });
  });

  describe('No Tracking or Surveillance', () => {
    it('should not store tracking data with resources', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Test Item',
        'Test Description',
        'tool',
        'give'
      );

      // Verify no tracking fields exist
      expect(resource).not.toHaveProperty('ipAddress');
      expect(resource).not.toHaveProperty('userAgent');
      expect(resource).not.toHaveProperty('sessionId');
      expect(resource).not.toHaveProperty('trackingId');
      expect(resource).not.toHaveProperty('analyticsId');
      expect(resource).not.toHaveProperty('deviceId');
    });

    it('should only contain expected fields', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Test Item',
        'Test Description',
        'tool',
        'give'
      );

      const allowedFields = [
        'id',
        'name',
        'description',
        'resourceType',
        'shareMode',
        'available',
        'ownerId',
        'location',
        'photos',
        'tags',
        'createdAt',
        'updatedAt',
      ];

      const actualFields = Object.keys(resource);
      for (const field of actualFields) {
        expect(allowedFields).toContain(field);
      }
    });
  });

  describe('Unicode and Special Character Handling', () => {
    it('should handle Unicode characters in names', async () => {
      const resource = await postItemToShare(
        'test-user',
        '工具 🔧 Инструмент',
        'Description',
        'tool',
        'give'
      );

      expect(resource.name).toContain('工具');
      expect(resource.name).toContain('🔧');
      expect(resource.name).toContain('Инструмент');
    });

    it('should handle emojis in descriptions', async () => {
      const resource = await postItemToShare(
        'test-user',
        'Name',
        'Description with 🌻🌈✨ emojis',
        'tool',
        'give'
      );

      expect(resource.description).toContain('🌻');
      expect(resource.description).toContain('🌈');
      expect(resource.description).toContain('✨');
    });

    it('should handle RTL text', async () => {
      const resource = await postItemToShare(
        'test-user',
        'مطرقة', // Hammer in Arabic
        'أداة للمشاركة', // Tool for sharing
        'tool',
        'give'
      );

      expect(resource.name).toBe('مطرقة');
    });
  });

  describe('Search Security', () => {
    it('should not execute code in search queries', async () => {
      await postItemToShare(
        'test-user',
        'Normal Tool',
        'A regular tool for sharing',
        'tool',
        'give'
      );

      // These should not cause errors or execute code
      const results1 = searchResources('<script>alert(1)</script>');
      expect(Array.isArray(results1)).toBe(true);

      const results2 = searchResources('${alert(1)}');
      expect(Array.isArray(results2)).toBe(true);

      const results3 = searchResources('{{constructor.constructor("alert(1)")()}}');
      expect(Array.isArray(results3)).toBe(true);
    });
  });
});
