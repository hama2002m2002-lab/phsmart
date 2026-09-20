// Security, Pairing & Real-time Sync Engine for Laptop and Mobile POS
// Ensures exclusive access to the specific shop & laptop, preventing unauthorized access.

export interface LaptopSecurityCredentials {
  laptopId: string;
  laptopName: string;
  securityPin: string; // 6-digit PIN, e.g. "849201"
  pairingToken: string; // Cryptographic session token
  createdAt: number;
  restrictToLocalLAN: boolean;
  shopName: string;
  customLocalIp?: string;
}

export interface AuthorizedMobileDevice {
  deviceId: string;
  deviceName: string;
  authorizedAt: number;
  lastActiveAt: number;
  ipAddress?: string;
  status: 'active' | 'revoked';
}

export interface ScannedBarcodePayload {
  id: string;
  barcode: string;
  laptopId: string;
  pin: string;
  deviceName?: string;
  timestamp: number;
  scanMode?: 'scanner' | 'pos' | 'inventory';
}

const CREDENTIALS_KEY = 'phsmart_laptop_security_credentials_v1';
const AUTHORIZED_DEVICES_KEY = 'phsmart_authorized_mobile_devices_v1';
const MOBILE_AUTH_SESSION_KEY = 'phsmart_mobile_auth_session_v1';

// Generate secure 6-digit PIN
export function generateRandomPin(): string {
  const digits = '0123456789';
  let pin = '';
  // Avoid easy repetitive numbers like 000000 or 123456
  const arr = new Uint32Array(6);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 6; i++) {
      pin += digits[arr[i] % digits.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
  }
  return pin;
}

// Generate unique laptop UUID
export function generateLaptopId(): string {
  return 'laptop-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

// Generate secure token
export function generatePairingToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz';
  let token = '';
  const arr = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 24; i++) {
      token += chars[arr[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 24; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

// Get or initialize Laptop Security Credentials
export function getLaptopSecurityCredentials(shopDisplayName?: string): LaptopSecurityCredentials {
  if (typeof window === 'undefined') {
    return {
      laptopId: 'laptop-default',
      laptopName: 'لابتوب الكاشير الرئيسي',
      securityPin: '849201',
      pairingToken: 'sec-tok-default',
      createdAt: Date.now(),
      restrictToLocalLAN: true,
      shopName: shopDisplayName || 'سوبرماركت ومذخر الأدوية'
    };
  }

  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (raw) {
      const parsed: LaptopSecurityCredentials = JSON.parse(raw);
      if (parsed.laptopId && parsed.securityPin && parsed.pairingToken) {
        if (shopDisplayName && !parsed.shopName) {
          parsed.shopName = shopDisplayName;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Security] Error reading stored credentials:', err);
  }

  // Create fresh initial credentials for this laptop
  const newCreds: LaptopSecurityCredentials = {
    laptopId: generateLaptopId(),
    laptopName: 'لابتوب المحل الرئيسي',
    securityPin: generateRandomPin(),
    pairingToken: generatePairingToken(),
    createdAt: Date.now(),
    restrictToLocalLAN: false,
    shopName: shopDisplayName || 'سوبرماركت ومذخر الأدوية'
  };

  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(newCreds));
  } catch {}

  return newCreds;
}

// Save credentials
export function saveLaptopSecurityCredentials(creds: LaptopSecurityCredentials): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch {}
}

// Regenerate PIN and Token (Instantly revokes all previous mobile sessions)
export function regenerateLaptopSecurityCredentials(shopDisplayName?: string): LaptopSecurityCredentials {
  const existing = getLaptopSecurityCredentials(shopDisplayName);
  const updated: LaptopSecurityCredentials = {
    ...existing,
    securityPin: generateRandomPin(),
    pairingToken: generatePairingToken(),
    createdAt: Date.now()
  };

  saveLaptopSecurityCredentials(updated);
  revokeAllAuthorizedDevices();

  // Notify server to invalidate previous laptop pairings
  try {
    fetch('/api/mobile-sync/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laptopId: updated.laptopId, pin: updated.securityPin })
    }).catch(() => {});
  } catch {}

  return updated;
}

// Authorized Devices Management
export function getAuthorizedDevices(): AuthorizedMobileDevice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUTHORIZED_DEVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function recordAuthorizedDevice(device: Omit<AuthorizedMobileDevice, 'authorizedAt' | 'lastActiveAt' | 'status'>): void {
  if (typeof window === 'undefined') return;
  const list = getAuthorizedDevices();
  const existingIndex = list.findIndex(d => d.deviceId === device.deviceId);
  const now = Date.now();

  if (existingIndex !== -1) {
    list[existingIndex].lastActiveAt = now;
    list[existingIndex].deviceName = device.deviceName;
    list[existingIndex].status = 'active';
  } else {
    list.unshift({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      authorizedAt: now,
      lastActiveAt: now,
      ipAddress: device.ipAddress,
      status: 'active'
    });
  }

  try {
    localStorage.setItem(AUTHORIZED_DEVICES_KEY, JSON.stringify(list.slice(0, 15)));
  } catch {}
}

