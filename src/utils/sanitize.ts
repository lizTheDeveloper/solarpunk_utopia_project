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
 * Returns the value if safe, empty string if not
 */
export function validateIdentifier(id: string | undefined): string {
  if (!id) return '';
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return '';
  return id;
}
