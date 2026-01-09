/**
 * HTML Sanitization Utilities
 * Prevents XSS attacks while rendering user-generated content
 */

/**
 * Escape HTML special characters to prevent XSS
 * Converts: < > & " ' to their HTML entity equivalents
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize text for use in HTML attributes
 * Stricter than escapeHtml - removes any characters that could break out of attributes
 */
export function sanitizeAttribute(value: string): string {
  // Remove any characters that could break attribute context
  return value
    .replace(/[<>"'`=]/g, '')
    .replace(/[\n\r]/g, ' ')
    .trim();
}

/**
 * Sanitize user input for display
 * Use this for any user-generated content that will be displayed
 */
export function sanitizeUserContent(content: string | undefined): string {
  if (!content) return '';
  return escapeHtml(content.trim());
}

/**
 * Validate that a string is a safe identifier (for IDs, etc.)
 * Returns true if valid, false if not
 */
export function validateIdentifier(id: string | undefined): boolean {
  if (!id) return false;
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return false;
  return true;
}

/**
 * Validate and sanitize an identifier, throwing an error if invalid
 * Use this when you need to ensure an ID is valid before proceeding
 */
export function requireValidIdentifier(id: string | undefined, fieldName: string = 'ID'): string {
  if (!id) {
    throw new Error(`${fieldName} is required`);
  }
  if (!validateIdentifier(id)) {
    throw new Error(`${fieldName} contains invalid characters`);
  }
  return id;
}

/**
 * Sanitize a URL for use in HTML src/href attributes
 * Only allows safe URL schemes: blob:, data:image/, https://, http://
 * Prevents javascript: and other dangerous protocols
 */
export function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // Allow blob URLs (used by photo-upload for IndexedDB storage)
  if (trimmedUrl.startsWith('blob:')) {
    return trimmedUrl;
  }

  // Allow data URLs but only for images
  if (trimmedUrl.startsWith('data:image/')) {
    return trimmedUrl;
  }

  // Allow https and http URLs
  if (trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://')) {
    // Escape any HTML characters that might be in the URL
    return escapeHtml(trimmedUrl);
  }

  // For any other scheme, return empty string (prevents javascript:, etc.)
  return '';
}
