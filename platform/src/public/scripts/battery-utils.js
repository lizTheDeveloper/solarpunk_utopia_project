/**
 * Battery Optimization Utilities
 *
 * Provides battery-aware functionality for the Solarpunk Platform
 * Designed for devices that may be solar-charged or have limited battery capacity
 *
 * Features:
 * - Battery level monitoring
 * - Adaptive performance based on battery state
 * - Wake lock management
 * - Background task throttling
 */

(function(window) {
  'use strict';

  /**
   * Battery state tracking
   */
  const BatteryState = {
    level: 1.0,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    isLowPower: false,
    isCritical: false
  };

  /**
   * Battery thresholds (configurable)
   */
  const Thresholds = {
    LOW_POWER: 0.20,      // 20% - enable low power mode
    CRITICAL: 0.10,       // 10% - critical battery mode
    RESTORE_NORMAL: 0.30  // 30% - restore normal mode when charging
  };

  /**
   * Power mode callbacks
   */
  const PowerModeCallbacks = {
    onLowPower: [],
    onCritical: [],
    onNormal: []
  };

  /**
   * Battery API wrapper with fallback
   */
  class BatteryManager {
    constructor() {
      this.battery = null;
      this.supported = false;
      this.updateInterval = null;
    }

    async init() {
      try {
        // Try to get battery API
        if ('getBattery' in navigator) {
          this.battery = await navigator.getBattery();
          this.supported = true;

          // Initial state
          this.updateState();

          // Set up event listeners
          this.battery.addEventListener('levelchange', () => this.updateState());
          this.battery.addEventListener('chargingchange', () => this.updateState());
          this.battery.addEventListener('chargingtimechange', () => this.updateState());
          this.battery.addEventListener('dischargingtimechange', () => this.updateState());

          console.log('[Battery] Battery API initialized');
          return true;
        } else {
          console.warn('[Battery] Battery API not supported');
          // Fall back to periodic checking if possible
          this.setupFallback();
          return false;
        }
      } catch (error) {
        console.error('[Battery] Initialization failed:', error);
        this.setupFallback();
        return false;
      }
    }

    setupFallback() {
      // For browsers without Battery API, assume normal power
      // and check localStorage for user preference
      const savedMode = localStorage.getItem('solarpunk-power-mode');
      if (savedMode === 'low') {
        this.enableLowPowerMode();
      }
    }

    updateState() {
      if (!this.battery) return;

      const previousState = { ...BatteryState };

      BatteryState.level = this.battery.level;
      BatteryState.charging = this.battery.charging;
      BatteryState.chargingTime = this.battery.chargingTime;
      BatteryState.dischargingTime = this.battery.dischargingTime;

      // Determine power mode
      const wasLowPower = BatteryState.isLowPower;
      const wasCritical = BatteryState.isCritical;

      if (!BatteryState.charging && BatteryState.level <= Thresholds.CRITICAL) {
        BatteryState.isCritical = true;
        BatteryState.isLowPower = true;
      } else if (!BatteryState.charging && BatteryState.level <= Thresholds.LOW_POWER) {
        BatteryState.isCritical = false;
        BatteryState.isLowPower = true;
      } else if (BatteryState.charging && BatteryState.level >= Thresholds.RESTORE_NORMAL) {
        BatteryState.isCritical = false;
        BatteryState.isLowPower = false;
      }

      // Trigger callbacks on state changes
      if (!wasCritical && BatteryState.isCritical) {
        this.enableCriticalMode();
      } else if (!wasLowPower && BatteryState.isLowPower) {
        this.enableLowPowerMode();
      } else if ((wasLowPower || wasCritical) && !BatteryState.isLowPower) {
        this.enableNormalMode();
      }

      // Log significant changes
      if (Math.abs(previousState.level - BatteryState.level) >= 0.05) {
        console.log(`[Battery] Level: ${(BatteryState.level * 100).toFixed(0)}%`);
      }
    }

    enableCriticalMode() {
      console.warn('[Battery] Critical battery mode enabled');
      document.body.classList.add('critical-power-mode');
      document.body.classList.add('low-power-mode');

      // Notify callbacks
      PowerModeCallbacks.onCritical.forEach(cb => cb(BatteryState));

      // Save preference
      localStorage.setItem('solarpunk-power-mode', 'critical');
    }

    enableLowPowerMode() {
      console.log('[Battery] Low power mode enabled');
      document.body.classList.add('low-power-mode');
      document.body.classList.remove('critical-power-mode');

      // Notify callbacks
      PowerModeCallbacks.onLowPower.forEach(cb => cb(BatteryState));

      // Save preference
      localStorage.setItem('solarpunk-power-mode', 'low');
    }

    enableNormalMode() {
      console.log('[Battery] Normal power mode restored');
      document.body.classList.remove('low-power-mode');
      document.body.classList.remove('critical-power-mode');

      // Notify callbacks
      PowerModeCallbacks.onNormal.forEach(cb => cb(BatteryState));

      // Save preference
      localStorage.setItem('solarpunk-power-mode', 'normal');
    }

    getState() {
      return { ...BatteryState };
    }

    isLowPower() {
      return BatteryState.isLowPower;
    }

    isCritical() {
      return BatteryState.isCritical;
    }
  }

  /**
   * Wake Lock Manager
   * Prevents screen from sleeping during important operations
   * But releases lock to save battery when appropriate
   */
  class WakeLockManager {
    constructor() {
      this.wakeLock = null;
      this.supported = 'wakeLock' in navigator;
    }

    async acquire(reason = 'app-active') {
      if (!this.supported) {
        console.warn('[WakeLock] Wake Lock API not supported');
        return false;
      }

      // Don't acquire wake lock in low power mode
      if (BatteryState.isLowPower) {
        console.log('[WakeLock] Skipping wake lock - low power mode');
        return false;
      }

      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log(`[WakeLock] Acquired: ${reason}`);

        this.wakeLock.addEventListener('release', () => {
          console.log('[WakeLock] Released');
        });

        return true;
      } catch (error) {
        console.error('[WakeLock] Failed to acquire:', error);
        return false;
      }
    }

    async release() {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    }
  }

  /**
   * Adaptive scheduler for background tasks
   * Throttles tasks based on battery state
   */
  class AdaptiveScheduler {
    constructor() {
      this.tasks = [];
      this.intervalId = null;
    }

    /**
     * Schedule a repeating task with adaptive interval
     */
    schedule(name, callback, normalInterval, lowPowerInterval = null) {
      const task = {
        name,
        callback,
        normalInterval,
        lowPowerInterval: lowPowerInterval || normalInterval * 3,
        lastRun: 0,
        nextRun: Date.now()
      };

      this.tasks.push(task);

      // Start scheduler if not running
      if (!this.intervalId) {
        this.start();
      }

      return task;
    }

    start() {
      // Use a single interval for all tasks
      // Check every second and run tasks that are due
      this.intervalId = setInterval(() => {
        this.runDueTasks();
      }, 1000);

      console.log('[Scheduler] Started');
    }

    runDueTasks() {
      const now = Date.now();

      this.tasks.forEach(task => {
        if (now >= task.nextRun) {
          // Determine interval based on power mode
          const interval = BatteryState.isLowPower
            ? task.lowPowerInterval
            : task.normalInterval;

          try {
            task.callback();
            task.lastRun = now;
            task.nextRun = now + interval;
          } catch (error) {
            console.error(`[Scheduler] Task ${task.name} failed:`, error);
          }
        }
      });
    }

    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        console.log('[Scheduler] Stopped');
      }
    }

    cancel(task) {
      const index = this.tasks.indexOf(task);
      if (index !== -1) {
        this.tasks.splice(index, 1);
        console.log(`[Scheduler] Cancelled task: ${task.name}`);
      }
    }
  }

  /**
   * Public API
   */
  window.SolarpunkBattery = {
    manager: new BatteryManager(),
    wakeLock: new WakeLockManager(),
    scheduler: new AdaptiveScheduler(),

    /**
     * Initialize battery monitoring
     */
    async init() {
      return await this.manager.init();
    },

    /**
     * Get current battery state
     */
    getState() {
      return this.manager.getState();
    },

    /**
     * Check if in low power mode
     */
    isLowPower() {
      return this.manager.isLowPower();
    },

    /**
     * Check if in critical mode
     */
    isCritical() {
      return this.manager.isCritical();
    },

    /**
     * Register callback for power mode changes
     */
    onLowPower(callback) {
      PowerModeCallbacks.onLowPower.push(callback);
    },

    onCritical(callback) {
      PowerModeCallbacks.onCritical.push(callback);
    },

    onNormal(callback) {
      PowerModeCallbacks.onNormal.push(callback);
    },

    /**
     * Manually enable low power mode
     */
    enableLowPowerMode() {
      this.manager.enableLowPowerMode();
    },

    /**
     * Estimate time remaining
     */
    getTimeRemaining() {
      const state = this.getState();
      if (state.charging) {
        return {
          charging: true,
          timeToFull: state.chargingTime
        };
      } else {
        return {
          charging: false,
          timeRemaining: state.dischargingTime
        };
      }
    }
  };

  // Auto-initialize if battery API exists
  if ('getBattery' in navigator) {
    window.SolarpunkBattery.init();
  }

})(window);
