/**
 * Data Export/Import Utilities
 *
 * Implements REQ-DEPLOY-012: Data Portability
 * Users can export their complete data and move it between platforms
 *
 * Features:
 * - Export to JSON file
 * - Import from JSON file
 * - Automatic backups
 * - Privacy-preserving exports
 */

(function(window) {
  'use strict';

  /**
   * Data Export Manager
   */
  class DataExportManager {
    constructor() {
      this.autoBackupEnabled = false;
      this.autoBackupInterval = null;
    }

    /**
     * Export all data to downloadable JSON file
     */
    async exportToFile() {
      try {
        console.log('[Export] Exporting data...');

        // Get data from database
        const data = await window.SolarpunkDB.export();

        // Create JSON blob
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const filename = `solarpunk-backup-${this.formatDate()}.json`;

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        console.log('[Export] Data exported:', filename);
        return { success: true, filename };
      } catch (error) {
        console.error('[Export] Export failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Import data from file
     */
    async importFromFile(file) {
      try {
        console.log('[Import] Importing data from file...');

        // Read file
        const text = await this.readFile(file);
        const data = JSON.parse(text);

        // Validate data structure
        if (!this.validateExport(data)) {
          throw new Error('Invalid export file format');
        }

        // Import to database
        await window.SolarpunkDB.import(data);

        console.log('[Import] Data imported successfully');
        return { success: true };
      } catch (error) {
        console.error('[Import] Import failed:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Read file as text
     */
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }

    /**
     * Validate export data structure
     */
    validateExport(data) {
      return (
        data &&
        typeof data === 'object' &&
        data.version &&
        data.exportTime &&
        data.stores &&
        typeof data.stores === 'object'
      );
    }

    /**
     * Format date for filename
     */
    formatDate() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      return `${year}${month}${day}-${hour}${minute}`;
    }

    /**
     * Save to localStorage as backup
     * (Limited by storage quota, but useful for quick recovery)
     */
    async saveToLocalStorage() {
      try {
        const data = await window.SolarpunkDB.export();
        const json = JSON.stringify(data);

        // Check size (localStorage typically has ~5MB limit)
        const sizeKB = new Blob([json]).size / 1024;
        if (sizeKB > 4000) {
          console.warn('[Export] Data too large for localStorage:', sizeKB, 'KB');
          return { success: false, error: 'Data too large' };
        }

        localStorage.setItem('solarpunk-backup', json);
        localStorage.setItem('solarpunk-backup-time', Date.now().toString());

        console.log('[Export] Backup saved to localStorage');
        return { success: true };
      } catch (error) {
        console.error('[Export] Failed to save to localStorage:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Restore from localStorage backup
     */
    async restoreFromLocalStorage() {
      try {
        const json = localStorage.getItem('solarpunk-backup');
        if (!json) {
          return { success: false, error: 'No backup found' };
        }

        const data = JSON.parse(json);
        await window.SolarpunkDB.import(data);

        console.log('[Import] Restored from localStorage backup');
        return { success: true };
      } catch (error) {
        console.error('[Import] Failed to restore from localStorage:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Enable automatic backups to localStorage
     */
    enableAutoBackup(intervalMinutes = 60) {
      if (this.autoBackupInterval) {
        this.disableAutoBackup();
      }

      this.autoBackupEnabled = true;
      this.autoBackupInterval = setInterval(() => {
        // Don't backup in low power mode
        if (window.SolarpunkBattery && window.SolarpunkBattery.isLowPower()) {
          console.log('[Export] Skipping auto-backup - low power mode');
          return;
        }

        this.saveToLocalStorage();
      }, intervalMinutes * 60 * 1000);

      console.log(`[Export] Auto-backup enabled (every ${intervalMinutes} minutes)`);
    }

    /**
     * Disable automatic backups
     */
    disableAutoBackup() {
      if (this.autoBackupInterval) {
        clearInterval(this.autoBackupInterval);
        this.autoBackupInterval = null;
        this.autoBackupEnabled = false;
        console.log('[Export] Auto-backup disabled');
      }
    }

    /**
     * Get backup information
     */
    getBackupInfo() {
      const backupTime = localStorage.getItem('solarpunk-backup-time');
      const backup = localStorage.getItem('solarpunk-backup');

      if (!backup || !backupTime) {
        return {
          exists: false,
          time: null,
          size: 0
        };
      }

      return {
        exists: true,
        time: new Date(parseInt(backupTime)),
        size: new Blob([backup]).size
      };
    }

    /**
     * Export specific data types
     * For privacy-preserving selective exports
     */
    async exportResourcesOnly() {
      const data = await window.SolarpunkDB.export();
      return {
        version: data.version,
        nodeId: data.nodeId,
        exportTime: data.exportTime,
        stores: {
          resources: data.stores.resources
        }
      };
    }

    async exportNeedsOnly() {
      const data = await window.SolarpunkDB.export();
      return {
        version: data.version,
        nodeId: data.nodeId,
        exportTime: data.exportTime,
        stores: {
          needs: data.stores.needs
        }
      };
    }

    /**
     * Share data (for federation/sync)
     * Returns only public data, excluding private fields
     */
    async exportForSharing() {
      const data = await window.SolarpunkDB.export();

      // Filter out private data
      for (const storeName in data.stores) {
        data.stores[storeName] = data.stores[storeName].map(doc => {
          // Remove private fields
          const { _private, ...publicDoc } = doc;
          return publicDoc;
        });
      }

      return data;
    }
  }

  /**
   * Public API
   */
  window.SolarpunkExport = {
    manager: new DataExportManager(),

    /**
     * Export to file
     */
    async exportToFile() {
      return await this.manager.exportToFile();
    },

    /**
     * Import from file
     */
    async importFromFile(file) {
      return await this.manager.importFromFile(file);
    },

    /**
     * Save backup to localStorage
     */
    async saveBackup() {
      return await this.manager.saveToLocalStorage();
    },

    /**
     * Restore from localStorage backup
     */
    async restoreBackup() {
      return await this.manager.restoreFromLocalStorage();
    },

    /**
     * Enable automatic backups
     */
    enableAutoBackup(intervalMinutes) {
      this.manager.enableAutoBackup(intervalMinutes);
    },

    /**
     * Disable automatic backups
     */
    disableAutoBackup() {
      this.manager.disableAutoBackup();
    },

    /**
     * Get backup info
     */
    getBackupInfo() {
      return this.manager.getBackupInfo();
    },

    /**
     * Export specific data
     */
    async exportResources() {
      return await this.manager.exportResourcesOnly();
    },

    async exportNeeds() {
      return await this.manager.exportNeedsOnly();
    },

    /**
     * Export for sharing/federation
     */
    async exportForSharing() {
      return await this.manager.exportForSharing();
    },

    /**
     * Create file input for import
     */
    createImportInput(onComplete) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const result = await this.importFromFile(file);
          if (onComplete) onComplete(result);
        }
      };
      return input;
    }
  };

  console.log('[Export] Data export/import module loaded');

})(window);
