import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Heart, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  BarChart2, 
  TrendingUp, 
  Radio, 
  Sliders, 
  RotateCcw,
  RotateCw,
  Eye,
  Layers,
  Thermometer,
  Wind,
  Target,
  User,
  Users,
  FlaskConical,
  Dna,
  Syringe,
  Crosshair,
  CircleDot,
  CheckCircle2,
  Brain,
  Bone,
  Waves,
  Gauge,
  SlidersHorizontal,
  Play,
  Pause,
  Info
} from 'lucide-react';
import { StoreSettings } from '../types';

interface BiometricTelemetryHUDProps {
  settings: StoreSettings;
  todaySalesTotal?: number;
  todayOrdersCount?: number;
  totalProducts?: number;
}

export type AnatomicalPreset = 'hybrid' | 'skeleton' | 'vascular' | 'muscles' | 'neural';
export type GenderModel = 'both' | 'female' | 'male';

export const BiometricTelemetryHUD: React.FC<BiometricTelemetryHUDProps> = ({
  settings,
  todaySalesTotal = 3840.50,
  todayOrdersCount = 42,
  totalProducts = 158,
}) => {
  const isAr = settings.language === 'ar';

  // Gender/Model state
  const [viewMode, setViewMode] = useState<GenderModel>('both'); // 'both', 'female', 'male'
  
  // Preset state
  const [activePreset, setActivePreset] = useState<AnatomicalPreset>('hybrid');

  // Granular Layer Visibility Toggles
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showVascular, setShowVascular] = useState<boolean>(true);
  const [showMuscles, setShowMuscles] = useState<boolean>(true);
  const [showNeural, setShowNeural] = useState<boolean>(true);
  const [showOrgans, setShowOrgans] = useState<boolean>(true);
  const [animateFlow, setAnimateFlow] = useState<boolean>(true);

  // Selected Organ for Interactive Inspection
  const [selectedOrgan, setSelectedOrgan] = useState<string>('cardiac');

  // 3D Hologram Perspective & Layer Explode State
  const [rotY, setRotY] = useState<number>(20);
  const [rotX, setRotX] = useState<number>(5);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [explodeLayers3D, setExplodeLayers3D] = useState<boolean>(false);

  // Realtime Telemetry Simulation Data
  const [bpm, setBpm] = useState<number>(74);
  const [temp, setTemp] = useState<number>(36.6);
  const [spo2, setSpo2] = useState<number>(98);
  const [bloodPressure, setBloodPressure] = useState<{ sys: number; dia: number }>({ sys: 118, dia: 78 });
  const [scanOffset, setScanOffset] = useState<number>(0);
  const [dashOffset, setDashOffset] = useState<number>(0);

  // Update layer visibility when preset changes
  const applyPreset = (preset: AnatomicalPreset) => {
    setActivePreset(preset);
    switch (preset) {
      case 'hybrid':
        setShowSkeleton(true);
        setShowVascular(true);
        setShowMuscles(true);
        setShowNeural(true);
        setShowOrgans(true);
        break;
      case 'skeleton':
        setShowSkeleton(true);
        setShowVascular(false);
        setShowMuscles(false);
        setShowNeural(false);
        setShowOrgans(false);
        break;
      case 'vascular':
        setShowSkeleton(false);
        setShowVascular(true);
        setShowMuscles(false);
        setShowNeural(false);
        setShowOrgans(true);
        break;
      case 'muscles':
        setShowSkeleton(false);
        setShowVascular(false);
        setShowMuscles(true);
        setShowNeural(false);
        setShowOrgans(false);
        break;
      case 'neural':
        setShowSkeleton(false);
        setShowVascular(false);
        setShowMuscles(false);
        setShowNeural(true);
        setShowOrgans(true);
        break;
    }
  };

  // Live Pulse and Scan Line Animation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(prev => Math.min(92, Math.max(65, prev + Math.floor(Math.random() * 5) - 2)));
      setTemp(prev => parseFloat((Math.min(37.3, Math.max(36.4, prev + (Math.random() * 0.2 - 0.1))).toFixed(1))));
      setSpo2(prev => Math.min(100, Math.max(95, prev + Math.floor(Math.random() * 2) - 1)));
      setBloodPressure({
        sys: Math.floor(115 + Math.random() * 8),
        dia: Math.floor(75 + Math.random() * 6)
      });
      setScanOffset(prev => (prev + 1.5) % 100);
      setDashOffset(prev => (prev - 2) % 40);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // 3D Smooth Auto-Rotation Timer
  useEffect(() => {
    if (!autoRotate) return;
    const rotateInterval = setInterval(() => {
      setRotY(prev => (prev + 0.6) % 360);
    }, 40);
    return () => clearInterval(rotateInterval);
  }, [autoRotate]);

  // Detailed Organ Telemetry Metadata
  const organDataMap: Record<string, {
    titleAr: string;
    titleEn: string;
    icon: any;
    color: string;
    bgGlow: string;
    efficiency: number;
    metricLabelAr: string;
    metricLabelEn: string;
    metricVal: string;
    descAr: string;
    descEn: string;
  }> = {
    cardiac: {
      titleAr: 'القلب والشرايين الحيوية',
      titleEn: 'Cardiac & Aortic Pulse',
      icon: Heart,
      color: '#EC4899',
      bgGlow: 'rgba(236,72,153,0.3)',
      efficiency: 98,
      metricLabelAr: 'نبض الدورة المالية للمتجر',
      metricLabelEn: 'Sales Rhythm Pulse',
      metricVal: `${bpm} BPM`,
      descAr: 'يتحكم في تدفق السيولة النقدية وسرعة معالجة الفواتير في النظام',
      descEn: 'Controls cash flow circulation and real-time transaction speeds'
    },
    brain: {
      titleAr: 'المخ والشبكة العصبية (AI)',
      titleEn: 'Neural & AI Core',
      icon: Brain,
      color: '#00F0FF',
      bgGlow: 'rgba(0,240,255,0.3)',
      efficiency: 99,
      metricLabelAr: 'سرعة التحليل والتنبؤ',
      metricLabelEn: 'Cognitive Response Time',
      metricVal: '1.2 ms',
      descAr: 'المحرك الذكي لتحليل سلوك العملاء وتوقع المخزون المطلوب تلقائياً',
      descEn: 'AI engine analyzing customer behavior & predictive inventory forecasting'
    },
    skeletal: {
      titleAr: 'الهيكل العظمي والمفاصل',
      titleEn: 'Skeletal Spine & Bones',
      icon: Bone,
      color: '#F59E0B',
      bgGlow: 'rgba(245,158,11,0.3)',
      efficiency: 96,
      metricLabelAr: 'استقرار البنية التحتية',
      metricLabelEn: 'Core Infrastructure Stability',
      metricVal: '99.9%',
      descAr: 'يمثل ثبات قاعدة البيانات واستقرار النظام وسلسلة التوريد المباشرة',
      descEn: 'Represents database structural durability & supply chain stability'
    },
    muscles: {
      titleAr: 'الجهاز العضلي والأنسجة',
      titleEn: 'Muscular Tissue & Power',
      icon: Zap,
      color: '#A855F7',
      bgGlow: 'rgba(168,85,247,0.3)',
      efficiency: 94,
      metricLabelAr: 'سرعة إنتاجية الكاشير',
      metricLabelEn: 'POS Order Processing Power',
      metricVal: `${todayOrdersCount} طلب/يوم`,
      descAr: 'يقيس قوة دفع عمليات البيع والتسليم السريع للطلبات في الصالة',
      descEn: 'Measures POS processing muscular throughput & order execution speed'
    },
    optical: {
      titleAr: 'البصريات والرؤية الذكية',
      titleEn: 'Optical Vision & Barcode',
      icon: Eye,
      color: '#38BDF8',
      bgGlow: 'rgba(56,189,248,0.3)',
      efficiency: 100,
      metricLabelAr: 'دقة ماسح الباركود',
      metricLabelEn: 'Barcode Scanner Accuracy',
      metricVal: '100%',
      descAr: 'مسح ضوئي دقيق للسلع والمنتجات بدون أي خطأ في الجرد',
      descEn: 'Instant zero-error optical barcode recognition and inventory sync'
    },
    pulmonary: {
      titleAr: 'الرئتان وتدفق الهواء',
      titleEn: 'Pulmonary Respiratory',
      icon: Wind,
      color: '#10B981',
      bgGlow: 'rgba(16,185,129,0.3)',
      efficiency: 97,
      metricLabelAr: 'معدل الأكسجين والتهوية',
      metricLabelEn: 'System Oxygenation (SpO2)',
      metricVal: `${spo2}%`,
      descAr: 'تضمن سلاسة التنسيق بين الكاشير والمدير بدون اختناق في المبيعات',
      descEn: 'Ensures smooth air-like workflow coordination across terminals'
    }
  };

  const currentOrganInfo = organDataMap[selectedOrgan] || organDataMap.cardiac;
  const ActiveOrganIcon = currentOrganInfo.icon;

  return (
    <div className="relative rounded-3xl bg-[#050814] border border-cyan-500/40 p-4 sm:p-6 shadow-[0_0_60px_rgba(0,240,255,0.18)] text-slate-100 overflow-hidden font-sans select-none my-6">
      
      {/* Cyber Background Grid & Ambient Visual Glows */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 40%, rgba(236,72,153,0.2) 0%, rgba(0,240,255,0.18) 45%, transparent 75%),
            linear-gradient(to right, rgba(0,240,255,0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,240,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 28px 28px, 28px 28px'
        }}
      />

      {/* TOP HEADER & TITLE */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
        
        {/* Title & Live Status Indicator */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <span className="text-[11px] font-black tracking-widest text-cyan-400 uppercase">
              {isAr ? 'نظام العرض التشريحي المتقدم والطبقات الحيوية' : 'ADVANCED MULTI-LAYER ANATOMICAL HUD'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-1 flex items-center gap-2.5">
            <Dna className="w-6.5 h-6.5 text-pink-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{isAr ? 'مرصد التشريح الحيوي والأوردة والعضلات (Interactive Hologram HUD)' : 'INTERACTIVE ANATOMICAL LAYER HUD'}</span>
          </h2>
        </div>

        {/* Gender / Model Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 border border-slate-800 p-1.5 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'both'
                ? 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'أنثى + ذكر (عرض مزدوج)' : 'Dual View (Both)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('female')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'female'
                ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-105'
                : 'text-slate-400 hover:text-pink-300'
            }`}
          >
            <User className="w-3.5 h-3.5 text-pink-300" />
            <span>{isAr ? 'نموذج الأنثى' : 'Female Model'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('male')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'male'
                ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.5)] scale-105'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <User className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isAr ? 'نموذج الذكر' : 'Male Model'}</span>
          </button>
        </div>

      </div>

      {/* CONTROLS SECTION 1: QUICK ANATOMICAL PRESET MODES */}
      <div className="relative z-10 space-y-3 mb-6">
        
        {/* Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black text-slate-200">
              {isAr ? 'أنماط العرض التشريحي السريعة:' : 'Anatomical Preset Modes:'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            
            {/* Hybrid */}
            <button
              type="button"
              onClick={() => applyPreset('hybrid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === 'hybrid'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-105'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? '🌐 الهولوغرام الهجين المدمج' : 'Hybrid Hologram'}</span>
            </button>

            {/* Skeleton */}
            <button
              type="button"
              onClick={() => applyPreset('skeleton')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === 'skeleton'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Bone className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? '💀 الهيكل العظمي فقط' : 'Skeleton Only'}</span>
            </button>

            {/* Vascular / Veins */}
            <button
              type="button"
              onClick={() => applyPreset('vascular')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === 'vascular'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-105'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>{isAr ? '🫀 الأوردة والدورة الدموية' : 'Veins & Vascular'}</span>
            </button>

            {/* Muscles */}
            <button
              type="button"
              onClick={() => applyPreset('muscles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === 'muscles'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? '🦾 العضلات والأنسجة' : 'Muscles Only'}</span>
            </button>

            {/* Neural */}
            <button
              type="button"
              onClick={() => applyPreset('neural')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === 'neural'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? '🧠 الشبكة العصبية (AI)' : 'Neural System'}</span>
            </button>

          </div>
        </div>

        {/* CONTROLS SECTION 2: GRANULAR LAYER TOGGLES (TOGGLE SWITCHES) */}
        <div className="bg-slate-950/80 border border-slate-800/90 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-1.5 text-slate-400 font-mono font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            <span>{isAr ? 'مفاتيح التخصيص التفصيلي للطبقات:' : 'Custom Layer Toggles:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-bold">
            
            {/* Toggle Skeleton */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-all">
              <input 
                type="checkbox" 
                checked={showSkeleton} 
                onChange={e => setShowSkeleton(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
              />
              <span className={showSkeleton ? 'text-amber-300' : 'text-slate-500'}>
                {isAr ? '💀 العظام' : 'Skeleton'}
              </span>
            </label>

            {/* Toggle Vascular */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-rose-500/50 transition-all">
              <input 
                type="checkbox" 
                checked={showVascular} 
                onChange={e => setShowVascular(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
              />
              <span className={showVascular ? 'text-rose-300' : 'text-slate-500'}>
                {isAr ? '🫀 الأوردة' : 'Vascular'}
              </span>
            </label>

            {/* Toggle Muscles */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-all">
              <input 
                type="checkbox" 
                checked={showMuscles} 
                onChange={e => setShowMuscles(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-purple-500 cursor-pointer"
              />
              <span className={showMuscles ? 'text-purple-300' : 'text-slate-500'}>
                {isAr ? '🦾 العضلات' : 'Muscles'}
              </span>
            </label>

            {/* Toggle Neural */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all">
              <input 
                type="checkbox" 
                checked={showNeural} 
                onChange={e => setShowNeural(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
              />
              <span className={showNeural ? 'text-cyan-300' : 'text-slate-500'}>
                {isAr ? '🧠 الأعصاب' : 'Neural'}
              </span>
            </label>

            {/* Toggle Organs */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-all">
              <input 
                type="checkbox" 
                checked={showOrgans} 
                onChange={e => setShowOrgans(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
              />
              <span className={showOrgans ? 'text-emerald-300' : 'text-slate-500'}>
                {isAr ? '🫁 الأعضاء' : 'Organs'}
              </span>
            </label>

            {/* Toggle Flow Animation */}
            <button
              type="button"
              onClick={() => setAnimateFlow(!animateFlow)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                animateFlow 
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50' 
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {animateFlow ? <Pause className="w-3 h-3 text-pink-400" /> : <Play className="w-3 h-3 text-slate-400" />}
              <span>{isAr ? 'تدفق الحركة' : 'Flow Animation'}</span>
            </button>

          </div>
        </div>

        {/* CONTROLS SECTION 3: 3D HOLOGRAM ROTATION & PERSPECTIVE CONTROLS */}
        <div className="bg-slate-950/90 border border-cyan-500/40 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="flex items-center gap-2 text-cyan-300 font-mono font-black">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{isAr ? '🎥 التحكم ثلاثي الأبعاد الهولوجرامي (3D Perspective Controls):' : '3D Hologram Perspective Controls:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Rotate Toggle */}
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                autoRotate 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
              <span>{isAr ? '🔄 دوران 3D تلقائي' : 'Auto 3D Spin'}</span>
            </button>

            {/* Explode Layers 3D Toggle */}
            <button
              type="button"
              onClick={() => setExplodeLayers3D(!explodeLayers3D)}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                explodeLayers3D 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? '💥 تفكيك الطبقات 3D' : '3D Layer Explode'}</span>
            </button>

            {/* Preset Angles */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setRotY(0); setRotX(0); setAutoRotate(false); }}
                className="px-2 py-1 rounded-lg text-[10px] font-mono text-slate-300 hover:bg-slate-800 transition-colors"
              >
                0° Front
              </button>
              <button
                type="button"
                onClick={() => { setRotY(30); setRotX(8); setAutoRotate(false); }}
                className="px-2 py-1 rounded-lg text-[10px] font-mono text-cyan-300 hover:bg-slate-800 transition-colors"
              >
                30° 3D
              </button>
              <button
                type="button"
                onClick={() => { setRotY(90); setRotX(0); setAutoRotate(false); }}
                className="px-2 py-1 rounded-lg text-[10px] font-mono text-pink-300 hover:bg-slate-800 transition-colors"
              >
                90° Side
              </button>
            </div>

            {/* Y-Axis Slider */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 text-[10px] font-mono">
              <span className="text-slate-400">Y-Axis:</span>
              <input
                type="range"
                min="-180"
                max="180"
                value={Math.round(rotY)}
                onChange={(e) => {
                  setRotY(parseFloat(e.target.value));
                  setAutoRotate(false);
                }}
                className="w-20 accent-cyan-400 cursor-pointer"
              />
              <span className="text-cyan-300 w-8 text-right">{Math.round(rotY)}°</span>
            </div>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT GRID: LEFT REALTIME GAUGES + CENTER HOLOGRAM SILHOUETTE SCAN + RIGHT INTERACTIVE ORGAN TELEMETRY */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT PANEL: REALTIME BIO-GAUGES & SYRINGES */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          
          {/* Live Heart Rate & BP Monitor Box */}
          <div className="bg-slate-950/90 border border-rose-500/40 p-4 rounded-2xl relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 animate-pulse text-rose-500" />
                <span>{isAr ? 'معدل النبض الحيوي' : 'LIVE PULSE RATE'}</span>
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>

            <div className="flex items-baseline justify-between my-1">
              <p className="text-3xl font-black font-mono text-white tracking-tight">
                {bpm} <span className="text-xs font-normal text-rose-400 font-sans">BPM</span>
              </p>
              <p className="text-sm font-mono font-bold text-cyan-300">
                BP: {bloodPressure.sys}/{bloodPressure.dia}
              </p>
            </div>

            {/* Live ECG Wave Line SVG */}
            <div className="h-10 w-full mt-2 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 200 40">
                <path
                  d="M 0 20 L 40 20 L 48 5 L 56 35 L 64 10 L 72 25 L 80 20 L 120 20 L 128 5 L 136 35 L 144 10 L 152 25 L 160 20 L 200 20"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_0_8px_#F43F5E]"
                />
              </svg>
            </div>
          </div>

          {/* Fluid Telemetry Syringes Box */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
            <p className="text-[10px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5 text-pink-400" />
              <span>{isAr ? 'مؤشرات المحلول وسوائل الأوردة' : 'VASCULAR FLUID MESH'}</span>
            </p>

            {[
              { label: isAr ? 'تدفق الدم الشرياني' : 'Arterial Flow', val: 88, color: 'from-pink-500 to-rose-500' },
              { label: isAr ? 'تركيز أكسجين الدم (SpO2)' : 'Oxygenation SpO2', val: spo2, color: 'from-cyan-500 to-blue-500' },
              { label: isAr ? 'حرارة الجسد والحيوية' : 'Thermal Homeostasis', val: 96, color: 'from-amber-500 to-orange-500' },
              { label: isAr ? 'النشاط العضلي المكتسب' : 'Muscular Muscle Tone', val: 91, color: 'from-purple-500 to-indigo-500' },
            ].map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-300 font-bold">{s.label}</span>
                  <span className="text-cyan-300">{s.val}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${s.color} transition-all duration-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]`}
                    style={{ width: `${s.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Dual Vitality Gauge Wheels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl text-center flex flex-col items-center">
              <div className="relative w-14 h-14 flex items-center justify-center my-1">
                <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-pink-500" strokeDasharray="94, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-[10px] font-black text-pink-300 font-mono">94%</span>
              </div>
              <span className="text-[10px] font-black text-slate-300">{isAr ? 'حيوية الأنثى' : 'FEMALE VITALITY'}</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl text-center flex flex-col items-center">
              <div className="relative w-14 h-14 flex items-center justify-center my-1">
                <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-cyan-400" strokeDasharray="98, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-[10px] font-black text-cyan-300 font-mono">98%</span>
              </div>
              <span className="text-[10px] font-black text-slate-300">{isAr ? 'حيوية الذكر' : 'MALE VITALITY'}</span>
            </div>
          </div>

        </div>

        {/* CENTER PANEL: HOLOGRAM DUAL ANATOMICAL SILHOUETTES WITH HIGH-FIDELITY LAYERS */}
        <div className="lg:col-span-6 bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-4 sm:p-5 relative flex flex-col items-center justify-between overflow-hidden shadow-2xl min-h-[520px]">
          
          {/* Animated Laser Scanning Beam */}
          <div 
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-cyan-400 to-amber-400 opacity-90 shadow-[0_0_25px_#00F0FF] pointer-events-none transition-all duration-300 z-30"
            style={{ top: `${scanOffset}%` }}
          />

          {/* Top Status Indicators */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2 z-10 font-mono">
            <span className="text-pink-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
              <span>FEMALE ANATOMY SCAN</span>
            </span>

            <span className="text-amber-400 font-bold text-[10px] uppercase bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              LAYER: {activePreset.toUpperCase()}
            </span>

            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
              <span>MALE ANATOMY SCAN</span>
            </span>
          </div>

          {/* HOLOGRAM SILHOUETTES DISPLAY AREA WITH 3D PERSPECTIVE ROTATION */}
          <div 
            className="relative w-full h-[420px] flex items-center justify-around my-2 overflow-visible cursor-grab active:cursor-grabbing select-none"
            style={{ perspective: '1200px' }}
          >
            <div 
              className="w-full h-full flex items-center justify-around transition-transform duration-100 ease-out"
              style={{
                transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* FEMALE MODEL SVG 3D */}
              {(viewMode === 'both' || viewMode === 'female') && (
                <div className="relative w-1/2 h-full flex flex-col items-center justify-center group">
                  
                  {/* Horizontal Neon Chest Aura Line */}
                  <div className="absolute top-[28%] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_#EC4899] pointer-events-none opacity-80" />

                  {/* 3D Ground Shadow Ring under feet */}
                  <div className="absolute bottom-2 w-2/3 h-5 rounded-[50%] bg-pink-500/15 blur-md animate-pulse pointer-events-none" />

                  <svg className="w-full h-full max-h-[380px] filter drop-shadow-[0_0_25px_rgba(236,72,153,0.65)]" viewBox="0 0 160 380" fill="none">
                    
                    <defs>
                      {/* Volumetric Female Body Shader */}
                      <radialGradient id="femaleBodySkin3D" cx="50%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="rgba(244,63,94,0.4)" />
                        <stop offset="50%" stopColor="rgba(236,72,153,0.22)" />
                        <stop offset="90%" stopColor="rgba(15,23,42,0.75)" />
                      </radialGradient>

                      <linearGradient id="femaleMuscleGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FB7185" />
                        <stop offset="50%" stopColor="#E11D48" />
                        <stop offset="100%" stopColor="#9F1239" />
                      </linearGradient>

                      <linearGradient id="boneGrad3D" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FEF3C7" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>

                      <radialGradient id="organHeart3D" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#FF80BF" />
                        <stop offset="50%" stopColor="#F43F5E" />
                        <stop offset="100%" stopColor="#881337" />
                      </radialGradient>

                      <radialGradient id="organBrain3D" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#E0F2FE" />
                        <stop offset="60%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#0369A1" />
                      </radialGradient>

                      <filter id="glow3D">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* 0. REALISTIC 3D VOLUMETRIC BODY SILHOUETTE SHELL */}
                    <g opacity="0.95">
                      {/* Volumetric Body Shell Path */}
                      <path 
                        d="M 80 16 
                           C 64 16 62 42 66 54 
                           C 62 60 62 82 70 88 
                           L 72 93 
                           Q 80 96 88 93 
                           L 90 88 
                           C 98 82 98 60 94 54 
                           C 98 42 96 16 80 16 Z
                           M 72 93 
                           Q 58 100 46 108 
                           C 36 128 38 165 34 210 
                           L 30 220
                           C 38 222 42 220 48 210
                           C 44 185 48 155 52 135
                           C 50 158 56 182 50 208
                           C 44 235 52 280 58 350
                           L 76 350
                           C 76 320 78 260 80 225
                           C 82 260 84 320 84 350
                           L 102 350
                           C 108 280 116 235 110 208
                           C 104 182 110 158 108 135
                           C 112 155 116 185 112 210
                           C 118 220 122 222 130 220
                           L 126 210
                           C 122 165 124 128 114 108
                           Q 102 100 88 93 Z" 
                        fill="url(#femaleBodySkin3D)"
                        stroke="#EC4899"
                        strokeWidth="1.2"
                        filter="url(#glow3D)"
                      />

                      {/* Volumetric Muscle Contour Highlights (3D Depth Curves) */}
                      <path d="M 54 112 C 78 128 82 128 106 112" stroke="#EC4899" strokeWidth="0.8" opacity="0.6" fill="none" />
                      <path d="M 52 145 C 78 160 82 160 108 145" stroke="#F43F5E" strokeWidth="0.8" opacity="0.5" fill="none" />
                      <path d="M 56 185 Q 80 200 104 185" stroke="#EC4899" strokeWidth="0.8" opacity="0.5" fill="none" />
                      <path d="M 60 235 Q 70 280 66 330" stroke="#FB7185" strokeWidth="0.8" opacity="0.4" fill="none" />
                      <path d="M 100 235 Q 90 280 94 330" stroke="#FB7185" strokeWidth="0.8" opacity="0.4" fill="none" />
                    </g>

                    {/* 1. SKELETON LAYER (Volumetric 3D Bone Structure) */}
                    {showSkeleton && (
                      <g 
                        opacity="0.92" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(-40px) scale(0.92)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* 3D Skull Dome */}
                        <ellipse cx="80" cy="40" rx="14" ry="16" fill="url(#boneGrad3D)" opacity="0.75" />
                        <ellipse cx="80" cy="40" rx="12" ry="14" fill="none" stroke="#F59E0B" strokeWidth="1" />
                        {/* Eye Sockets 3D */}
                        <ellipse cx="74" cy="38" rx="3.5" ry="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.8" />
                        <ellipse cx="86" cy="38" rx="3.5" ry="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.8" />
                        {/* Mandible Jaw */}
                        <path d="M 70 48 Q 80 56 90 48 L 86 54 Q 80 58 74 54 Z" fill="#F59E0B" opacity="0.8" />

                        {/* 3D Spine Discs */}
                        <g stroke="#F59E0B" strokeWidth="1.5">
                          {[60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 140, 148, 156, 164, 172, 180, 188, 196, 204].map((y, idx) => (
                            <line key={idx} x1="77" y1={y} x2="83" y2={y} strokeWidth="2.5" strokeLinecap="round" />
                          ))}
                        </g>

                        {/* Collarbones (Clavicles 3D) */}
                        <path d="M 50 102 C 65 98 75 102 80 100 C 85 102 95 98 110 102" stroke="url(#boneGrad3D)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                        {/* 3D Ribcage Intercostal Arches */}
                        <g fill="none" stroke="#F59E0B" strokeWidth="1.2">
                          <path d="M 76 112 C 60 115 56 135 76 142" />
                          <path d="M 84 112 C 100 115 104 135 84 142" />
                          <path d="M 76 120 C 58 125 54 145 76 152" />
                          <path d="M 84 120 C 102 125 106 145 84 152" />
                          <path d="M 76 130 C 60 135 56 155 76 160" />
                          <path d="M 84 130 C 100 135 104 155 84 160" />
                          <path d="M 76 140 C 62 145 58 162 76 168" />
                          <path d="M 84 140 C 98 145 102 162 84 168" />
                        </g>

                        {/* Pelvic Basin 3D */}
                        <path d="M 56 195 Q 80 225 104 195 Q 80 215 56 195 Z" fill="url(#boneGrad3D)" opacity="0.6" stroke="#F59E0B" strokeWidth="1.5" />
                        <circle cx="68" cy="210" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />
                        <circle cx="92" cy="210" r="5" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />

                        {/* 3D Limb Bones Shafts & Heads */}
                        {/* Humerus Arms */}
                        <line x1="46" y1="108" x2="38" y2="158" stroke="url(#boneGrad3D)" strokeWidth="3" strokeLinecap="round" />
                        <line x1="114" y1="108" x2="122" y2="158" stroke="url(#boneGrad3D)" strokeWidth="3" strokeLinecap="round" strokeDasharray="" />
                        {/* Radius & Ulna */}
                        <line x1="38" y1="158" x2="32" y2="208" stroke="url(#boneGrad3D)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="122" y1="158" x2="128" y2="208" stroke="url(#boneGrad3D)" strokeWidth="2" strokeLinecap="round" />

                        {/* Femur Thighs */}
                        <line x1="66" y1="215" x2="60" y2="285" stroke="url(#boneGrad3D)" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="94" y1="215" x2="100" y2="285" stroke="url(#boneGrad3D)" strokeWidth="3.5" strokeLinecap="round" />
                        {/* Tibia Legs */}
                        <line x1="60" y1="285" x2="64" y2="345" stroke="url(#boneGrad3D)" strokeWidth="3" strokeLinecap="round" />
                        <line x1="100" y1="285" x2="96" y2="345" stroke="url(#boneGrad3D)" strokeWidth="3" strokeLinecap="round" />

                        {/* Spherical Joint Heads 3D */}
                        <circle cx="46" cy="108" r="4" fill="#F59E0B" filter="url(#glow3D)" />
                        <circle cx="114" cy="108" r="4" fill="#F59E0B" filter="url(#glow3D)" />
                        <circle cx="38" cy="158" r="3.5" fill="#F59E0B" />
                        <circle cx="122" cy="158" r="3.5" fill="#F59E0B" />
                        <circle cx="60" cy="285" r="4.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
                        <circle cx="100" cy="285" r="4.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
                      </g>
                    )}

                    {/* 2. MUSCULAR LAYER (Sculpted 3D Muscles & Fibers) */}
                    {showMuscles && (
                      <g 
                        opacity="0.88" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(-10px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* Pectoral Muscles 3D */}
                        <path d="M 50 110 C 60 102 78 120 78 132 C 60 135 50 128 50 110 Z" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />
                        <path d="M 110 110 C 100 102 82 120 82 132 C 100 135 110 128 110 110 Z" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />

                        {/* Deltoids 3D Shoulder Bulges */}
                        <path d="M 46 106 C 36 112 38 128 46 132 C 50 124 50 112 46 106 Z" fill="url(#femaleMuscleGrad3D)" stroke="#F43F5E" strokeWidth="0.8" />
                        <path d="M 114 106 C 124 112 122 128 114 132 C 110 124 110 112 114 106 Z" fill="url(#femaleMuscleGrad3D)" stroke="#F43F5E" strokeWidth="0.8" />

                        {/* Biceps & Arm Musculature 3D */}
                        <ellipse cx="40" cy="142" rx="4.5" ry="12" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />
                        <ellipse cx="120" cy="142" rx="4.5" ry="12" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />

                        {/* Rectus Abdominis 3D Six-Pack */}
                        <g fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.6" opacity="0.9">
                          <rect x="71" y="140" width="8" height="10" rx="2.5" />
                          <rect x="81" y="140" width="8" height="10" rx="2.5" />
                          <rect x="71" y="153" width="8" height="10" rx="2.5" />
                          <rect x="81" y="153" width="8" height="10" rx="2.5" />
                          <rect x="72" y="166" width="7" height="9" rx="2" />
                          <rect x="81" y="166" width="7" height="9" rx="2" />
                        </g>

                        {/* External Obliques */}
                        <path d="M 52 148 C 65 152 65 172 54 182 C 48 168 48 155 52 148 Z" fill="url(#femaleMuscleGrad3D)" opacity="0.7" />
                        <path d="M 108 148 C 95 152 95 172 106 182 C 112 168 112 155 108 148 Z" fill="url(#femaleMuscleGrad3D)" opacity="0.7" />

                        {/* Quadriceps 3D Leg Muscles */}
                        <path d="M 54 222 C 68 230 68 275 60 285 C 50 270 48 235 54 222 Z" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />
                        <path d="M 106 222 C 92 230 92 275 100 285 C 110 270 112 235 106 222 Z" fill="url(#femaleMuscleGrad3D)" stroke="#FB7185" strokeWidth="0.8" />

                        {/* Gastrocnemius Calves 3D */}
                        <path d="M 58 290 C 66 300 66 325 62 338 C 56 328 56 302 58 290 Z" fill="url(#femaleMuscleGrad3D)" stroke="#F43F5E" strokeWidth="0.6" />
                        <path d="M 102 290 C 94 300 94 325 98 338 C 104 328 104 302 102 290 Z" fill="url(#femaleMuscleGrad3D)" stroke="#F43F5E" strokeWidth="0.6" />
                      </g>
                    )}

                    {/* 3. VASCULAR / VEINS LAYER (Pulsing 3D Arterial Network) */}
                    {showVascular && (
                      <g 
                        opacity="0.95" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(20px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* Aorta Arch & Main Trunk 3D */}
                        <path 
                          d="M 82 125 
                             C 82 100 80 80 80 40 
                             M 82 125 
                             C 65 110 45 130 38 158 
                             L 32 208 
                             M 82 125 
                             C 98 110 118 130 122 158 
                             L 128 208 
                             M 82 125 
                             L 80 215 
                             C 70 240 62 280 64 345 
                             M 80 215 
                             C 90 240 98 280 96 345" 
                          stroke="#F43F5E"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={animateFlow ? "8 4" : "none"}
                          strokeDashoffset={dashOffset}
                          filter="url(#glow3D)"
                        />

                        {/* Subclavian & Carotid Branching Veins */}
                        <path d="M 80 60 Q 68 50 62 54 M 80 60 Q 92 50 98 54" stroke="#FB7185" strokeWidth="1.2" fill="none" />
                        <path d="M 82 125 Q 60 140 50 152 M 82 125 Q 104 140 114 152" stroke="#FB7185" strokeWidth="1.2" fill="none" />
                        <path d="M 80 215 Q 62 260 58 300 M 80 215 Q 98 260 102 300" stroke="#FB7185" strokeWidth="1.2" fill="none" />
                      </g>
                    )}

                    {/* 4. NEURAL / BRAIN SYSTEM LAYER (3D Synaptic Matrix) */}
                    {showNeural && (
                      <g 
                        opacity="0.95" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(45px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* Synapse Brain Core 3D */}
                        <circle cx="80" cy="38" r="10" fill="url(#organBrain3D)" opacity="0.85" />
                        <circle cx="80" cy="38" r="10" stroke="#00F0FF" strokeWidth="1.5" fill="none" filter="url(#glow3D)" />
                        <circle cx="80" cy="38" r="4" fill="#FFF" className={animateFlow ? 'animate-ping' : ''} />
                        
                        {/* Spinal Cord Trunk 3D */}
                        <line x1="80" y1="48" x2="80" y2="210" stroke="#00F0FF" strokeWidth="2" strokeDasharray="3 2" filter="url(#glow3D)" />

                        {/* Peripheral Nerve Branches */}
                        <path d="M 80 95 L 46 108 M 80 95 L 114 108" stroke="#38BDF8" strokeWidth="1.2" />
                        <path d="M 80 145 L 38 158 M 80 145 L 122 158" stroke="#38BDF8" strokeWidth="1.2" />
                        <path d="M 80 210 L 60 285 M 80 210 L 100 285" stroke="#38BDF8" strokeWidth="1.2" />
                      </g>
                    )}

                    {/* 5. VITAL ORGANS OVERLAY 3D */}
                    {showOrgans && (
                      <g 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(60px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* 3D Volumetric Heart */}
                        <g 
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedOrgan('cardiac')}
                        >
                          <circle cx="84" cy="125" r="9" fill="url(#organHeart3D)" stroke="#FFF" strokeWidth="1.5" filter="url(#glow3D)" />
                          <circle cx="84" cy="125" r="4" fill="#FF80BF" className={animateFlow ? 'animate-ping' : ''} />
                        </g>

                        {/* 3D Volumetric Lungs */}
                        <g 
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedOrgan('pulmonary')}
                        >
                          <ellipse cx="68" cy="124" rx="7" ry="12" fill="rgba(16,185,129,0.7)" stroke="#34D399" strokeWidth="1" />
                          <ellipse cx="98" cy="124" rx="7" ry="12" fill="rgba(16,185,129,0.7)" stroke="#34D399" strokeWidth="1" />
                        </g>

                        {/* 3D Volumetric Brain Node */}
                        <g 
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedOrgan('brain')}
                        >
                          <circle cx="80" cy="38" r="7" fill={selectedOrgan === 'brain' ? '#00F0FF' : 'rgba(0,240,255,0.7)'} stroke="#FFF" strokeWidth="1.5" />
                        </g>
                      </g>
                    )}

                  </svg>

                  <p className="text-[10px] font-black text-pink-400 mt-1 font-mono tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></span>
                    <span>FEMALE 3D MODEL</span>
                  </p>
                </div>
              )}

              {/* MALE MODEL SVG 3D */}
              {(viewMode === 'both' || viewMode === 'male') && (
                <div className="relative w-1/2 h-full flex flex-col items-center justify-center group">
                  
                  {/* Horizontal Neon Waist Aura Line */}
                  <div className="absolute top-[50%] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#00F0FF] pointer-events-none opacity-80" />

                  {/* 3D Ground Shadow Ring under feet */}
                  <div className="absolute bottom-2 w-2/3 h-5 rounded-[50%] bg-cyan-500/20 blur-md animate-pulse pointer-events-none" />

                  <svg className="w-full h-full max-h-[380px] filter drop-shadow-[0_0_25px_rgba(0,240,255,0.65)]" viewBox="0 0 160 380" fill="none">
                    
                    <defs>
                      {/* Volumetric Male Body Shader */}
                      <radialGradient id="maleBodySkin3D" cx="50%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="rgba(6,182,212,0.45)" />
                        <stop offset="50%" stopColor="rgba(2,132,199,0.25)" />
                        <stop offset="90%" stopColor="rgba(15,23,42,0.8)" />
                      </radialGradient>

                      <linearGradient id="maleMuscleGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="50%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#0369A1" />
                      </linearGradient>

                      <linearGradient id="maleBoneGrad3D" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E0F2FE" />
                        <stop offset="50%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </linearGradient>
                    </defs>

                    {/* 0. REALISTIC 3D VOLUMETRIC MALE BODY SILHOUETTE SHELL */}
                    <g opacity="0.95">
                      {/* Volumetric V-Taper Male Body Shell Path */}
                      <path 
                        d="M 80 16 
                           C 68 16 64 36 70 48 
                           L 70 82 
                           Q 80 90 90 82 
                           L 90 48 
                           C 96 36 92 16 80 16 Z
                           M 70 82 
                           Q 50 88 32 102 
                           L 24 168 
                           L 18 218
                           C 26 220 30 218 36 208
                           C 32 185 36 150 42 125
                           C 40 155 48 188 46 228
                           C 44 265 52 300 56 350
                           L 76 350
                           C 76 320 78 260 80 225
                           C 82 260 84 320 84 350
                           L 104 350
                           C 108 300 116 265 114 228
                           C 112 188 120 155 118 125
                           C 124 150 128 185 124 208
                           C 130 218 134 220 142 218
                           L 136 168
                           L 128 102
                           Q 110 88 90 82 Z" 
                        fill="url(#maleBodySkin3D)"
                        stroke="#00F0FF"
                        strokeWidth="1.2"
                        filter="url(#glow3D)"
                      />

                      {/* Volumetric Male Muscle Highlights */}
                      <path d="M 48 112 C 78 132 82 132 112 112" stroke="#00F0FF" strokeWidth="1" opacity="0.7" fill="none" />
                      <path d="M 46 148 C 78 165 82 165 114 148" stroke="#38BDF8" strokeWidth="0.8" opacity="0.6" fill="none" />
                      <path d="M 52 190 Q 80 205 108 190" stroke="#00F0FF" strokeWidth="0.8" opacity="0.5" fill="none" />
                      <path d="M 56 235 Q 68 285 62 335" stroke="#38BDF8" strokeWidth="0.8" opacity="0.4" fill="none" />
                      <path d="M 104 235 Q 92 285 98 335" stroke="#38BDF8" strokeWidth="0.8" opacity="0.4" fill="none" />
                    </g>

                    {/* 1. SKELETON LAYER (Male Broad Skeleton 3D) */}
                    {showSkeleton && (
                      <g 
                        opacity="0.92" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(-40px) scale(0.92)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* 3D Skull Dome */}
                        <ellipse cx="80" cy="38" rx="14" ry="16" fill="url(#maleBoneGrad3D)" opacity="0.8" />
                        <ellipse cx="80" cy="38" rx="12" ry="14" fill="none" stroke="#38BDF8" strokeWidth="1" />
                        {/* Eye Sockets */}
                        <ellipse cx="74" cy="36" rx="3.5" ry="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.8" />
                        <ellipse cx="86" cy="36" rx="3.5" ry="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.8" />
                        {/* Mandible Jaw Line */}
                        <path d="M 68 46 Q 80 56 92 46 L 88 52 Q 80 58 72 52 Z" fill="#38BDF8" opacity="0.8" />

                        {/* Vertebral Spine */}
                        <g stroke="#38BDF8" strokeWidth="1.5">
                          {[56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208].map((y, idx) => (
                            <line key={idx} x1="77" y1={y} x2="83" y2={y} strokeWidth="2.5" strokeLinecap="round" />
                          ))}
                        </g>

                        {/* Broad Shoulders / Clavicles */}
                        <line x1="38" y1="98" x2="122" y2="98" stroke="url(#maleBoneGrad3D)" strokeWidth="3" strokeLinecap="round" />

                        {/* Broad Male Ribcage Arches */}
                        <g fill="none" stroke="#38BDF8" strokeWidth="1.2">
                          <path d="M 76 110 C 56 112 52 135 76 142" />
                          <path d="M 84 110 C 104 112 108 135 84 142" />
                          <path d="M 76 118 C 54 122 50 145 76 152" />
                          <path d="M 84 118 C 106 122 110 145 84 152" />
                          <path d="M 76 128 C 56 132 52 155 76 160" />
                          <path d="M 84 128 C 104 132 108 155 84 160" />
                          <path d="M 76 138 C 58 142 54 162 76 168" />
                          <path d="M 84 138 C 102 142 106 162 84 168" />
                        </g>

                        {/* Pelvis Girdle 3D */}
                        <path d="M 52 200 Q 80 230 108 200 Q 80 218 52 200 Z" fill="url(#maleBoneGrad3D)" opacity="0.6" stroke="#38BDF8" strokeWidth="1.5" />

                        {/* Limb Bones */}
                        <line x1="35" y1="102" x2="26" y2="158" stroke="url(#maleBoneGrad3D)" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="125" y1="102" x2="134" y2="158" stroke="url(#maleBoneGrad3D)" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="26" y1="158" x2="20" y2="208" stroke="url(#maleBoneGrad3D)" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="134" y1="158" x2="140" y2="208" stroke="url(#maleBoneGrad3D)" strokeWidth="2.5" strokeLinecap="round" />

                        <line x1="64" y1="218" x2="58" y2="288" stroke="url(#maleBoneGrad3D)" strokeWidth="4" strokeLinecap="round" />
                        <line x1="96" y1="218" x2="102" y2="288" stroke="url(#maleBoneGrad3D)" strokeWidth="4" strokeLinecap="round" />
                        <line x1="58" y1="288" x2="62" y2="345" stroke="url(#maleBoneGrad3D)" strokeWidth="3" strokeLinecap="round" />
                        <line x1="102" y1="288" x2="98" y2="345" stroke="url(#maleBoneGrad3D)" strokeWidth="3" strokeLinecap="round" />

                        {/* Joint Heads */}
                        <circle cx="35" cy="102" r="4.5" fill="#38BDF8" filter="url(#glow3D)" />
                        <circle cx="125" cy="102" r="4.5" fill="#38BDF8" filter="url(#glow3D)" />
                        <circle cx="58" cy="288" r="5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
                        <circle cx="102" cy="288" r="5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
                      </g>
                    )}

                    {/* 2. MUSCULAR LAYER (Sculpted Male Muscle Mass 3D) */}
                    {showMuscles && (
                      <g 
                        opacity="0.88" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(-10px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        {/* Heavy Pectorals 3D */}
                        <path d="M 46 108 C 58 98 78 122 78 136 C 58 138 46 130 46 108 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />
                        <path d="M 114 108 C 102 98 82 122 82 136 C 102 138 114 130 114 108 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />

                        {/* Broad Shoulder Deltoids 3D */}
                        <path d="M 38 102 C 26 108 28 128 36 134 C 42 124 42 108 38 102 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />
                        <path d="M 122 102 C 134 108 132 128 124 134 C 118 124 118 108 122 102 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />

                        {/* Heavy Biceps & Forearms 3D */}
                        <ellipse cx="30" cy="142" rx="6" ry="14" fill="url(#maleMuscleGrad3D)" stroke="#38BDF8" strokeWidth="0.8" />
                        <ellipse cx="130" cy="142" rx="6" ry="14" fill="url(#maleMuscleGrad3D)" stroke="#38BDF8" strokeWidth="0.8" />

                        {/* Sculpted 8-Pack Abdominals 3D */}
                        <g fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.6" opacity="0.95">
                          <rect x="69" y="142" width="9" height="11" rx="2.5" />
                          <rect x="82" y="142" width="9" height="11" rx="2.5" />
                          <rect x="69" y="156" width="9" height="11" rx="2.5" />
                          <rect x="82" y="156" width="9" height="11" rx="2.5" />
                          <rect x="70" y="170" width="8" height="10" rx="2" />
                          <rect x="82" y="170" width="8" height="10" rx="2" />
                        </g>

                        {/* Quadriceps 3D Thigh Bulges */}
                        <path d="M 52 222 C 68 232 68 280 60 292 C 48 275 46 235 52 222 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />
                        <path d="M 108 222 C 92 232 92 280 100 292 C 112 275 114 235 108 222 Z" fill="url(#maleMuscleGrad3D)" stroke="#00F0FF" strokeWidth="0.8" />

                        {/* Calves 3D */}
                        <path d="M 56 295 C 66 308 66 332 60 342 C 54 330 54 305 56 295 Z" fill="url(#maleMuscleGrad3D)" stroke="#38BDF8" strokeWidth="0.6" />
                        <path d="M 104 295 C 94 308 94 332 100 342 C 106 330 106 305 104 295 Z" fill="url(#maleMuscleGrad3D)" stroke="#38BDF8" strokeWidth="0.6" />
                      </g>
                    )}

                    {/* 3. VASCULAR LAYER (Arterial Flow 3D) */}
                    {showVascular && (
                      <g 
                        opacity="0.95" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(20px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        <path 
                          d="M 76 120 
                             C 76 95 80 75 80 38 
                             M 76 120 
                             C 55 105 32 125 26 158 
                             L 20 208 
                             M 76 120 
                             C 98 105 128 125 134 158 
                             L 140 208 
                             M 76 120 
                             L 80 218 
                             C 68 245 58 285 62 345 
                             M 80 218 
                             C 92 245 102 285 98 345" 
                          stroke="#38BDF8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={animateFlow ? "8 4" : "none"}
                          strokeDashoffset={dashOffset}
                          filter="url(#glow3D)"
                        />
                      </g>
                    )}

                    {/* 4. NEURAL LAYER */}
                    {showNeural && (
                      <g 
                        opacity="0.95" 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(45px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        <circle cx="80" cy="38" r="10" fill="url(#organBrain3D)" opacity="0.85" />
                        <circle cx="80" cy="38" r="10" stroke="#38BDF8" strokeWidth="1.5" fill="none" filter="url(#glow3D)" />
                        <line x1="80" y1="48" x2="80" y2="215" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 2" filter="url(#glow3D)" />
                      </g>
                    )}

                    {/* 5. VITAL ORGANS OVERLAY */}
                    {showOrgans && (
                      <g 
                        style={{ 
                          transform: explodeLayers3D ? 'translateZ(60px)' : 'none', 
                          transition: 'all 0.5s ease' 
                        }}
                      >
                        <g 
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedOrgan('cardiac')}
                        >
                          <circle cx="76" cy="120" r="9" fill="url(#organHeart3D)" stroke="#FFF" strokeWidth="1.5" filter="url(#glow3D)" />
                          <circle cx="76" cy="120" r="4" fill="#38BDF8" className={animateFlow ? 'animate-ping' : ''} />
                        </g>

                        <g 
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedOrgan('brain')}
                        >
                          <circle cx="80" cy="38" r="7" fill={selectedOrgan === 'brain' ? '#00F0FF' : 'rgba(0,240,255,0.7)'} stroke="#FFF" strokeWidth="1.5" />
                        </g>
                      </g>
                    )}

                  </svg>

                  <p className="text-[10px] font-black text-cyan-400 mt-1 font-mono tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>MALE 3D MODEL</span>
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Bottom Hologram Telemetry Bar */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs z-10 font-mono">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <p className="font-black text-white">{isAr ? 'حالة القنوات التشريحية' : 'ANATOMICAL MESH ACTIVE'}</p>
                <p className="text-[10px] text-slate-400">{isAr ? 'زاوية المسح الضوئي: 360 درجة' : 'Full 360° Layer Transparency'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-bold text-slate-200">
              <span className="text-pink-400">FEMALE: 98%</span>
              <span className="text-slate-700">|</span>
              <span className="text-cyan-400">MALE: 99%</span>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: INTERACTIVE ORGAN INSPECTION & DIAGNOSTIC DETAILS */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          
          {/* Selected Organ Diagnostic Card */}
          <div 
            className="bg-slate-950/90 border p-4 rounded-2xl relative overflow-hidden transition-all shadow-xl"
            style={{ borderColor: currentOrganInfo.color }}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: currentOrganInfo.bgGlow, border: `1px solid ${currentOrganInfo.color}` }}
                >
                  <ActiveOrganIcon className="w-4.5 h-4.5" style={{ color: currentOrganInfo.color }} />
                </div>
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">
                    {isAr ? 'الأداة الفاحصة' : 'SELECTED ORGAN'}
                  </span>
                  <h3 className="text-xs font-black text-white">
                    {isAr ? currentOrganInfo.titleAr : currentOrganInfo.titleEn}
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">{isAr ? currentOrganInfo.metricLabelAr : currentOrganInfo.metricLabelEn}:</span>
                <span className="font-mono font-black text-white" style={{ color: currentOrganInfo.color }}>
                  {currentOrganInfo.metricVal}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">{isAr ? 'كفاءة الأداء:' : 'Efficiency:'}</span>
                <span className="font-mono font-black text-emerald-400">{currentOrganInfo.efficiency}%</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentOrganInfo.efficiency}%`, backgroundColor: currentOrganInfo.color }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
              {isAr ? currentOrganInfo.descAr : currentOrganInfo.descEn}
            </p>
          </div>

          {/* Dual Wave Line Comparison Graph */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-2">
            <p className="text-[10px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'مُقارنة الموجات التشريحية المزدوجة' : 'DUAL ANATOMICAL WAVEFORM'}</span>
            </p>
            
            <div className="h-20 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
                {/* Female Wave Path */}
                <path
                  d="M 0 30 Q 25 10 50 30 T 100 30 T 150 30 T 200 30"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_0_6px_#EC4899]"
                />
                {/* Male Wave Path */}
                <path
                  d="M 0 30 Q 25 50 50 30 T 100 30 T 150 30 T 200 30"
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_0_6px_#00F0FF]"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[9px] font-mono font-bold">
              <span className="text-pink-400">FEMALE SYNAPSE WAVE</span>
              <span className="text-cyan-400">MALE SYNAPSE WAVE</span>
            </div>
          </div>

          {/* Lab Test Flask Purity Metric */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-7 h-7 text-pink-400 animate-bounce" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'نقاء المحلول الحيوي' : 'LAB FLASK PURITY'}</p>
                <p className="text-sm font-black text-white">99.8% OPTIMAL</p>
              </div>
            </div>

            <div className="w-12 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
              <div className="h-full bg-pink-500 w-[98%]" />
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM ORGAN PEDESTALS ROW (INTERACTIVE ORGAN SELECTION BAR) */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
        
        {/* Organ 1: Cardiac */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('cardiac')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'cardiac'
              ? 'bg-pink-500/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-pink-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-pink-500/10 border border-pink-500/40 flex items-center justify-center text-pink-400 mb-1 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
            <Heart className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'القلب والضخ' : 'CARDIAC'}</p>
          <p className="text-[9px] font-mono text-pink-400">98% HEALTH</p>
          <div className="w-10 h-1 bg-pink-500/50 rounded-full mt-1 shadow-[0_0_8px_#EC4899]" />
        </button>

        {/* Organ 2: Neural AI Brain */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('brain')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'brain'
              ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-1 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <Brain className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'المخ والذكاء' : 'NEURAL AI'}</p>
          <p className="text-[9px] font-mono text-cyan-400">99% SYNAPSE</p>
          <div className="w-10 h-1 bg-cyan-500/50 rounded-full mt-1 shadow-[0_0_8px_#00F0FF]" />
        </button>

        {/* Organ 3: Skeletal */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('skeletal')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'skeletal'
              ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Bone className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'الهيكل والعظام' : 'SKELETAL'}</p>
          <p className="text-[9px] font-mono text-amber-400">96% BONE DENSITY</p>
          <div className="w-10 h-1 bg-amber-500/50 rounded-full mt-1 shadow-[0_0_8px_#F59E0B]" />
        </button>

        {/* Organ 4: Muscles */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('muscles')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'muscles'
              ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-1 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'الأنسجة والعضلات' : 'MUSCULAR'}</p>
          <p className="text-[9px] font-mono text-purple-400">94% POWER</p>
          <div className="w-10 h-1 bg-purple-500/50 rounded-full mt-1 shadow-[0_0_8px_#A855F7]" />
        </button>

        {/* Organ 5: Optical */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('optical')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'optical'
              ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-1 shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            <Eye className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'البصريات والرؤية' : 'OPTICAL'}</p>
          <p className="text-[9px] font-mono text-sky-400">100% VISIBILITY</p>
          <div className="w-10 h-1 bg-sky-500/50 rounded-full mt-1 shadow-[0_0_8px_#38BDF8]" />
        </button>

        {/* Organ 6: Pulmonary */}
        <button
          type="button"
          onClick={() => setSelectedOrgan('pulmonary')}
          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center relative cursor-pointer border transition-all ${
            selectedOrgan === 'pulmonary'
              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105'
              : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-1 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Wind className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-black text-white uppercase">{isAr ? 'الرئتان والتنفس' : 'PULMONARY'}</p>
          <p className="text-[9px] font-mono text-emerald-400">97% SPO2 FLOW</p>
          <div className="w-10 h-1 bg-emerald-500/50 rounded-full mt-1 shadow-[0_0_8px_#10B981]" />
        </button>

      </div>

    </div>
  );
};
