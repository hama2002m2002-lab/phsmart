import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = error instanceof Error ? error.message : String(error || '');
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B1120] text-slate-100 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-white">إعادة تشغيل البرنامج</h2>
              <p className="text-xs text-slate-400">
                يرجى الضغط على الزر أدناه لتحديث الصفحة ومتابعة العمل.
              </p>
              {this.state.errorMessage && (
                <div className="mt-2 p-2 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 font-mono text-[11px] text-right break-words select-all">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل (Refresh)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-all cursor-pointer border border-cyan-500/20"
              >
                متابعة العمل دون إعادة التحميل
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } finally {
                    window.location.reload();
                  }
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 font-bold text-xs transition-all cursor-pointer"
              >
                تحديث ومسح الذاكرة المؤقتة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