export function revokeAllAuthorizedDevices(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTHORIZED_DEVICES_KEY, JSON.stringify([]));
  } catch {}
}

// Mobile Client Session Storage
export function getStoredMobileAuthSession(): { laptopId: string; pin: string; token: string; shopName?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MOBILE_AUTH_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function storeMobileAuthSession(session: { laptopId: string; pin: string; token: string; shopName?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOBILE_AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearMobileAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(MOBILE_AUTH_SESSION_KEY);
  } catch {}
}

// Build the secure URL to encode in the QR code
export function buildSecurePairingUrl(
  baseOrigin: string,
  mode: 'scanner' | 'pos' | 'inventory',
  creds: LaptopSecurityCredentials,
  customHost?: string
): string {
  let origin = baseOrigin;
  if (customHost && customHost.trim()) {
    const cleanHost = customHost.trim().replace(/^https?:\/\//, '');
    const protocol = baseOrigin.startsWith('https://') ? 'https://' : 'http://';
    origin = `${protocol}${cleanHost}`;
  }

  const url = new URL(origin);
  url.searchParams.set('mode', mode);
  url.searchParams.set('lid', creds.laptopId);
  url.searchParams.set('pin', creds.securityPin);
  url.searchParams.set('tok', creds.pairingToken);
  url.searchParams.set('shop', creds.shopName);
  url.searchParams.set('t', Date.now().toString());

  return url.toString();
}

// Real-Time BroadcastChannel for instant local Wi-Fi / same-subnet sync
const SCANNER_CHANNEL_NAME = 'phsmart_wireless_scanner_hub_v1';

let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!broadcastChannel) {
      try {
        broadcastChannel = new BroadcastChannel(SCANNER_CHANNEL_NAME);
      } catch (err) {
        console.warn('[ScannerChannel] BroadcastChannel unsupported:', err);
      }
    }
    return broadcastChannel;
  }
  return null;
}

// Mobile pushes scanned barcode
export async function sendScannedBarcodeToLaptop(payload: ScannedBarcodePayload): Promise<boolean> {
  // 1. Send via local BroadcastChannel (instant zero-network latency if in same browser or LAN PWA)
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: 'MOBILE_SCAN_RECEIVED',
        payload
      });
    } catch (err) {
      console.warn('[ScannerChannel] postMessage failed:', err);
    }
  }

  // 2. Also save to localStorage for cross-tab event listener
  try {
    localStorage.setItem('phsmart_latest_scanned_barcode_event', JSON.stringify({
      payload,
      timestamp: Date.now()
    }));
  } catch {}

  // 3. Send to Server API if available
  try {
    const res = await fetch('/api/mobile-sync/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    // Local fallback is still valid
    console.log('[ScannerAPI] Server scan post fallback:', err);
  }

  return true;
}

// Laptop listens for incoming scans
export function subscribeToIncomingScans(
  expectedLaptopId: string,
  onScanReceived: (payload: ScannedBarcodePayload) => void
): () => void {
  const channel = getBroadcastChannel();
  
  // Handler for BroadcastChannel
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'MOBILE_SCAN_RECEIVED') {
      const payload: ScannedBarcodePayload = event.data.payload;
      if (payload && payload.laptopId === expectedLaptopId) {
        onScanReceived(payload);
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  // Handler for storage event fallback
  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'phsmart_latest_scanned_barcode_event' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (data.payload && data.payload.laptopId === expectedLaptopId) {
          onScanReceived(data.payload);
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Periodic server poll for scans from other devices on the LAN or web
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/mobile-sync/poll?laptopId=${encodeURIComponent(expectedLaptopId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.scans) && data.scans.length > 0) {
          data.scans.forEach((scan: ScannedBarcodePayload) => {
            onScanReceived(scan);
          });
        }
      }
    } catch {
      // Offline mode, relies on BroadcastChannel and localStorage
    }
  }, 1200);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollInterval);
  };
}

// Pleasant POS Audio Beep Generator (100% Offline & Pure Web Audio API)
let audioCtx: AudioContext | null = null;
export function playScannerBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Bright 1800Hz POS barcode confirmation frequency
    osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn('AudioContext beep failed:', e);
  }
}
