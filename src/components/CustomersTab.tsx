import React, { useState } from 'react';
import { UserCheck, Crown, Plus, Gift, Award, Phone, Mail, Sparkles } from 'lucide-react';
import { Customer, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface CustomersTabProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  settings: StoreSettings;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  setCustomers,
  settings,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;

    const created: Customer = {
      id: `cust-${Date.now()}`,
      name: newCust.name,
      phone: newCust.phone || '+966 50 000 0000',
      email: newCust.email || 'customer@gmail.com',
      loyaltyPoints: 100, // Welcome gift
      totalSpent: 0,
      visitsCount: 1,
      tier: 'Bronze',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setCustomers(prev => [...prev, created]);
    setShowAddModal(false);
    setNewCust({ name: '', phone: '', email: '' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#10192D] p-5 rounded-3xl border border-blue-500/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-pink-400" />
            {isKu ? 'بەرنامەی وەفاداری کڕیاران و تۆمارەکان' : isAr ? 'برنامج ولاء العملاء والسجلات' : 'Customer Loyalty & Membership Club'}
          </h2>
          <p className="text-xs text-slate-400">
            {isKu ? 'بەدواداچوونی خاڵەکانی پاداشت، ئاستەکانی ئەندامێتی و مێژووی کڕینەکان' : isAr ? 'متابعة نقاط المكافآت، مستويات العضوية الذهبية والماسية، وإحصائيات الشراء' : 'Track rewards points, Gold/VIP tiers, and total purchase history'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isKu ? 'تۆمارکردنی کڕیاری نوێ' : isAr ? 'تسجيل عميل جديد' : 'Register Customer'}</span>
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {customers.map(c => {
          const tierColor = 
            c.tier === 'VIP' ? 'from-purple-500 to-indigo-600 text-purple-300 border-purple-500/40' :
            c.tier === 'Gold' ? 'from-amber-500 to-yellow-600 text-amber-300 border-amber-500/40' :
            c.tier === 'Silver' ? 'from-slate-400 to-slate-500 text-slate-200 border-slate-500/40' :
            'from-orange-600 to-amber-700 text-orange-300 border-orange-500/40';

          return (
            <div key={c.id} className="cyber-card p-5 rounded-3xl border border-blue-500/20 space-y-4 relative group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                  {c.name.charAt(0)}
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-gradient-to-r ${tierColor} flex items-center gap-1`}>
                  <Crown className="w-3 h-3" />
                  {c.tier} Member
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  {c.name}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {c.phone}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B1120] border border-blue-500/10 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">{isKu ? 'خاڵەکانی وەفاداری' : isAr ? 'نقاط الولاء' : 'Points'}</p>
                  <p className="font-bold text-pink-400 text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {c.loyaltyPoints}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 uppercase">{isKu ? 'کۆی فرۆشراو بەم کڕیارە' : isAr ? 'إجمالي المشتريات' : 'Total Spent'}</p>
                  <p className="font-mono font-bold text-emerald-400 text-sm">
                    {settings.currencySymbol}{formatNumber(c.totalSpent)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>{isKu ? `سەردانەکان: ${c.visitsCount}` : isAr ? `زيارات: ${c.visitsCount}` : `Visits: ${c.visitsCount}`}</span>
                <span>{isKu ? `بەرواری پەیوەستبوون: ${c.joinedDate}` : isAr ? `انضم: ${c.joinedDate}` : `Joined: ${c.joinedDate}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-card p-6 rounded-3xl border border-pink-500/40 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">
              {isKu ? 'تۆمارکردنی کڕیاری نوێ لە بەرنامەی وەفاداری' : isAr ? 'تسجيل عميل جديد لبرنامج الولاء' : 'Register New Loyalty Club Member'}
            </h3>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">{isKu ? 'ناوی سیانیی کڕیار' : isAr ? 'اسم العميل الثلاثي' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">{isKu ? 'ژمارەی تەلەفۆن' : isAr ? 'رقم الهاتف (لإضافة النقاط)' : 'Phone Number'}</label>
                <input
                  type="text"
                  required
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">{isKu ? 'ئیمەیڵ' : isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                <input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[11px] flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0 text-pink-400" />
                <span>{isKu ? 'کڕیار ڕاستەوخۆ ١٠٠ خاڵی دیاری بەدەستدەهێنێت!' : isAr ? 'سيصل العميل فوراً 100 نقطة ولاء كهدية ترحيبية!' : 'Customer receives 100 bonus loyalty points upon sign up!'}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isKu ? 'پاشگەزبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-600 text-white font-bold"
                >
                  {isKu ? 'تەواوکردنی تۆمارکردن' : isAr ? 'إتمام التسجيل' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
