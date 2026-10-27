import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

function mountApp() {
  const container = document.getElementById('root');
  if (!container) return;

  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err: any) {
    console.error('Root mount error:', err);
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0B1120;color:#f87171;font-family:system-ui;text-align:center;padding:20px;" dir="rtl">
        <div style="width:48px;height:48px;background:rgba(239,68,68,0.15);border:2px solid #ef4444;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#ef4444;font-size:24px;">⚠️</div>
        <h2 style="font-size:18px;font-weight:bold;margin-bottom:8px;color:#fff;">تعذر بدء تشغيل واجهة البرنامج</h2>
        <p style="font-size:12px;color:#cbd5e1;max-width:440px;margin-bottom:16px;line-height:1.6;">${err?.message || 'حدث خطأ في تحميل الصفحة أو تعارض في البيانات المؤقتة.'}</p>
        <button onclick="localStorage.clear();sessionStorage.clear();if('caches' in window){caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x)))).then(()=>window.location.reload())}else{window.location.reload()};" style="background:#06b6d4;color:#0b1120;font-weight:800;border:none;padding:12px 28px;border-radius:12px;cursor:pointer;font-size:13px;box-shadow:0 0 20px rgba(6,182,212,0.4);">
          إعادة تعيين وتشغيل البرنامج الآن
        </button>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
