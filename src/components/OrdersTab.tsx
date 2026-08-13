import React from 'react';
import { Store, Truck, Clock, MapPin, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { MarketOrder, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface OrdersTabProps {
  orders: MarketOrder[];
  settings: StoreSettings;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, settings }) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#10192D] p-5 rounded-3xl border border-blue-500/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            {isKu ? 'خشتەی داواکارییەکان، بارکردن و گەیاندن' : isAr ? 'جدول الطلبات والشحنات والتوصيل' : 'Delivery & Supplier Restock Schedule'}
          </h2>
          <p className="text-xs text-slate-400">
            {isKu ? 'بەدواداچوونی جوڵەی باری دابینکەران و کاتەکانی گەیاندن' : isAr ? 'متابعة حركة شحنات الموردين ومواعيد التوصيل للمنازل' : 'Monitor inbound supplier restocks and VIP home deliveries'}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map(o => {
          const isRestock = o.type === 'supplier_restock';
          const statusBadge = 
            o.status === 'in_transit' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
            o.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            'bg-amber-500/20 text-amber-400 border-amber-500/30';

          return (
            <div key={o.id} className="cyber-card p-5 rounded-3xl border border-blue-500/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse min-w-[240px]">
                <div className={`p-3 rounded-2xl ${isRestock ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                  {isRestock ? <Truck className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {o.orderNumber}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {o.partyName}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {o.venueOrAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 rtl:space-x-reverse text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">{isKu ? 'کاتی گەیاندن' : isAr ? 'موعد التسليم' : 'Schedule'}</p>
                  <p className="font-semibold text-slate-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {o.date} ({o.time})
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 uppercase">{isKu ? 'ژمارەی کاڵا' : isAr ? 'عدد المواد' : 'Items'}</p>
                  <p className="font-bold text-slate-200">{o.itemsCount} {isKu ? 'کاڵا' : isAr ? 'صنف' : 'items'}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 uppercase">{isKu ? 'بڕی گشتی' : isAr ? 'القيمة الإجمالية' : 'Total'}</p>
                  <p className="font-mono font-bold text-emerald-400 text-sm">
                    {settings.currencySymbol}{formatNumber(o.totalAmount)}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge} uppercase`}>
                  {o.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
