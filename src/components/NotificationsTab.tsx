import React from 'react';
import { Bell, AlertTriangle, Check, CheckCheck, Trash2, DollarSign } from 'lucide-react';
import { MarketNotification, StoreSettings } from '../types';

interface NotificationsTabProps {
  notifications: MarketNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<MarketNotification[]>>;
  settings: StoreSettings;
  onOpenProducts: () => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  setNotifications,
  settings,
  onOpenProducts,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#10192D] p-5 rounded-3xl border border-blue-500/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            {isKu ? 'سەنتەری ئاگادارییەکان و ئاگادارکردنەوەی ڕاستەوخۆ' : isAr ? 'مركز الإشعارات والتنبيهات المباشرة' : 'Live System Notification Hub'}
          </h2>
          <p className="text-xs text-slate-400">
            {isKu ? 'ئاگادارکردنەوەی کەمیی کۆگا، سەرکەوتنی دابینکردن و ئامانجەکانی فرۆشتن' : isAr ? 'تنبيهات انخفاض الأصناف، نجاح التوريدات، وتحقيق أهداف المبيعات' : 'Critical low stock warnings, PO confirmations, and sales targets'}
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
        >
          <CheckCheck className="w-4 h-4 text-cyan-400" />
          <span>{isKu ? 'نیشانەکردنی هەمووی وەکو خوێنراوە' : isAr ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2 cyber-card rounded-3xl">
            <Bell className="w-10 h-10 mx-auto opacity-30 text-cyan-400" />
            <p className="text-sm font-semibold">
              {isKu ? 'هیچ ئاگادارییەکی نوێ نییە' : isAr ? 'لا توجد إشعارات جديدة حالياً' : 'No notifications present'}
            </p>
          </div>
        ) : (
          notifications.map(n => {
            const priorityStyle = 
              n.priority === 'critical' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              n.priority === 'high' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-blue-500/10 border-blue-500/30 text-cyan-400';

            return (
              <div
                key={n.id}
                className={`p-5 rounded-3xl border transition-all flex items-start justify-between gap-4 ${
                  n.read ? 'bg-[#0B1120]/60 border-slate-800 opacity-70' : 'cyber-card border-blue-500/30'
                }`}
              >
                <div className="flex items-start space-x-3.5 rtl:space-x-reverse">
                  <div className={`p-2.5 rounded-2xl border ${priorityStyle} shrink-0`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {isKu ? (n.titleKu || n.titleAr || n.title) : isAr ? n.titleAr : n.title}
                      </h4>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {isKu ? (n.messageKu || n.messageAr || n.message) : isAr ? n.messageAr : n.message}
                    </p>

                    {n.category === 'inventory' && (
                      <button
                        onClick={onOpenProducts}
                        className="mt-2 text-xs font-semibold text-cyan-400 hover:underline inline-block"
                      >
                        {isKu ? 'پێداچوونەوەی کاڵاکان ئێستا ←' : isAr ? 'مراجعة الأصناف الآن ←' : 'Review inventory now →'}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteNotif(n.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
