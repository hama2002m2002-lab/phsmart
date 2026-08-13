import firebaseConfig from '../../firebase-applet-config.json';

export interface GoogleDriveBackupPayload {
  timestamp: string;
  storeSettings: any;
  productsCount: number;
  salesCount: number;
  data: any;
}

export async function uploadBackupToGoogleDrive(accessToken: string, filename: string, content: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const metadata = {
      name: filename,
      mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
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
    console.error('Google Drive Backup Error:', err);
    return { success: false, error: err.message || 'Failed to upload backup to Google Drive' };
  }
}
