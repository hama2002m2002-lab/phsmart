import { CustomerDisplayPayload } from '../types';

const CHANNEL_NAME = 'pharma_customer_display_channel';
const STORAGE_KEY = 'pharma_customer_display_state';

let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or restricted in iframe:', e);
}

/**
 * Broadcast current customer display state to any connected customer displays (popups, tabs, second monitors)
 */
export function broadcastCustomerDisplay(data: CustomerDisplayPayload) {
  try {
    // 1. Post via BroadcastChannel
    if (broadcastChannel) {
      broadcastChannel.postMessage(data);
    }
  } catch (err) {
    console.warn('Failed to post to BroadcastChannel:', err);
  }

  try {
    // 2. Fallback / Synchronize via localStorage for cross-window / tab listening
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save customer display to localStorage:', err);
  }
}

/**
 * Retrieve current customer display state from localStorage
 */
export function getInitialCustomerDisplayData(): CustomerDisplayPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as CustomerDisplayPayload;
    }
  } catch (err) {
    console.warn('Failed to load initial customer display data:', err);
  }
  return null;
}

/**
 * Subscribe to live updates from the cashier POS
 */
export function subscribeCustomerDisplay(callback: (data: CustomerDisplayPayload) => void): () => void {
  // Broadcast channel handler
  const handleMessage = (event: MessageEvent) => {
    if (event.data) {
      callback(event.data as CustomerDisplayPayload);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }

  // Storage event handler for cross-window fallback
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as CustomerDisplayPayload;
        callback(parsed);
      } catch (err) {
        console.warn('Failed to parse storage event data:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorage);

  // Return unsubscribe cleanup function
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Open or focus the Customer Display in an external dedicated secondary window
 */
export function openCustomerDisplayWindow(): Window | null {
  try {
    // Calculate 2nd monitor / pleasant popup dimensions
    const width = 1050;
    const height = 750;
    const left = window.screen.availWidth ? Math.max(0, window.screen.availWidth - width - 50) : 100;
    const top = 50;

    const url = `${window.location.origin}${window.location.pathname}?view=customer-display#customer-display`;
    const win = window.open(
      url,
      'PharmaCustomerDisplayWindow',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );

    if (win) {
      win.focus();
    }
    return win;
  } catch (e) {
    console.error('Failed to open customer display window:', e);
    return null;
  }
}
