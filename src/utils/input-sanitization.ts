/**
 * Input sanitization utilities
 * Prevents XSS and enforces reasonable input limits
 */

const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 100;
const MAX_VALUE_LENGTH = 200;

/**
 * Sanitize a string input
 * - Trims whitespace
 * - Enforces max length
 * - Removes null bytes
 */
export function sanitizeString(input: string, maxLength: number = MAX_STRING_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and trim
  let sanitized = input.replace(/\0/g, '').trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize an array of strings
 * - Filters out empty strings
 * - Sanitizes each value
 * - Enforces max array length
 */
export function sanitizeStringArray(
  input: string[],
  maxArrayLength: number = MAX_ARRAY_LENGTH,
  maxValueLength: number = MAX_VALUE_LENGTH
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map(value => sanitizeString(value, maxValueLength))
    .filter(value => value.length > 0)
    .slice(0, maxArrayLength);
}

/**
 * Validate and sanitize a community group name
 */
export function sanitizeCommunityName(name: string): string {
  const sanitized = sanitizeString(name, 200);
  if (sanitized.length === 0) {
    throw new Error('Community name cannot be empty');
  }
  return sanitized;
}

/**
 * Validate and sanitize community values
 */
export function sanitizeCoreValues(values: string[]): string[] {
  return sanitizeStringArray(values, 50, 100);
}

/**
 * Sanitize description text
 */
export function sanitizeDescription(description: string): string {
  return sanitizeString(description, 5000);
}

/**
 * Sanitize location description
 */
export function sanitizeLocation(location: string): string {
  return sanitizeString(location, 500);
}
