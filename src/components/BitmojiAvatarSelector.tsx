import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  User, 
  Palette, 
  Glasses, 
  Headphones, 
  Smile, 
  ShieldCheck, 
  Sliders, 
  Shuffle, 
  Download,
  Copy,
  Layers,
  Heart,
  Crown
} from 'lucide-react';

export interface BitmojiConfig {
  gender: 'female' | 'male';
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  outfit: 'hoodie' | 'jacket' | 'sweater' | 'shirt_tie' | 'cashier_apron';
  outfitColor: string;
  expression: 'happy' | 'smile' | 'wink' | 'cool' | 'confident';
  accessory: 'none' | 'glasses' | 'sunglasses' | 'headphones' | 'beanie';
  bgColor: string;
}

export const defaultBitmojiPresets: { id: string; nameAr: string; nameEn: string; category: string; config: BitmojiConfig }[] = [
  {
    id: 'alex_3d',
    nameAr: 'أليكس - هودي بنفسجي (3D)',
    nameEn: 'Alex - Purple Hoodie (3D)',
    category: 'popular',
    config: {
      gender: 'male',
      skinTone: '#F3C5A5',
      hairStyle: 'quiff_trendy',
      hairColor: '#3D2314',
      outfit: 'hoodie',
      outfitColor: '#7C3AED', // Violet/Purple hoodie like screenshot
      expression: 'smile',
      accessory: 'none',
      bgColor: '#EDE9FE'
    }
  },
  {
    id: 'sara_3d',
    nameAr: 'سارة - بلوزة بنفسجية وابتسامة',
    nameEn: 'Sara - Lavender Top',
    category: 'popular',
    config: {
      gender: 'female',
      skinTone: '#F9D3B4',
      hairStyle: 'long_wavy',
      hairColor: '#2B1700',
      outfit: 'sweater',
      outfitColor: '#8B5CF6',
      expression: 'happy',
      accessory: 'none',
      bgColor: '#F3E8FF'
    }
  },
  {
    id: 'michael_headset',
    nameAr: 'مايكل - سماعة كاشير وتواصل',
    nameEn: 'Michael - Support Headset',
    category: 'cashier',
    config: {
      gender: 'male',
      skinTone: '#D1A384',
      hairStyle: 'short_crop',
      hairColor: '#1E1B18',
      outfit: 'cashier_apron',
      outfitColor: '#10B981',
      expression: 'confident',
      accessory: 'headphones',
      bgColor: '#D1FAE5'
    }
  },
  {
    id: 'laila_glasses',
    nameAr: 'ليلى - نظارة طبية وسترة',
    nameEn: 'Laila - Chic Glasses',
    category: 'admin',
    config: {
      gender: 'female',
      skinTone: '#FFE2CD',
      hairStyle: 'bob_cut',
      hairColor: '#4A2C11',
      outfit: 'jacket',
      outfitColor: '#EC4899',
      expression: 'wink',
      accessory: 'glasses',
      bgColor: '#FCE7F3'
    }
  },
  {
    id: 'omar_cool',
    nameAr: 'عمر - جاكيت أصفر ونظارات شمسية',
    nameEn: 'Omar - Cool Yellow Jacket',
    category: 'trendy',
    config: {
      gender: 'male',
      skinTone: '#E0AC8A',
      hairStyle: 'undercut',
      hairColor: '#000000',
      outfit: 'jacket',
      outfitColor: '#F59E0B',
      expression: 'cool',
      accessory: 'sunglasses',
      bgColor: '#FEF3C7'
    }
  },
  {
    id: 'yara_designer',
    nameAr: 'يارا - مصممة بسماعات رأس',
    nameEn: 'Yara - Headphones Girl',
    category: 'trendy',
    config: {
      gender: 'female',
      skinTone: '#FCD5B5',
      hairStyle: 'ponytail',
      hairColor: '#B45309',
      outfit: 'hoodie',
      outfitColor: '#06B6D4',
      expression: 'happy',
      accessory: 'headphones',
      bgColor: '#CFFAFE'
    }
  },
  {
    id: 'hassan_manager',
    nameAr: 'حسن - مدير ببدلة ورابطة عنق',
    nameEn: 'Hassan - Store Manager',
    category: 'admin',
    config: {
      gender: 'male',
      skinTone: '#E2B193',
      hairStyle: 'classic_side',
      hairColor: '#262626',
      outfit: 'shirt_tie',
      outfitColor: '#1E293B',
      expression: 'confident',
      accessory: 'none',
      bgColor: '#E2E8F0'
    }
  },
  {
    id: 'zainab_beanie',
    nameAr: 'زينب - قبعة شتوية وردية',
    nameEn: 'Zainab - Pink Beanie',
    category: 'trendy',
    config: {
      gender: 'female',
      skinTone: '#F3C5A5',
      hairStyle: 'long_straight',
      hairColor: '#582F0E',
      outfit: 'sweater',
      outfitColor: '#F43F5E',
      expression: 'smile',
      accessory: 'beanie',
      bgColor: '#FFE4E6'
    }
  }
];

