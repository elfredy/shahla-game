// Device tracking utilities

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  language: string;
  platform: string;
  deviceFingerprint: string;
}

export const deviceTracking = {
  // Generate device fingerprint
  generateFingerprint(): string {
    if (typeof window === 'undefined') return '';

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.hardwareConcurrency?.toString() || '',
      (navigator as any).deviceMemory?.toString() || '',
    ];

    // Simple hash function
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },

  // Get device info
  getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        screenWidth: 0,
        screenHeight: 0,
        timezone: '',
        language: '',
        platform: '',
        deviceFingerprint: '',
      };
    }

    return {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      deviceFingerprint: this.generateFingerprint(),
    };
  },

  // Get stored device fingerprint from localStorage
  getStoredFingerprint(email: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = `device_fp_${email.toLowerCase()}`;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  // Store device fingerprint
  storeFingerprint(email: string, fingerprint: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = `device_fp_${email.toLowerCase()}`;
      localStorage.setItem(key, fingerprint);
    } catch {
      // Ignore errors
    }
  },

  // Check if device matches stored fingerprint
  isDeviceAllowed(email: string, currentFingerprint: string): boolean {
    const storedFingerprint = this.getStoredFingerprint(email);
    if (!storedFingerprint) {
      // First time login from this device, allow it
      return true;
    }
    return storedFingerprint === currentFingerprint;
  },
};
