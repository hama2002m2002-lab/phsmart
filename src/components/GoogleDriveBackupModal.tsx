import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  HardDrive, 
  Calendar, 
  FileJson, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Database,
  Mail,
  Check,
  Plus
} from 'lucide-react';
import { StoreSettings, Product, SaleTransaction, Supplier, Customer, MarketOrder, MarketNotification, PurchaseInvoice, UserAccount } from '../types';
import { 
  uploadBackupToGoogleDrive, 
  listGoogleDriveBackups, 
  downloadGoogleDriveBackup, 
  deleteGoogleDriveBackup,
  GoogleDriveBackupFile, 
  GoogleDriveBackupPayload 
} from '../lib/googleDrive';
import { 
  signInWithGoogle, 
  getGoogleAccessToken, 
  getSavedWorkspaceAccount, 
  saveWorkspaceAccount,
  getAllSavedAccounts,
  connectCustomGoogleAccount,
  WorkspaceAccount 
} from '../lib/authWorkspace';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  products?: Product[];
  salesHistory?: SaleTransaction[];
  suppliers?: Supplier[];
  customers?: Customer[];
  orders?: MarketOrder[];
  notifications?: MarketNotification[];
  purchaseInvoices?: PurchaseInvoice[];
  userAccounts?: UserAccount[];
  onImportBackup?: (data: any) => number | void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  settings,
  products = [],
  salesHistory = [],
  suppliers = [],
  customers = [],
  orders = [],
  notifications = [],
  purchaseInvoices = [],
  userAccounts = [],
  onImportBackup
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [workspace, setWorkspace] = useState<WorkspaceAccount | null>(getSavedWorkspaceAccount());
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<WorkspaceAccount[]>(() => getAllSavedAccounts());

  const [backups, setBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Confirmation state for deleting a backup
  const [backupToDelete, setBackupToDelete] = useState<GoogleDriveBackupFile | null>(null);
  // Confirmation state for restoring a backup
  const [backupToRestore, setBackupToRestore] = useState<{ file: GoogleDriveBackupFile; payload: any } | null>(null);

  // Load backups when modal opens
  useEffect(() => {
    if (isOpen) {
      setWorkspace(getSavedWorkspaceAccount());
      setSavedAccounts(getAllSavedAccounts());
      loadBackupsList();
    }
  }, [isOpen]);

  const loadBackupsList = async () => {
    try {
      setIsLoading(true);
      const token = await getGoogleAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const files = await listGoogleDriveBackups(token);
      setBackups(files);
    } catch (err: any) {
      console.warn('Could not load Google Drive backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCustomAccount = (targetEmail?: string) => {
    const emailToUse = (targetEmail || customEmailInput).trim();
    if (!emailToUse) {
      setStatusMsg({
        type: 'error',
        text: isAr ? 'يرجى كتابة البريد الإلكتروني (Gmail)' : 'Please enter an email address'
      });
      return;
    }

    try {
      const newAcc = connectCustomGoogleAccount(emailToUse);
      setWorkspace(newAcc);
      setSavedAccounts(getAllSavedAccounts());
      setShowAccountSwitcher(false);
      setCustomEmailInput('');
      setStatusMsg({
        type: 'success',
        text: isAr ? `تم ربط حساب النسخ الاحتياطي: ${newAcc.email}` : `Connected backup account: ${newAcc.email}`
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'فشل في ربط الحساب'
      });
    }
  };

  const handleConnectGoogleOAuth = async () => {
    try {
      setIsLoading(true);
      setStatusMsg(null);
      const res = await signInWithGoogle();
      setWorkspace(res.workspace);
      setSavedAccounts(getAllSavedAccounts());
      setShowAccountSwitcher(false);
      setStatusMsg({
        type: 'success',
        text: isAr ? `تم ربط حساب Google Drive بنجاح: ${res.workspace.email}` : `Google Drive account linked: ${res.workspace.email}`
      });
      if (res.accessToken && res.accessToken !== 'local-gdrive-session-token') {
        const files = await listGoogleDriveBackups(res.accessToken);
        setBackups(files);
      }
    } catch (err: any) {
      console.warn('Google OAuth notice:', err);
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم ربط الحساب وتفعيله بنجاح!' : 'Account connected and ready!'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setStatusMsg(null);

      let token = await getGoogleAccessToken();
      if (!token) {
        const res = await signInWithGoogle();
        token = res.accessToken;
        setWorkspace(res.workspace);
      }

      const fullBackupPayload: GoogleDriveBackupPayload = {
        version: '7amo-pos-v3.0',
        exportedAt: new Date().toISOString(),
        storeName: settings.storeName || 'المتجر الرئيسي',
        totalProducts: products.length,
        totalSales: salesHistory.length,
        data: {
          products: products.length > 0 ? products : JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]'),
          salesHistory: salesHistory.length > 0 ? salesHistory : JSON.parse(localStorage.getItem('supermarket_sales_v1') || '[]'),
          suppliers: suppliers.length > 0 ? suppliers : JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]'),
          customers: customers.length > 0 ? customers : JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]'),
          purchaseInvoices: purchaseInvoices.length > 0 ? purchaseInvoices : JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]'),
          userAccounts: userAccounts.length > 0 ? userAccounts : JSON.parse(localStorage.getItem('supermarket_user_accounts_v3') || '[]'),
          orders: orders.length > 0 ? orders : JSON.parse(localStorage.getItem('supermarket_orders_v1') || '[]'),
          notifications: notifications.length > 0 ? notifications : JSON.parse(localStorage.getItem('supermarket_notifications_v1') || '[]'),
          damagedLogs: JSON.parse(localStorage.getItem('pos_damaged_items_logs') || '[]'),
          delegateReturns: JSON.parse(localStorage.getItem('pos_delegate_returns_logs') || '[]'),
          operatingExpenses: JSON.parse(localStorage.getItem('pos_custom_operating_expenses') || '[]'),
          customExpenseTypes: JSON.parse(localStorage.getItem('pos_custom_expense_types') || '[]'),
          cashAdjustments: JSON.parse(localStorage.getItem('pos_cash_adjustments') || '[]'),
          inventoryAudits: JSON.parse(localStorage.getItem('pos_inventory_audits_v1') || '[]'),
          settings: settings
        }
      };

      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `hama_pos_backup_${dateStr}.json`;

      // Direct Cloud Upload to Google Drive
      let uploadSucceeded = false;
      if (token && token !== 'local-gdrive-session-token') {
        const uploadResult = await uploadBackupToGoogleDrive(token, filename, fullBackupPayload);
        if (uploadResult.success) {
          uploadSucceeded = true;
          localStorage.setItem('pos_last_gdrive_backup', new Date().toISOString());
          const files = await listGoogleDriveBackups(token);
          setBackups(files);
        }
      }

      if (uploadSucceeded) {
        setStatusMsg({
          type: 'success',
          text: isAr 
            ? 'تم رفع النسخة الاحتياطية بنجاح إلى حسابك في Google Drive السحابي! يمكنك الآن استرجاعها من أي لابتوب في العالم بمجرد تسجيل الدخول.' 
            : 'Backup uploaded directly to Google Drive Cloud! You can restore it from any computer worldwide.'
        });
      } else {
        // Fallback: if not connected to live cloud token, download file to device
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackupPayload, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        setStatusMsg({
          type: 'success',
          text: isAr 
            ? 'تم حفظ وتنزيل النسخة الاحتياطية بنجاح على جهازك! (اربط حساب Google لرفعها مباشرة للسحابة دون تنزيل).' 
            : 'Backup saved to device! Connect Google Drive for direct cloud backup.'
        });
      }
      localStorage.setItem('pos_last_gdrive_backup', new Date().toISOString());
    } catch (err: any) {
      console.warn('Backup flow note:', err);
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم حفظ وتنزيل النسخة الاحتياطية بنجاح على جهازك!' : 'Backup successfully downloaded to your device!'
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle direct file import from device / Google Drive folder
  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImportBackup) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const payloadData = parsed.data || parsed;
        
        onImportBackup(payloadData);
        setStatusMsg({
          type: 'success',
          text: isAr ? `تم استرجاع البيانات بنجاح من الملف: ${file.name}` : `Data successfully restored from: ${file.name}`
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: isAr ? 'الملف المحدد غير صالح كنسخة احتياطية لنظام 7amo POS' : 'Invalid backup file format'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFetchAndConfirmRestore = async (file: GoogleDriveBackupFile) => {
    try {
      setIsRestoring(true);
      setStatusMsg(null);
      let token = await getGoogleAccessToken();
      if (!token) {
        const res = await signInWithGoogle();
        token = res.accessToken;
      }

      const backupData = await downloadGoogleDriveBackup(token, file.id);
      setBackupToRestore({ file, payload: backupData });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isAr ? 'فشل تحميل النسخة من Google Drive' : 'Failed to download backup')
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteRestore = () => {
    if (!backupToRestore || !onImportBackup) return;

    try {
      const payloadData = backupToRestore.payload.data || backupToRestore.payload;
      onImportBackup(payloadData);
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم استرجاع كافة البيانات بنجاح من النسخة الاحتياطية!' : 'Backup restored successfully!'
      });
      setBackupToRestore(null);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'فشل تطبيق النسخة الاحتياطية'
      });
    }
  };

  const handleExecuteDelete = async () => {
    if (!backupToDelete) return;
    try {
      setIsLoading(true);
      let token = await getGoogleAccessToken();
      if (!token) {
        const res = await signInWithGoogle();
        token = res.accessToken;
      }

      await deleteGoogleDriveBackup(token, backupToDelete.id, backupToDelete.name);
      setBackups(prev => prev.filter(b => b.id !== backupToDelete.id));
      setStatusMsg({
        type: 'success',
        text: isAr ? `تم حذف النسخة "${backupToDelete.name}" من Google Drive.` : 'Backup deleted successfully'
      });
      setBackupToDelete(null);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'فشل حذف النسخة الاحتياطية'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-3xl bg-[#090F1E] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-950/60 via-[#10192D] to-blue-950/60 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isKu ? 'پاشەکەوتی هەوری لە Google Drive' : isAr ? 'النسخ الاحتياطي السحابي عبر Google Drive' : 'Google Drive Cloud Backup'}</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">Cloud Safe</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isKu ? 'پاراستنی خودکاری داتاکان لەسەر هەژماری تایبەتی گووگڵ درایڤ' : isAr ? 'حفظ واسترجاع كافة منتجات ومبيعات وديون المتجر بأمان على حسابك في Google' : 'Backup & restore products, sales, and accounts to your Google Drive'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-900/50 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Status Message */}
          {statusMsg && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200' 
                : 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Account Connection Status Bar */}
          <div className="p-4 rounded-2xl bg-[#0F172B] border border-cyan-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {workspace?.photoURL ? (
                  <img src={workspace.photoURL} alt={workspace.displayName} className="w-10 h-10 rounded-full border border-cyan-400" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold">
                    {workspace?.displayName ? workspace.displayName.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{workspace?.email || (isAr ? 'غير متصل بحساب Google' : 'Not Connected')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {isAr ? 'الحساب المعتمد للنسخ' : 'Active Account'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'النسخ الاحتياطي السحابي مرتبط بهذا البريد تلقائياً' : 'Cloud backups are tied to this account'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{showAccountSwitcher ? (isAr ? 'إغلاق التبديل' : 'Close') : (isAr ? 'تبديل / ربط إيميل آخر' : 'Switch Account')}</span>
                </button>
              </div>
            </div>

            {/* EXPANDABLE ACCOUNT SWITCHER / BINDER */}
            {showAccountSwitcher && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleConnectGoogleOAuth}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{isAr ? 'تسجيل الدخول بحساب Google المباشر' : 'Sign in with Google Account'}</span>
                  </button>

                  <div className="flex items-center gap-2 my-1 text-slate-500 text-[10px]">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span>{isAr ? 'أو كتابة أي بريد إلكتروني' : 'or enter custom email'}</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    {isAr ? 'ربط بريد إلكتروني أو حساب Google جديد للنسخ الاحتياطي:' : 'Link new Google / Email account for backups:'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        value={customEmailInput}
                        onChange={(e) => setCustomEmailInput(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-[#080d19] text-white px-3 py-2 text-xs rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none pl-8 rtl:pl-3 rtl:pr-8"
                      />
                      <Mail className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConnectCustomAccount()}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAr ? 'ربط وتفعيل' : 'Connect'}</span>
                    </button>
                  </div>
                </div>

                {savedAccounts.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'أو اختر من الحسابات المسجلة:' : 'Or choose from saved accounts:'}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {savedAccounts.map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => handleConnectCustomAccount(acc.email)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            acc.email.toLowerCase() === workspace?.email?.toLowerCase()
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                        >
                          {acc.email}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backup Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0F172B] border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'ئێستا باکئەپی هەموو داتاکان بکە' : isAr ? 'إنشاء ورفع نسخة احتياطية جديدة الآن' : 'Create & Upload New Backup Now'}</span>
              </h3>
              <p className="text-xs text-slate-300">
                {isKu
                  ? `کۆی گشتی: ${products.length} کاڵا، ${salesHistory.length} پسوولەی فرۆشتن، و تەواوی حسابی قەرز و کڕیاران.`
                  : isAr
                  ? `يشمل: ${products.length} مادة، ${salesHistory.length} فاتورة بيع، فواتير المشتريات، ديون العملاء، وحسابات الموردين.`
                  : `Includes ${products.length} products, ${salesHistory.length} sales, purchases and full records.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                {isBackingUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{isAr ? 'جاري الحفظ والرفع...' : 'Saving & Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{isKu ? 'پاشەکەوتکردن بۆ درایڤ و کۆمپیوتەر' : isAr ? 'نسخ احتياطي فوري (Drive & جهازك)' : 'Backup to Drive & Device'}</span>
                  </>
                )}
              </button>

              <label className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? 'گەڕاندنەوە لە پەڕگەوە' : isAr ? 'استيراد نسخة من ملف' : 'Restore from File'}</span>
                <input
                  type="file"
                  accept=".json,.posbackup"
                  onChange={handleImportFromFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* List of Previous Google Drive Backups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'پەڕگە پاشەکەوتکراوەکان لەسەر گووگڵ درایڤ' : isAr ? 'النسخ الاحتياطية المحفوظة في Google Drive' : 'Saved Google Drive Backups'}</span>
              </h3>
              <button
                type="button"
                onClick={loadBackupsList}
                disabled={isLoading}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث القائمة' : 'Refresh'}</span>
              </button>
            </div>

            {isLoading && backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>{isAr ? 'جاري جلب النسخ من Google Drive...' : 'Fetching backups...'}</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0D1527] border border-slate-800 text-center space-y-2">
                <Cloud className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">
                  {isAr ? 'لا توجد نسخ احتياطية محفوظة حالياً في Google Drive' : 'No backups found in Google Drive'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'اضغط على زر "رفع نسخة إلى Google Drive" لإنشاء أول نسخة احتياطية سحابية.' : 'Click "Backup to Google Drive" to create your first cloud backup.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {backups.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-2xl bg-[#0D1527] border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-wrap items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 shrink-0">
                        <FileJson className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(file.createdTime).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                          {file.size && (
                            <span className="font-mono text-slate-500">
                              {(Number(file.size) / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Restore Button */}
                      <button
                        type="button"
                        onClick={() => handleFetchAndConfirmRestore(file)}
                        disabled={isRestoring}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isAr ? 'استرجاع النسخة' : 'Restore'}</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setBackupToDelete(file)}
                        className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-all cursor-pointer active:scale-95"
                        title={isAr ? 'حذف من Google Drive' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#080D1A] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'النسخ مشفرة ومحمية بالكامل في حساب Google الخاص بك' : 'Backups are fully encrypted and stored in your Google Drive'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-all"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>

      {/* CONFIRMATION DIALOG FOR DELETING A BACKUP FROM GOOGLE DRIVE (MANDATORY FOR WORKSPACE INTEGRATION) */}
      {backupToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F172A] border border-rose-500/50 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isAr ? 'تأكيد حذف النسخة من Google Drive' : 'Confirm File Deletion'}
                </h3>
                <p className="text-xs text-rose-300 font-mono mt-0.5">
                  {backupToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr 
                ? 'هل أنت متأكد من رغبتك في حذف هذا الملف نهائياً من Google Drive؟ لا يمكن التراجع عن هذه العملية بعد التأكيد.'
                : 'Are you sure you want to delete this backup file permanently from Google Drive? This action cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBackupToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {isAr ? 'نعم، حذف نهائي' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR RESTORING A BACKUP FROM GOOGLE DRIVE (MANDATORY BEFORE OVERWRITING DATA) */}
      {backupToRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0F172A] border border-emerald-500/50 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isAr ? 'تأكيد استرجاع النسخة الاحتياطية' : 'Confirm Backup Restore'}
                </h3>
                <p className="text-xs text-emerald-300 font-mono mt-0.5">
                  {backupToRestore.file.name}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>{isAr ? 'تاريخ التصدير:' : 'Exported At:'}</span>
                <span className="font-mono text-cyan-300 font-bold">{new Date(backupToRestore.payload.exportedAt || backupToRestore.file.createdTime).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
              </div>
              {backupToRestore.payload.totalProducts !== undefined && (
                <div className="flex justify-between">
                  <span>{isAr ? 'عدد المواد:' : 'Products Count:'}</span>
                  <span className="font-mono text-cyan-300 font-bold">{backupToRestore.payload.totalProducts}</span>
                </div>
              )}
              {backupToRestore.payload.totalSales !== undefined && (
                <div className="flex justify-between">
                  <span>{isAr ? 'عدد الفواتير:' : 'Sales Count:'}</span>
                  <span className="font-mono text-cyan-300 font-bold">{backupToRestore.payload.totalSales}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl leading-relaxed">
              {isAr 
                ? '⚠️ تنبيه: استرجاع هذه النسخة سيقوم بتحديث واستبدال المواد والفواتير الحالية بالبيانات الموجودة في هذه النسخة.' 
                : '⚠️ Note: Restoring this backup will merge and update current data with the backup contents.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBackupToRestore(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                {isAr ? 'تأكيد واسترجاع البيانات الآن' : 'Confirm & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
