import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Camera, 
  Upload, 
  ShieldCheck, 
  Check, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText,
  Sparkles,
  ShoppingBag,
  Package,
  BarChart3,
  Truck,
  Users,
  Receipt,
  Settings,
  Smile,
  Crown
} from 'lucide-react';
import { UserAccount, UserPermissions, StoreSettings } from '../types';
import { BitmojiAvatarSelector, defaultBitmojiPresets, bitmojiToDataUri } from './BitmojiAvatarSelector';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: UserAccount) => void;
  editingAccount?: UserAccount | null;
  settings: StoreSettings;
}

const defaultPermissions: UserPermissions = {
  canAccessPOS: true,
  canManageProducts: true,
  canViewReports: true,
  canManageSuppliers: true,
  canManageCustomers: true,
  canManageOrders: true,
  canManageSettings: false,
};

const adminPermissions: UserPermissions = {
  canAccessDashboard: true,
  canAccessPOS: true,
  canManageProducts: true,
  canManageInventoryAudit: true,
  canManagePurchases: true,
  canManageSuppliers: true,
  canManageCustomers: true,
  canManageOrders: true,
  canViewInvoices: true,
  canViewAnalytics: true,
  canViewReports: true,
  canManageSettings: true,
};

const cashierPermissions: UserPermissions = {
  canAccessDashboard: false,
  canAccessPOS: true,
  canManageProducts: false,
  canManageInventoryAudit: false,
  canManagePurchases: false,
  canManageSuppliers: false,
  canManageCustomers: true,
  canManageOrders: false,
  canViewInvoices: false,
  canViewAnalytics: false,
  canViewReports: false,
  canManageSettings: false,
};

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSaveAccount,
  editingAccount,
  settings,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Cashier'>('Cashier');
  const [specialization, setSpecialization] = useState('كاشير مبيعات وتجارة المفرد');
  const [gender, setGender] = useState('ذكر');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [nationalIdFile, setNationalIdFile] = useState('laila.png');
  const [resumeFile, setResumeFile] = useState('cv_document.pdf');
  const [avatar, setAvatar] = useState(bitmojiToDataUri(defaultBitmojiPresets[0].config));
  const [isBitmojiModalOpen, setIsBitmojiModalOpen] = useState(false);

  const [permissions, setPermissions] = useState<UserPermissions>(cashierPermissions);

  useEffect(() => {
    if (editingAccount) {
      setFullName(editingAccount.fullName || '');
      setEmail(editingAccount.email || '');
      setUsername(editingAccount.username || '');
      setPassword(editingAccount.password || '123456');
      setRole(editingAccount.role || 'Cashier');
      setSpecialization(editingAccount.specialization || (editingAccount.role === 'Admin' ? 'مدير عام المنظومة' : 'كاشير مبيعات'));
      setGender(editingAccount.gender || 'أنثى');
      setAddress(editingAccount.address || 'الإبراهيمية 2 - 63 شارع عمر لطفى');
      setPhone(editingAccount.phone || '+20 1126732118');
      setBio(editingAccount.bio || 'مسؤول عن الكاشير وإدارة المبيعات والتسليمات اليومية');
      setNationalIdFile(editingAccount.nationalIdFile || 'laila.png');
      setAvatar(editingAccount.avatar || bitmojiToDataUri(defaultBitmojiPresets[0].config));
      setPermissions(editingAccount.permissions || (editingAccount.role === 'Admin' ? adminPermissions : cashierPermissions));
    } else {
      // Reset defaults for new account (clean blank form)
      setFullName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setRole('Admin');
      setSpecialization('مدير النظام والمسؤول العام');
      setGender('ذكر');
      setAddress('');
      setPhone('');
      setBio('');
      setNationalIdFile('');
      setResumeFile('');
      setAvatar(bitmojiToDataUri(defaultBitmojiPresets[0].config));
      setPermissions(adminPermissions);
    }
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (selectedRole: 'Admin' | 'Manager' | 'Cashier') => {
    setRole(selectedRole);
    if (selectedRole === 'Admin') {
      setPermissions(adminPermissions);
      setSpecialization('مدير نظام وشريك عام');
    } else if (selectedRole === 'Manager') {
      setPermissions(defaultPermissions);
      setSpecialization('مدير الفرع والمخزن');
    } else {
      setPermissions(cashierPermissions);
      setSpecialization('كاشير مبيعات ونقطة البيع');
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username) return;

    const savedUser: UserAccount = {
      id: editingAccount ? editingAccount.id : `usr-${Date.now()}`,
      fullName,
      email: email || `${username}@supermarket.com`,
      username,
      password: password || '123456',
      role,
      active: editingAccount ? editingAccount.active : true,
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString().split('T')[0],
      phone,
      address,
      bio,
      gender,
      specialization,
      nationalIdFile,
      avatar,
      permissions,
    };

    onSaveAccount(savedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      
      {/* Outer Card Styled to match the User's Image Reference */}
      <div className="bg-[#FAF9F6] text-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden my-auto border border-emerald-900/20 font-sans" dir={isAr || isKu ? 'rtl' : 'ltr'}>
        
        {/* TOP HEADER BAR */}
        <div className="p-6 pb-2 flex items-center justify-between border-b border-slate-200">
          
          {/* Black Circular Close Icon Button (Matching Screenshot Top Left) */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Main Title (Matching Screenshot Top Right) */}
          <div className="text-right rtl:text-right ltr:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {editingAccount ? (isKu ? 'دەستکاری کردنی پرۆفایل' : isAr ? 'تعديل الملف الشخصي' : 'Edit User Profile') : (isKu ? 'دروستکردنی هەژماری نوێ و دەسەڵاتەکان' : isAr ? 'إنشاء حساب جديد وترخيص الصلاحيات' : 'Create New Account')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isKu ? 'تکایە زانیارییەکانی بەکارهێنەر، وشەی تێپەڕ و دەسەڵاتەکان دیاری بکە' : isAr ? 'قم بإدخال بيانات المستخدم وربط اسم المستخدم وكلمة المرور بالدخول مع الصلاحيات' : 'Enter user details, password credentials, and grant granular permissions'}
            </p>
          </div>

        </div>

        {/* FORM CONTENT BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* SECTION 1: BIO & AVATAR ROW (Matching Top Right Image Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Bio Field (Takes Left 8 cols in Arabic RTL) */}
            <div className="md:col-span-8 space-y-1.5 order-2 md:order-1">
              <label className="text-xs font-bold text-slate-700 block text-right rtl:text-right">
                {isKu ? 'دەربارەی بەکارهێنەر / پێناسەی کار' : isAr ? 'نبذة عنك / الوصف الوظيفي' : 'About You / Bio'}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={isKu ? 'بەرپرسی فرۆشتن، کڕین و هتد...' : isAr ? 'أخصائي مبيعات وإدارة الكاشير...' : 'Describe job role or notes...'}
                className="w-full bg-[#EDEDED] text-slate-900 placeholder-slate-400 p-3.5 rounded-2xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all text-xs leading-relaxed font-semibold resize-none shadow-inner"
              />
            </div>

            {/* Profile Picture Circle & 3D Bitmoji Selection Row */}
            <div className="md:col-span-4 flex flex-col items-center justify-center order-1 md:order-2 space-y-2">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-emerald-500/30 overflow-hidden bg-purple-50 shadow-lg flex items-center justify-center">
                  <img
                    src={avatar}
                    alt={fullName || 'Avatar'}
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Pencil Edit Icon Pill on Image Edge */}
                <label className="absolute bottom-1 left-1 bg-emerald-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors" title={isKu ? 'وێنەیەک لە کۆمپیوتەر دابنێ' : isAr ? 'رفع صورة من الجهاز' : 'Upload photo'}>
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatar(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              </div>

              {/* Button to Open 3D Bitmoji Gallery & Customizer Studio */}
              <button
                type="button"
                onClick={() => setIsBitmojiModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[11px] font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 mt-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isKu ? 'هەڵبژاردنی بتمۆجی 3D' : isAr ? 'اختر بيتموجي 3D' : 'Pick 3D Bitmoji'}</span>
              </button>

              {/* Quick Preset Avatars Bar */}
              <div className="flex items-center gap-1.5 pt-1">
                {defaultBitmojiPresets.slice(0, 4).map(preset => {
                  const dataUri = bitmojiToDataUri(preset.config);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatar(dataUri)}
                      className="w-7 h-7 rounded-full border-2 border-slate-200 hover:border-purple-600 hover:scale-110 overflow-hidden bg-purple-50 transition-all cursor-pointer shadow-sm"
                      title={isKu ? preset.nameAr : isAr ? preset.nameAr : preset.nameEn}
                    >
                      <img src={dataUri} alt="Preset" className="w-full h-full object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SECTION 2: 2-COLUMN INPUT GRID (Matching Exact Layout in Reference Image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-800">
            
            {/* 1. Name Field (الاسم) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ناوی تەواو' : isAr ? 'الاسم الكامل' : 'Full Name'}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isKu ? 'ئاراس ئەحمەد' : isAr ? 'ليلى سمير' : 'e.g. Laila Samir'}
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-bold"
              />
            </div>

            {/* 2. Email Field (البريد الالكتروني) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ئیمەیڵ' : isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@supermarket.com"
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-mono"
              />
            </div>

            {/* 3. Username Field (اسم المستخدم للدخول) */}
            <div className="space-y-1">
              <label className="text-slate-700 block font-bold text-emerald-800">
                {isKu ? 'ناوی بەکارهێنەر (بۆ چوونەژوورەوە)' : isAr ? 'اسم المستخدم (لربطه بصفحة الدخول)' : 'Username (For Login)'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cashier1"
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-mono font-bold"
              />
            </div>

            {/* 4. Password Field (الرقم السري) */}
            <div className="space-y-1">
              <label className="text-slate-700 block font-bold text-emerald-800">
                {isKu ? 'وشەی تێپەڕبوون' : isAr ? 'الرقم السري (كلمة المرور)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#EDEDED] text-slate-900 p-3 pl-10 rtl:pl-3 rtl:pr-10 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 5. Role / Title (التخصص) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ڕۆڵ / نازناوی کار' : isAr ? 'التخصص / المسمى الوظيفي' : 'Role / Title'}</label>
              <div className="flex gap-2">
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as any)}
                  className="bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-bold cursor-pointer"
                >
                  <option value="Cashier">🛒 {isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier'}</option>
                  <option value="Manager">👔 {isKu ? 'بەڕێوەبەری لک' : isAr ? 'مدير فرع' : 'Manager'}</option>
                  <option value="Admin">👤 {isKu ? 'بەڕێوەبەری گشتی' : isAr ? 'مدير نظام' : 'Admin'}</option>
                </select>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder={isKu ? 'کاشێر و فرۆشیار' : isAr ? 'أخصائي مبيعات كاشير' : 'e.g. Senior Specialist'}
                  className="flex-1 bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* 6. Gender (النوع) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ڕەگەز' : isAr ? 'النوع' : 'Gender'}</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="ذكر">{isKu ? 'نێر' : isAr ? 'ذكر' : 'Male'}</option>
                <option value="أنثى">{isKu ? 'مێ' : isAr ? 'أنثى' : 'Female'}</option>
              </select>
            </div>

            {/* 7. Address (العنوان) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ناونیشان' : isAr ? 'العنوان' : 'Address'}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isKu ? 'هەولێر / سلێمانی / دهۆک' : isAr ? 'الإبراهيمية 2 - شارع عمر لطفى' : 'e.g. 63 Omar Lotfy St'}
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              />
            </div>

            {/* 8. Phone (التليفون) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'ژمارەی مۆبایل' : isAr ? 'التليفون' : 'Phone Number'}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+964 750 000 0000"
                className="w-full bg-[#EDEDED] text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-mono"
              />
            </div>

            {/* 9. National ID Attachment (بطاقة الرقم القومي) - Matching Screenshot File Pill */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'کارت / بەڵگەنامەی ناسنامە' : isAr ? 'بطاقة الرقم القومي / المرفق' : 'National ID File'}</label>
              <div className="flex items-center justify-between bg-[#EDEDED] p-2 rounded-xl border border-transparent">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">
                  <span>📄</span>
                  <span>{nationalIdFile || (isKu ? 'هیچ پەڕگەیەک دیاری نەکراوە' : isAr ? 'لم يتم تحديد ملف' : 'No file selected')}</span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-800 text-[11px] font-bold cursor-pointer transition-colors">
                  {isKu ? 'هەڵبژاردنی پەڕگە' : isAr ? 'اختر ملف' : 'Browse File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setNationalIdFile(e.target.files[0].name);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* 10. Resume/Doc Attachment (السيرة الذاتية / المستندات) */}
            <div className="space-y-1">
              <label className="text-slate-700 block">{isKu ? 'سیڤی / بەڵگەنامەی گرێبەست' : isAr ? 'السيرة الذاتية / العقود' : 'Resume / Documents'}</label>
              <div className="flex items-center justify-between bg-[#EDEDED] p-2 rounded-xl border border-transparent">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">
                  <span>📑</span>
                  <span>{resumeFile || (isKu ? 'هیچ پەڕگەیەک دیاری نەکراوە' : isAr ? 'لم يتم تحديد ملف' : 'No file selected')}</span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-800 text-[11px] font-bold cursor-pointer transition-colors">
                  {isKu ? 'هەڵبژاردنی پەڕگە' : isAr ? 'اختر ملف' : 'Browse File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setResumeFile(e.target.files[0].name);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

          </div>

          {/* SECTION 3: GRANULAR SYSTEM PERMISSIONS FOR ADMIN (صلاحيات المستخدم في النظام) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>{isKu ? 'دیاریکردنی دەسەڵاتەکانی ئەم هەژمارە لە سیستەمدا' : isAr ? 'تحديد صلاحيات هذا الحساب داخل المنظومة (صلاحيات مدير النظام)' : 'Assign Granular System Permissions'}</span>
              </h3>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermissions(adminPermissions)}
                  className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-[10px] font-bold hover:bg-purple-200"
                >
                  {isKu ? 'هەموو دەسەڵاتەکان' : isAr ? 'منح كافة الصلاحيات' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => setPermissions(cashierPermissions)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold hover:bg-emerald-200"
                >
                  {isKu ? 'تەنها کاشێر' : isAr ? 'صلاحيات كاشير فقط' : 'Cashier Only'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              {isKu 
                ? 'دەتوانیت هەر بەشێکی سیستەم بە جیاواز بۆ ئەم هەژمارە کارا یا ناچالاک بکەیت' 
                : isAr 
                ? 'يمكنك تفعيل أو إلغاء تفعيل أي قسم في البرنامج لهذا الحساب بشكل مستقل' 
                : 'Toggle accessible system sections specifically for this user account.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
              
              {/* 1. POS */}
              <div
                onClick={() => togglePermission('canAccessPOS')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canAccessPOS 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'کاشێر و فرۆشتنی خێرا (POS)' : isAr ? 'الكاشير والبيع السريع (POS)' : 'POS & Cashier'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canAccessPOS ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canAccessPOS ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 2. Products */}
              <div
                onClick={() => togglePermission('canManageProducts')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canManageProducts 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'بەڕێوەبردنی کاڵاکان و نرخەکان' : isAr ? 'إدارة الأصناف والمنتجات' : 'Products & Pricing'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canManageProducts ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canManageProducts ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 3. Dashboard */}
              <div
                onClick={() => setPermissions(p => ({ ...p, canAccessDashboard: !(p.canAccessDashboard !== false) }))}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canAccessDashboard !== false 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'داشبۆرد و کورتەی سەرەکی' : isAr ? 'لوحة التحكم الرئيسية والمالية' : 'Main Overview Dashboard'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canAccessDashboard !== false ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canAccessDashboard !== false ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 4. Reports */}
              <div
                onClick={() => togglePermission('canViewReports')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canViewReports 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'ڕاپۆرتەکانی فرۆش و قازانج' : isAr ? 'تقارير الأرباح والمبيعات' : 'Profit & Sales Reports'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canViewReports ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canViewReports ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 5. Analytics */}
              <div
                onClick={() => setPermissions(p => ({ ...p, canViewAnalytics: !(p.canViewAnalytics ?? p.canViewReports) }))}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  (permissions.canViewAnalytics ?? permissions.canViewReports)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'شیکارییە پێشکەوتووەکان و زیرەکی دەستکرد' : isAr ? 'تحليلات الأداء والذكاء الاصطناعي' : 'AI Analytics & Forecast'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(permissions.canViewAnalytics ?? permissions.canViewReports) ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(permissions.canViewAnalytics ?? permissions.canViewReports) ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 6. Purchases */}
              <div
                onClick={() => setPermissions(p => ({ ...p, canManagePurchases: !(p.canManagePurchases ?? p.canManageProducts) }))}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  (permissions.canManagePurchases ?? permissions.canManageProducts)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'پسوولەکانی کڕین و دابینکردن' : isAr ? 'فواتير الشراء والتجهيز' : 'Purchase Invoices'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(permissions.canManagePurchases ?? permissions.canManageProducts) ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(permissions.canManagePurchases ?? permissions.canManageProducts) ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 7. Inventory Audit */}
              <div
                onClick={() => setPermissions(p => ({ ...p, canManageInventoryAudit: !(p.canManageInventoryAudit ?? p.canManageProducts) }))}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  (permissions.canManageInventoryAudit ?? permissions.canManageProducts)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'جیاکردنەوە و پشکنینی کۆگا' : isAr ? 'جرد وتفتيش المخزون' : 'Stock Audit & Inventory'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(permissions.canManageInventoryAudit ?? permissions.canManageProducts) ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(permissions.canManageInventoryAudit ?? permissions.canManageProducts) ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 8. Suppliers */}
              <div
                onClick={() => togglePermission('canManageSuppliers')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canManageSuppliers 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'تۆماری دابینکەران و کۆمپانیاکان' : isAr ? 'سجل الموردين والشركات' : 'Suppliers & Vendors'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canManageSuppliers ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canManageSuppliers ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 9. Customers */}
              <div
                onClick={() => togglePermission('canManageCustomers')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canManageCustomers 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'بەڕێوەبردنی کڕیاران و قەرزەکان' : isAr ? 'إدارة العملاء والزبائن والديون' : 'Customers & Loyalty'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canManageCustomers ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canManageCustomers ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 10. Invoices */}
              <div
                onClick={() => setPermissions(p => ({ ...p, canViewInvoices: !(p.canViewInvoices ?? p.canManageOrders) }))}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  (permissions.canViewInvoices ?? permissions.canManageOrders)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'تۆماری پسوولە و فرۆشراوەکان' : isAr ? 'سجل الفواتير والمقبوضات' : 'Saved Sales Invoices'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(permissions.canViewInvoices ?? permissions.canManageOrders) ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${(permissions.canViewInvoices ?? permissions.canManageOrders) ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 11. Orders */}
              <div
                onClick={() => togglePermission('canManageOrders')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canManageOrders 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'داواکارییەکان و نامەکانی بازاڕ' : isAr ? 'طلبات الشحنات ورسائل السوق' : 'Market Orders'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canManageOrders ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canManageOrders ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 12. Settings */}
              <div
                onClick={() => togglePermission('canManageSettings')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                  permissions.canManageSettings 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm' 
                    : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <span>{isKu ? 'بەڕێوەبردنی ڕێکخستنەکان و هەژمارەکان' : isAr ? 'إدارة الإعدادات وصلاحيات الحسابات' : 'System Settings & Users'}</span>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${permissions.canManageSettings ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${permissions.canManageSettings ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

            </div>
          </div>

          {/* BOTTOM CTA BUTTON (Matching Sage Green/Teal Pill in Screenshot "حفظ التغييرات") */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              className="px-12 py-3.5 rounded-2xl bg-[#7BAE9E] hover:bg-[#689B8B] text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{isKu ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Bitmoji 3D Avatar Selector Modal */}
      <BitmojiAvatarSelector
        isOpen={isBitmojiModalOpen}
        onClose={() => setIsBitmojiModalOpen(false)}
        onSelectAvatar={(newAvatarUri) => {
          setAvatar(newAvatarUri);
          setIsBitmojiModalOpen(false);
        }}
        currentAvatar={avatar}
        isAr={isAr}
      />

    </div>
  );
};
