/**
 * Data export functionality for user sovereignty
 *
 * REQ-DEPLOY-012: Data Portability
 * Users SHALL be able to export their complete data and move it between
 * platforms, communities, or instances.
 */

import type { DatabaseSchema } from '../types';
import { db } from '../core/database';

export interface ExportFormat {
  version: string;
  exportedAt: number;
  data: DatabaseSchema;
  metadata: {
    platform: string;
    communityId: string;
    communityName: string;
  };
}

/**
 * Export all community data as JSON
 */
export function exportAsJSON(): string {
  const doc = db.getDoc();

  const exportData: ExportFormat = {
    version: '1.0.0',
    exportedAt: Date.now(),
    data: doc,
    metadata: {
      platform: 'Solarpunk Utopia Platform',
      communityId: doc.community.id,
      communityName: doc.community.name,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data export as JSON file
 */
export function downloadJSON(filename?: string): void {
  const json = exportAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `solarpunk-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Export as CSV for spreadsheet compatibility
 */
export function exportResourcesAsCSV(): string {
  const resources = db.listResources();

  const headers = [
    'ID',
    'Name',
    'Description',
    'Type',
    'Share Mode',
    'Available',
    'Owner ID',
    'Location',
    'Tags',
    'Created At',
  ];

  const rows = resources.map((r) => [
    r.id,
    r.name,
    r.description,
    r.resourceType,
    r.shareMode,
    r.available ? 'Yes' : 'No',
    r.ownerId,
    r.location || '',
    r.tags?.join('; ') || '',
    new Date(r.createdAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download resources as CSV file
 */
export function downloadResourcesCSV(filename?: string): void {
  const csv = exportResourcesAsCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `solarpunk-resources-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Export complete database binary (for backup/migration)
 */
export function exportBinary(): Uint8Array {
  return db.getBinary();
}

/**
 * Download binary backup
 */
export function downloadBinary(filename?: string): void {
  const binary = exportBinary();
  const blob = new Blob([binary], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `solarpunk-backup-${Date.now()}.automerge`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Import data from file
 */
export async function importFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result;

        if (typeof content === 'string') {
          // JSON import
          const importData = JSON.parse(content) as ExportFormat;
          // TODO: Validate and merge imported data
          console.log('JSON import:', importData);
        } else if (content instanceof ArrayBuffer) {
          // Binary import
          const binary = new Uint8Array(content);
          await db.merge(binary);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);

    // Try to read as text first, fall back to binary
    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
