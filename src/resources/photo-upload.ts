/**
 * Photo Upload Functionality for Resource Sharing
 * REQ-SHARE-001: Physical Items (Buy-Nothing) - Photo uploads for items
 *
 * Implements privacy-preserving, offline-first photo storage for shared resources.
 * Photos are stored locally in IndexedDB and can be synced p2p without cloud storage.
 */

import { openDB, type IDBPDatabase } from 'idb';

const PHOTO_DB_NAME = 'solarpunk-photos';
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE = 'photos';

// Maximum file size: 5MB (reasonable for old phones, can be compressed)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Maximum photos per resource
const MAX_PHOTOS_PER_RESOURCE = 5;

export interface PhotoMetadata {
  id: string;
  resourceId: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  uploadedAt: number;
  thumbnail?: string; // Base64 thumbnail for quick preview
}

export interface StoredPhoto {
  id: string;
  metadata: PhotoMetadata;
  data: Blob;
}

/**
 * Photo storage manager using IndexedDB
 * Stores photos as Blobs for efficient offline storage
 */
export class PhotoStorage {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(PHOTO_DB_NAME, PHOTO_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          store.createIndex('resourceId', 'metadata.resourceId', { unique: false });
        }
      },
    });
  }

  /**
   * Store a photo for a resource
   */
  async storePhoto(resourceId: string, file: File): Promise<PhotoMetadata> {
    if (!this.db) await this.init();

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Photo size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate unique ID
    const photoId = crypto.randomUUID();

    // Get image dimensions
    const dimensions = await this.getImageDimensions(file);

    // Create thumbnail
    const thumbnail = await this.createThumbnail(file, 150, 150);

    // Create metadata
    const metadata: PhotoMetadata = {
      id: photoId,
      resourceId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      uploadedAt: Date.now(),
      thumbnail,
    };

    // Store photo
    const storedPhoto: StoredPhoto = {
      id: photoId,
      metadata,
      data: file,
    };

    await this.db!.put(PHOTO_STORE, storedPhoto);

    return metadata;
  }

  /**
   * Get photo by ID
   */
  async getPhoto(photoId: string): Promise<StoredPhoto | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get(PHOTO_STORE, photoId);
  }

  /**
   * Get all photos for a resource
   */
  async getResourcePhotos(resourceId: string): Promise<StoredPhoto[]> {
    if (!this.db) await this.init();
    const index = this.db!.transaction(PHOTO_STORE).store.index('resourceId');
    return await index.getAll(IDBKeyRange.only(resourceId));
  }

  /**
   * Get photo metadata for a resource (without blob data)
   */
  async getResourcePhotoMetadata(resourceId: string): Promise<PhotoMetadata[]> {
    const photos = await this.getResourcePhotos(resourceId);
    return photos.map(p => p.metadata);
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(PHOTO_STORE, photoId);
  }

  /**
   * Delete all photos for a resource
   */
  async deleteResourcePhotos(resourceId: string): Promise<void> {
    const photos = await this.getResourcePhotos(resourceId);
    for (const photo of photos) {
      await this.deletePhoto(photo.id);
    }
  }

  /**
   * Get image dimensions from file
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Create a thumbnail from an image file
   * Returns base64-encoded thumbnail for quick preview
   */
  private createThumbnail(
    file: File,
    maxWidth: number,
    maxHeight: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(file);

      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Calculate thumbnail dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw thumbnail
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to create thumbnail'));
      };

      img.src = url;
    });
  }

  /**
   * Convert stored photo to object URL for display
   */
  createPhotoURL(photo: StoredPhoto): string {
    return URL.createObjectURL(photo.data);
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    photoCount: number;
    totalSize: number;
  }> {
    if (!this.db) await this.init();
    const allPhotos = await this.db!.getAll(PHOTO_STORE);

    return {
      photoCount: allPhotos.length,
      totalSize: allPhotos.reduce((sum, p) => sum + p.metadata.size, 0),
    };
  }
}

// Singleton instance
export const photoStorage = new PhotoStorage();

/**
 * Helper function to validate and prepare photos for upload
 */
export async function validatePhotos(files: FileList | File[]): Promise<{
  valid: File[];
  errors: string[];
}> {
  const valid: File[] = [];
  const errors: string[] = [];

  const fileArray = Array.from(files);

  if (fileArray.length > MAX_PHOTOS_PER_RESOURCE) {
    errors.push(`Maximum ${MAX_PHOTOS_PER_RESOURCE} photos allowed per resource`);
    return { valid: [], errors };
  }

  for (const file of fileArray) {
    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: Not an image file`);
      continue;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `${file.name}: File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
      );
      continue;
    }

    // Check if image can be loaded
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve();
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Invalid image'));
        };

        img.src = url;
      });

      valid.push(file);
    } catch (err) {
      errors.push(`${file.name}: Invalid or corrupted image`);
    }
  }

  return { valid, errors };
}

/**
 * Compress image if needed (for old phones with limited storage)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw compressed image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create new file from blob
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