// SVG Renderer for 3D Claymorphic Bitmoji Avatars
export const generateBitmojiSVG = (cfg: BitmojiConfig): string => {
  const isFemale = cfg.gender === 'female';

  // Hair Paths
  let hairPath = '';
  if (cfg.hairStyle === 'quiff_trendy') {
    hairPath = `
      <path d="M 40 42 C 35 25 50 10 70 8 C 90 6 105 18 102 32 C 108 28 115 35 110 48 C 105 38 95 32 80 32 C 60 32 45 38 40 42 Z" fill="${cfg.hairColor}" />
      <path d="M 42 38 Q 65 15 85 16 Q 100 20 100 28 C 85 20 60 22 42 38 Z" fill="rgba(255,255,255,0.25)" />
    `;
  } else if (cfg.hairStyle === 'long_wavy') {
    hairPath = `
      <path d="M 32 45 C 30 20 50 10 75 10 C 100 10 120 20 118 45 C 122 70 120 110 112 125 C 108 100 108 55 105 45 C 95 35 55 35 45 45 C 42 55 42 100 38 125 C 30 110 28 70 32 45 Z" fill="${cfg.hairColor}" />
      <path d="M 38 60 Q 32 85 36 115 Q 40 85 40 60 Z" fill="${cfg.hairColor}" />
      <path d="M 112 60 Q 118 85 114 115 Q 110 85 110 60 Z" fill="${cfg.hairColor}" />
    `;
  } else if (cfg.hairStyle === 'bob_cut') {
    hairPath = `
      <path d="M 34 45 C 32 18 52 12 75 12 C 98 12 118 18 116 45 C 120 70 115 88 108 90 C 105 60 102 42 75 42 C 48 42 45 60 42 90 C 35 88 30 70 34 45 Z" fill="${cfg.hairColor}" />
    `;
  } else if (cfg.hairStyle === 'undercut') {
    hairPath = `
      <path d="M 42 40 C 40 22 55 12 75 10 C 95 8 110 20 108 38 C 102 28 85 24 70 26 C 55 28 45 35 42 40 Z" fill="${cfg.hairColor}" />
      <path d="M 38 52 Q 40 65 42 72" stroke="${cfg.hairColor}" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <path d="M 112 52 Q 110 65 108 72" stroke="${cfg.hairColor}" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
    `;
  } else if (cfg.hairStyle === 'ponytail') {
    hairPath = `
      <path d="M 36 45 C 34 20 52 12 75 12 C 98 12 116 20 114 45 C 108 38 90 35 75 35 C 60 35 42 38 36 45 Z" fill="${cfg.hairColor}" />
      <ellipse cx="118" cy="55" rx="14" ry="22" fill="${cfg.hairColor}" transform="rotate(25 118 55)" />
    `;
  } else {
    // Short crop default
    hairPath = `
      <path d="M 40 42 C 38 22 55 12 75 12 C 95 12 112 22 110 42 C 105 32 90 28 75 28 C 60 28 45 32 40 42 Z" fill="${cfg.hairColor}" />
    `;
  }

  // Expression Details
  let mouthPath = `<path d="M 64 82 Q 75 94 86 82" stroke="#652B19" strokeWidth="3.5" strokeLinecap="round" fill="none" />`;
  if (cfg.expression === 'happy') {
    mouthPath = `
      <path d="M 62 80 Q 75 98 88 80 Z" fill="#991B1B" />
      <path d="M 65 81 Q 75 87 85 81" fill="#FFFFFF" />
      <path d="M 69 90 Q 75 96 81 90" fill="#F43F5E" />
    `;
  } else if (cfg.expression === 'cool') {
    mouthPath = `<path d="M 64 84 Q 75 88 86 80" stroke="#652B19" strokeWidth="3.5" strokeLinecap="round" fill="none" />`;
  } else if (cfg.expression === 'wink') {
    mouthPath = `<path d="M 65 80 Q 75 92 85 80" stroke="#652B19" strokeWidth="3.5" strokeLinecap="round" fill="#991B1B" />`;
  } else if (cfg.expression === 'confident') {
    mouthPath = `<path d="M 66 84 Q 75 89 84 84" stroke="#652B19" strokeWidth="3.5" strokeLinecap="round" fill="none" />`;
  }

  // Eyebrows
  const eyebrowLeft = `<path d="M 52 54 Q 60 50 68 54" stroke="${cfg.hairColor}" strokeWidth="3.5" strokeLinecap="round" fill="none" />`;
  const eyebrowRight = cfg.expression === 'wink' 
    ? `<path d="M 82 56 Q 90 52 98 54" stroke="${cfg.hairColor}" strokeWidth="3.5" strokeLinecap="round" fill="none" />`
    : `<path d="M 82 54 Q 90 50 98 54" stroke="${cfg.hairColor}" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeWidth="3.5" />`;

  // Eyes
  const leftEye = `<ellipse cx="60" cy="62" rx="5.5" ry="7" fill="#1E293B" /><circle cx="58" cy="60" r="2" fill="#FFFFFF" />`;
  const rightEye = cfg.expression === 'wink'
    ? `<path d="M 84 63 Q 90 58 96 63" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />`
    : `<ellipse cx="90" cy="62" rx="5.5" ry="7" fill="#1E293B" /><circle cx="88" cy="60" r="2" fill="#FFFFFF" />`;

  // Accessories
  let accessorySVG = '';
  if (cfg.accessory === 'glasses') {
    accessorySVG = `
      <rect x="48" y="52" width="24" height="18" rx="5" stroke="#1E293B" strokeWidth="3" fill="rgba(255,255,255,0.2)" />
      <rect x="78" y="52" width="24" height="18" rx="5" stroke="#1E293B" strokeWidth="3" fill="rgba(255,255,255,0.2)" />
      <line x1="72" y1="60" x2="78" y2="60" stroke="#1E293B" strokeWidth="3" />
      <line x1="48" y1="60" x2="40" y2="58" stroke="#1E293B" strokeWidth="2.5" />
      <line x1="102" y1="60" x2="110" y2="58" stroke="#1E293B" strokeWidth="2.5" />
    `;
  } else if (cfg.accessory === 'sunglasses') {
    accessorySVG = `
      <path d="M 46 52 L 72 52 L 68 70 L 50 70 Z" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
      <path d="M 78 52 L 104 52 L 100 70 L 82 70 Z" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
      <line x1="72" y1="56" x2="78" y2="56" stroke="#0F172A" strokeWidth="3" />
      <path d="M 48 55 L 62 67" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 80 55 L 94 67" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
    `;
  } else if (cfg.accessory === 'headphones') {
    accessorySVG = `
      <path d="M 32 60 C 30 20 120 20 118 60" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="24" y="52" width="14" height="26" rx="6" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2" />
      <rect x="112" y="52" width="14" height="26" rx="6" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2" />
      <path d="M 28 78 Q 38 100 58 92" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="58" cy="92" r="4" fill="#0284C7" />
    `;
  } else if (cfg.accessory === 'beanie') {
    accessorySVG = `
      <path d="M 38 42 C 38 15 112 15 112 42 Z" fill="${cfg.outfitColor}" />
      <rect x="34" y="36" width="82" height="12" rx="4" fill="#0F172A" />
      <circle cx="75" cy="14" r="7" fill="#FFFFFF" />
    `;
  }

  // Outfit 3D Shapes
  let outfitSVG = '';
  if (cfg.outfit === 'hoodie') {
    outfitSVG = `
      <path d="M 30 115 C 30 100 50 96 75 96 C 100 96 120 100 120 115 L 128 160 L 22 160 Z" fill="${cfg.outfitColor}" />
      <path d="M 60 98 Q 75 118 90 98 L 84 140 Q 75 145 66 140 Z" fill="rgba(0,0,0,0.15)" />
      <path d="M 66 102 L 64 130" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M 84 102 L 86 130" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="64" cy="130" r="2.5" fill="#FFFFFF" />
      <circle cx="86" cy="130" r="2.5" fill="#FFFFFF" />
    `;
  } else if (cfg.outfit === 'jacket') {
    outfitSVG = `
      <path d="M 28 115 C 28 100 48 96 75 96 C 102 96 122 100 122 115 L 128 160 L 22 160 Z" fill="${cfg.outfitColor}" />
      <path d="M 58 98 L 75 130 L 92 98 Z" fill="#FFFFFF" />
      <path d="M 45 98 L 75 145 L 45 160 Z" fill="rgba(0,0,0,0.2)" />
      <path d="M 105 98 L 75 145 L 105 160 Z" fill="rgba(0,0,0,0.2)" />
    `;
  } else if (cfg.outfit === 'cashier_apron') {
    outfitSVG = `
      <path d="M 30 115 C 30 100 50 96 75 96 C 100 96 120 100 120 115 L 128 160 L 22 160 Z" fill="#1E293B" />
      <path d="M 48 102 L 102 102 L 108 160 L 42 160 Z" fill="${cfg.outfitColor}" />
      <path d="M 58 128 L 92 128 L 90 152 L 60 152 Z" fill="rgba(0,0,0,0.2)" />
      <circle cx="75" cy="115" r="3" fill="#F59E0B" />
    `;
  } else if (cfg.outfit === 'shirt_tie') {
    outfitSVG = `
      <path d="M 28 115 C 28 100 48 96 75 96 C 102 96 122 100 122 115 L 128 160 L 22 160 Z" fill="${cfg.outfitColor}" />
      <polygon points="62,96 75,110 88,96 82,96 75,102 68,96" fill="#FFFFFF" />
      <polygon points="72,106 78,106 81,148 75,154 69,148" fill="#DC2626" />
    `;
  } else {
    // Sweater
    outfitSVG = `
      <path d="M 30 115 C 30 100 50 96 75 96 C 100 96 120 100 120 115 L 128 160 L 22 160 Z" fill="${cfg.outfitColor}" />
      <path d="M 62 96 C 62 108 88 108 88 96 Z" fill="rgba(0,0,0,0.12)" />
    `;
  }

  const svgCode = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 160" width="100%" height="100%">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
          <stop offset="100%" stop-color="${cfg.bgColor}" />
        </radialGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.15" />
        </filter>
        <linearGradient id="skin3D" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25" />
          <stop offset="40%" stop-color="${cfg.skinTone}" />
          <stop offset="100%" stop-color="${cfg.skinTone}" />
        </linearGradient>
      </defs>

      <!-- Background Soft Bubble -->
      <circle cx="75" cy="80" r="70" fill="url(#bgGrad)" />

      <g filter="url(#softShadow)">
        
        <!-- Outfit / Body -->
        ${outfitSVG}

        <!-- Neck -->
        <rect x="66" y="86" width="18" height="16" rx="6" fill="${cfg.skinTone}" />
        <rect x="66" y="86" width="18" height="6" fill="rgba(0,0,0,0.08)" />

        <!-- Ears -->
        <ellipse cx="42" cy="68" rx="5" ry="8" fill="${cfg.skinTone}" />
        <ellipse cx="108" cy="68" rx="5" ry="8" fill="${cfg.skinTone}" />

        <!-- Head Base -->
        <ellipse cx="75" cy="66" rx="34" ry="38" fill="url(#skin3D)" />

        <!-- Cheeks Glow -->
        <ellipse cx="54" cy="72" rx="6" ry="4" fill="#F43F5E" opacity="0.18" />
        <ellipse cx="96" cy="72" rx="6" ry="4" fill="#F43F5E" opacity="0.18" />

        <!-- Nose -->
        <path d="M 73 66 Q 75 72 78 70" stroke="#A16207" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />

        <!-- Eyes & Eyebrows -->
        ${eyebrowLeft}
        ${eyebrowRight}
        ${leftEye}
        ${rightEye}

        <!-- Mouth -->
        ${mouthPath}

        <!-- Hair Layer -->
        ${hairPath}

        <!-- Accessories Overlay -->
        ${accessorySVG}

      </g>
    </svg>
  `;

  return svgCode;
};

// Convert SVG to Data URI URL for easy `src` binding
export const bitmojiToDataUri = (cfg: BitmojiConfig): string => {
  const svg = generateBitmojiSVG(cfg);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

interface BitmojiAvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (avatarDataUri: string) => void;
  currentAvatar?: string;
  isAr?: boolean;
}

export const BitmojiAvatarSelector: React.FC<BitmojiAvatarSelectorProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  currentAvatar,
  isAr = true,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'customizer'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Customizer State
  const [config, setConfig] = useState<BitmojiConfig>({
    gender: 'male',
    skinTone: '#F3C5A5',
    hairStyle: 'quiff_trendy',
    hairColor: '#3D2314',
    outfit: 'hoodie',
    outfitColor: '#7C3AED',
    expression: 'smile',
    accessory: 'none',
    bgColor: '#EDE9FE'
  });

  if (!isOpen) return null;

  const handleSelectPreset = (presetConfig: BitmojiConfig) => {
    setConfig(presetConfig);
    const dataUri = bitmojiToDataUri(presetConfig);
    onSelectAvatar(dataUri);
    onClose();
  };

  const handleApplyCustom = () => {
    const dataUri = bitmojiToDataUri(config);
    onSelectAvatar(dataUri);
    onClose();
  };

  const handleRandomize = () => {
    const genders: ('female' | 'male')[] = ['female', 'male'];
    const skinTones = ['#FFE2CD', '#F3C5A5', '#F9D3B4', '#D1A384', '#E0AC8A', '#8D5B41'];
    const hairStyles = ['quiff_trendy', 'long_wavy', 'bob_cut', 'undercut', 'ponytail', 'short_crop'];
    const hairColors = ['#1E1B18', '#3D2314', '#B45309', '#000000', '#EC4899', '#64748B'];
    const outfits: ('hoodie' | 'jacket' | 'sweater' | 'shirt_tie' | 'cashier_apron')[] = ['hoodie', 'jacket', 'sweater', 'shirt_tie', 'cashier_apron'];
    const outfitColors = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#3B82F6', '#EF4444'];
    const expressions: ('happy' | 'smile' | 'wink' | 'cool' | 'confident')[] = ['happy', 'smile', 'wink', 'cool', 'confident'];
    const accessories: ('none' | 'glasses' | 'sunglasses' | 'headphones' | 'beanie')[] = ['none', 'glasses', 'sunglasses', 'headphones', 'beanie'];
    const bgColors = ['#EDE9FE', '#F3E8FF', '#D1FAE5', '#FCE7F3', '#FEF3C7', '#CFFAFE', '#FFE4E6'];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    setConfig({
      gender: pick(genders),
      skinTone: pick(skinTones),
      hairStyle: pick(hairStyles),
      hairColor: pick(hairColors),
      outfit: pick(outfits),
      outfitColor: pick(outfitColors),
      expression: pick(expressions),
      accessory: pick(accessories),
      bgColor: pick(bgColors),
    });
  };

  const filteredPresets = defaultBitmojiPresets.filter(p => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      
      {/* Outer Card Styled to Match ChatFlow 3D Aesthetics */}
      <div className="bg-[#F8F9FC] text-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden border border-purple-200 font-sans my-auto" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* HEADER BAR */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{isAr ? 'معرض وشخصيات البيتموجي 3D' : '3D Bitmoji & Avatar Gallery'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Bitmoji 3D v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isAr ? 'اختر شخصية ثلاثية الأبعاد تميز حساب الكاشير أو صمم بيتموجي خاص بك' : 'Select a 3D character for your user account or customize a custom Bitmoji'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TAB SWITCHER (Presets vs Customizer) */}
        <div className="bg-slate-100/80 p-2 flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white text-purple-700 shadow-md scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Crown className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'شخصيات جاهزة (3D Ready)' : 'Ready 3D Avatars'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customizer')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'customizer'
                  ? 'bg-white text-purple-700 shadow-md scale-105'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-600" />
              <span>{isAr ? 'مصمم البيتموجي التفاعلي' : '3D Bitmoji Studio'}</span>
            </button>
          </div>

          {activeTab === 'customizer' && (
            <button
              type="button"
              onClick={handleRandomize}
              className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-600" />
              <span>{isAr ? 'توليد عشوائي' : 'Randomize'}</span>
            </button>
          )}
        </div>

        {/* TAB 1: PRESETS GALLERY */}
        {activeTab === 'presets' && (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'all', labelAr: 'الكل (3D)', labelEn: 'All 3D' },
                { id: 'popular', labelAr: '🔥 الأكثر شعبية', labelEn: 'Popular' },
                { id: 'cashier', labelAr: '🛒 الكاشير والدعم', labelEn: 'Cashier & Support' },
                { id: 'admin', labelAr: '💼 المدراء والتنفيذي', labelEn: 'Admin & Exec' },
                { id: 'trendy', labelAr: '✨ تريندي وشبابي', labelEn: 'Trendy' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {isAr ? cat.labelAr : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Avatars Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
              {filteredPresets.map(preset => {
                const dataUri = bitmojiToDataUri(preset.config);
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.config)}
                    className="bg-white rounded-2xl p-3 border border-slate-200 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center justify-between text-center relative"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-50 p-1 group-hover:scale-105 transition-transform">
                      <img
                        src={dataUri}
                        alt={preset.nameEn}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="mt-2 w-full">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {isAr ? preset.nameAr : preset.nameEn}
                      </p>
                      <button
                        type="button"
                        className="mt-1.5 w-full py-1.5 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-700 group-hover:text-white text-[11px] font-black transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAr ? 'اختيار هذا البيتموجي' : 'Select Avatar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 2: INTERACTIVE CUSTOMIZER */}
        {activeTab === 'customizer' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-start max-h-[72vh] overflow-y-auto">
            
            {/* Live 3D Avatar Preview Card (Matching Screenshot Profile Style) */}
            <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-purple-100 shadow-xl flex flex-col items-center text-center space-y-3 sticky top-0">
              
              <div className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'معاينة البيتموجي المباشرة' : 'LIVE 3D PREVIEW'}</span>
              </div>

              {/* Avatar Bubble */}
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl overflow-hidden shadow-2xl p-1 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 ring-4 ring-purple-500/30">
                <img
                  src={bitmojiToDataUri(config)}
                  alt="Custom Bitmoji Preview"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Profile Card Mockup */}
              <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 text-right rtl:text-right font-sans">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>متصل الآن (Online)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700">
                    {config.gender === 'female' ? 'أنثى' : 'ذكر'}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-800 mt-1">كاشير النظام الذكي</p>
                <p className="text-[11px] text-slate-500">مسؤول نوبة الكاشير والبيع المباشر</p>
              </div>

              <button
                type="button"
                onClick={handleApplyCustom}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isAr ? 'اعتماد وحفظ هذا البيتموجي للحساب' : 'Apply Bitmoji to Account'}</span>
              </button>

            </div>

            {/* Customization Options Controls (Right Columns) */}
            <div className="md:col-span-7 space-y-4 text-xs">
              
              {/* 1. Gender */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '1. الجنس والنموذج:' : 'Gender Model:'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, gender: 'male', hairStyle: 'quiff_trendy' }))}
                    className={`p-2 rounded-xl font-bold border transition-all ${
                      config.gender === 'male' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    👨 {isAr ? 'نموذج شاب (Male)' : 'Male'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, gender: 'female', hairStyle: 'long_wavy' }))}
                    className={`p-2 rounded-xl font-bold border transition-all ${
                      config.gender === 'female' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    👩 {isAr ? 'نموذج فتاة (Female)' : 'Female'}
                  </button>
                </div>
              </div>

              {/* 2. Hairstyle */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '2. تصفيفة الشعر:' : 'Hairstyle:'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'quiff_trendy', label: 'كويف شبابي' },
                    { id: 'long_wavy', label: 'شعر تموجات' },
                    { id: 'bob_cut', label: 'قصة بوب' },
                    { id: 'undercut', label: 'اندركات مودرن' },
                    { id: 'ponytail', label: 'ذيل حصان' },
                    { id: 'short_crop', label: 'قصة قصيرة' },
                  ].map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, hairStyle: h.id }))}
                      className={`p-2 rounded-xl font-bold text-[11px] border transition-all ${
                        config.hairStyle === h.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Hair Color Swatches */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '3. لون الشعر:' : 'Hair Color:'}</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { color: '#1E1B18', label: 'أسود' },
                    { color: '#3D2314', label: 'بني داكن' },
                    { color: '#B45309', label: 'شقراء' },
                    { color: '#DC2626', label: 'أحمر' },
                    { color: '#EC4899', label: 'زهري' },
                    { color: '#0284C7', label: 'أزرق' },
                    { color: '#64748B', label: 'رمادي' },
                  ].map((hc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, hairColor: hc.color }))}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: hc.color }}
                      title={hc.label}
                    >
                      {config.hairColor === hc.color && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Outfit Style & Color */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '4. نوع ومظهر الزي (Outfits):' : 'Outfit:'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'hoodie', label: '🧥 هودي 3D' },
                    { id: 'jacket', label: '🥼 جاكيت رسمية' },
                    { id: 'sweater', label: '👕 بلوزة دافئة' },
                    { id: 'shirt_tie', label: '👔 بدلة وربطة' },
                    { id: 'cashier_apron', label: '🛒 مريلة كاشير' },
                  ].map(o => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, outfit: o.id as any }))}
                      className={`p-2 rounded-xl font-bold text-[11px] border transition-all ${
                        config.outfit === o.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 self-center">{isAr ? 'لون الزي:' : 'Color:'}</span>
                  {['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#3B82F6', '#EF4444', '#1E293B'].map((oc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, outfitColor: oc }))}
                      className="w-7 h-7 rounded-lg border-2 border-white shadow-sm transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: oc }}
                    >
                      {config.outfitColor === oc && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Accessories */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '5. الإكسسوارات والسماعات:' : 'Accessories:'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'بدون إكسسوار' },
                    { id: 'glasses', label: '👓 نظارة طبية' },
                    { id: 'sunglasses', label: '🕶️ نظارة شمسية' },
                    { id: 'headphones', label: '🎧 سماعة كاشير' },
                    { id: 'beanie', label: '🧢 قبعة بيتموجي' },
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, accessory: a.id as any }))}
                      className={`p-2 rounded-xl font-bold text-[11px] border transition-all ${
                        config.accessory === a.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Expressions */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="font-black text-slate-800 block">{isAr ? '6. تعابير الوجه:' : 'Expressions:'}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'smile', label: '😊 ابتسامة' },
                    { id: 'happy', label: '😃 ضحكة' },
                    { id: 'wink', label: '😉 غمزة' },
                    { id: 'cool', label: '😎 كول' },
                  ].map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, expression: e.id as any }))}
                      className={`p-2 rounded-xl font-bold text-[11px] border transition-all ${
                        config.expression === e.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
