// Utility for managing user-provided Gemini API Key in browser storage and requests

const STORAGE_KEY = 'gemini_api_key_custom';

export function getCustomGeminiKey(): string {
  try {
    const directKey = localStorage.getItem(STORAGE_KEY);
    if (directKey && directKey.trim().length > 5) {
      return directKey.trim();
    }
    const localPrefs = localStorage.getItem('pos_device_local_preferences_v1');
    if (localPrefs) {
      const parsed = JSON.parse(localPrefs);
      if (parsed.geminiApiKey && typeof parsed.geminiApiKey === 'string' && parsed.geminiApiKey.trim().length > 5) {
        return parsed.geminiApiKey.trim();
      }
    }
  } catch (err) {
    console.warn('Could not read custom Gemini key:', err);
  }
  return '';
}

export function saveCustomGeminiKey(key: string): void {
  try {
    const cleanKey = (key || '').trim();
    if (cleanKey) {
      localStorage.setItem(STORAGE_KEY, cleanKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Keep device preferences in sync
    const localPrefs = localStorage.getItem('pos_device_local_preferences_v1');
    if (localPrefs) {
      const parsed = JSON.parse(localPrefs);
      parsed.geminiApiKey = cleanKey;
      localStorage.setItem('pos_device_local_preferences_v1', JSON.stringify(parsed));
    }
  } catch (err) {
    console.warn('Could not save custom Gemini key:', err);
  }
}

export function getGeminiAuthHeaders(): Record<string, string> {
  const customKey = getCustomGeminiKey();
  if (customKey) {
    return {
      'x-gemini-api-key': customKey
    };
  }
  return {};
}
