/**
 * Tests for Photo Upload functionality
 * REQ-SHARE-001: Physical Items (Buy-Nothing) - Photo uploads for items
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhotoStorage, validatePhotos, compressImage } from './photo-upload';

describe('PhotoStorage', () => {
  let storage: PhotoStorage;

  beforeEach(async () => {
    storage = new PhotoStorage();
    await storage.init();
  });

  afterEach(async () => {
    // Clean up - delete all test photos
    const info = await storage.getStorageInfo();
    // In a real test, you'd iterate and clean up
  });

  describe('storePhoto', () => {
    it('should store a valid photo', async () => {
      // Create a mock image file
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock image loading for test environment
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          // Simulate successful load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as any;

      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const resourceId = 'test-resource-123';
      const metadata = await storage.storePhoto(resourceId, file);

      expect(metadata.id).toBeDefined();
      expect(metadata.resourceId).toBe(resourceId);
      expect(metadata.filename).toBe('test.jpg');
      expect(metadata.mimeType).toBe('image/jpeg');
      expect(metadata.uploadedAt).toBeGreaterThan(0);
    });

    it('should reject files that are too large', async () => {
      // Create a file larger than MAX_FILE_SIZE (5MB)
      const largeData = new Array(6 * 1024 * 1024).fill('x').join('');
      const file = new File([largeData], 'large.jpg', { type: 'image/jpeg' });

      const resourceId = 'test-resource-123';

      await expect(storage.storePhoto(resourceId, file)).rejects.toThrow(
        'Photo size exceeds maximum'
      );
    });

    it('should reject non-image files', async () => {
      const file = new File(['not an image'], 'test.txt', { type: 'text/plain' });
      const resourceId = 'test-resource-123';

      await expect(storage.storePhoto(resourceId, file)).rejects.toThrow(
        'File must be an image'
      );
    });
  });

  describe('getResourcePhotos', () => {
    it('should retrieve photos for a specific resource', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as any;

      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const resourceId = 'test-resource-456';
      const file1 = new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['image2'], 'photo2.jpg', { type: 'image/jpeg' });

      await storage.storePhoto(resourceId, file1);
      await storage.storePhoto(resourceId, file2);

      const photos = await storage.getResourcePhotos(resourceId);

      expect(photos.length).toBe(2);
      expect(photos.every(p => p.metadata.resourceId === resourceId)).toBe(true);
    });

    it('should return empty array for resource with no photos', async () => {
      const photos = await storage.getResourcePhotos('nonexistent-resource');
      expect(photos).toEqual([]);
    });
  });

  describe('deletePhoto', () => {
    it('should delete a photo by ID', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as any;

      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const resourceId = 'test-resource-789';
      const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      const metadata = await storage.storePhoto(resourceId, file);

      await storage.deletePhoto(metadata.id);

      const photo = await storage.getPhoto(metadata.id);
      expect(photo).toBeUndefined();
    });
  });

  describe('deleteResourcePhotos', () => {
    it('should delete all photos for a resource', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as any;

      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      const resourceId = 'test-resource-delete';
      const file1 = new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['image2'], 'photo2.jpg', { type: 'image/jpeg' });

      await storage.storePhoto(resourceId, file1);
      await storage.storePhoto(resourceId, file2);

      await storage.deleteResourcePhotos(resourceId);

      const photos = await storage.getResourcePhotos(resourceId);
      expect(photos).toEqual([]);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage statistics', async () => {
      const info = await storage.getStorageInfo();

      expect(info).toHaveProperty('photoCount');
      expect(info).toHaveProperty('totalSize');
      expect(typeof info.photoCount).toBe('number');
      expect(typeof info.totalSize).toBe('number');
    });
  });
});

describe('validatePhotos', () => {
  it('should accept valid image files', async () => {
    const file1 = new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['image2'], 'photo2.png', { type: 'image/png' });

    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    const result = await validatePhotos([file1, file2]);

    expect(result.valid.length).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('should reject non-image files', async () => {
    const file1 = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    const file2 = new File(['text'], 'doc.txt', { type: 'text/plain' });

    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    const result = await validatePhotos([file1, file2]);

    expect(result.valid.length).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Not an image file');
  });

  it('should reject files that are too large', async () => {
    const largeData = new Array(6 * 1024 * 1024).fill('x').join('');
    const file = new File([largeData], 'large.jpg', { type: 'image/jpeg' });

    const result = await validatePhotos([file]);

    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('File too large');
  });

  it('should reject more than max photos', async () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      new File(['image'], `photo${i}.jpg`, { type: 'image/jpeg' })
    );

    const result = await validatePhotos(files);

    expect(result.valid.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('Maximum 5 photos allowed');
  });
});

describe('compressImage', () => {
  it('should compress large images', async () => {
    // This test requires a browser environment with canvas support
    // In a real test environment, you'd use jsdom or similar

    const file = new File(['large image data'], 'large.jpg', { type: 'image/jpeg' });

    // Mock canvas and image
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 3000;
      height = 2000;

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    const mockCanvas = {
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['compressed'], { type: 'image/jpeg' });
        callback(blob);
      }),
      width: 0,
      height: 0,
    };

    global.document = {
      createElement: vi.fn(() => mockCanvas),
    } as any;

    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    const compressed = await compressImage(file);

    expect(compressed).toBeInstanceOf(File);
    expect(compressed.type).toBe('image/jpeg');
  });
});
