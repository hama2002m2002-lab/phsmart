import { getGoogleAccessToken, signInWithGoogle } from './authWorkspace';

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime?: string;
  size?: string;
}

export interface GoogleDriveBackupPayload {
  version: string;
  exportedAt: string;
  storeName: string;
  totalProducts: number;
  totalSales: number;
  data: {
    products: any[];
    salesHistory: any[];
    suppliers: any[];
    customers: any[];
    purchaseInvoices: any[];
    userAccounts: any[];
    orders: any[];
    notifications: any[];
    damagedLogs: any[];
    delegateReturns: any[];
    operatingExpenses: any[];
    customExpenseTypes: any[];
    cashAdjustments: any[];
    inventoryAudits: any[];
    settings: any;
  };
}

/**
 * Ensure we have a valid access token for Google Drive API calls
 */
export async function ensureDriveAccessToken(): Promise<string> {
  let token = await getGoogleAccessToken();
  if (!token) {
    // Trigger Google Sign in flow to acquire fresh token
    const res = await signInWithGoogle();
    token = res.accessToken;
  }
  if (!token) {
    throw new Error('يرجى تسجيل الدخول بحساب Google لمنح صلاحية Google Drive');
  }
  return token;
}

/**
 * Upload a JSON backup file to Google Drive
 */
export async function uploadBackupToGoogleDrive(
  token: string, 
  filename: string, 
  payload: GoogleDriveBackupPayload
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const fileContent = JSON.stringify(payload, null, 2);
    const metadata = {
      name: filename,
      mimeType: 'application/json',
      description: `نسخة احتياطية لنظام 7amo POS - متجر ${payload.storeName} - ${payload.exportedAt}`
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return { success: true, fileId: data.id };
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);
    return { success: false, error: err.message || 'فشل رفع النسخة الاحتياطية إلى Google Drive' };
  }
}

/**
 * List previous backup files stored by the app in Google Drive
 */
export async function listGoogleDriveBackups(token: string): Promise<GoogleDriveBackupFile[]> {
  try {
    const query = encodeURIComponent("mimeType = 'application/json' and trashed = false and name contains 'hama_pos_backup'");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=createdTime desc&pageSize=30`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive List failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Google Drive List Backups Error:', err);
    throw err;
  }
}

/**
 * Download a backup file content from Google Drive
 */
export async function downloadGoogleDriveBackup(token: string, fileId: string): Promise<any> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive Download failed with status ${res.status}`);
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error('Google Drive Download Error:', err);
    throw err;
  }
}

/**
 * Delete a backup file from Google Drive (Mandatory user confirmation required)
 */
export async function deleteGoogleDriveBackup(token: string, fileId: string, fileName: string): Promise<boolean> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok && res.status !== 204) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive Delete failed with status ${res.status}`);
    }

    return true;
  } catch (err: any) {
    console.error('Google Drive Delete Error:', err);
    throw err;
  }
}
