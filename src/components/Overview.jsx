import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Shirt, ShoppingCart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// دالة لضبط التاريخ على التوقيت المحلي
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Overview = ({ currency, tax }) => {
  const [isToModified, setIsToModified] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    return {
      from: getLocalDateString(sevenDaysAgo),
      to: getLocalDateString(today)
    };
  });

  const [stats, setStats] = useState({ revenue: '0.00', ordersCount: 0, itemsSold: 0 });
  const [chartData, setChartData] = useState([]);

  // تحديث تاريخ اليوم تلقائياً طالما لم يقم المستخدم بتغييره
  useEffect(() => {
    if (isToModified) return;

    const updateToToday = () => {
      const todayStr = getLocalDateString(new Date());
      setDateRange((prev) => {
        if (prev.to !== todayStr) {
          return { ...prev, to: todayStr };
        }
        return prev;
      });
    };

    updateToToday();
    const interval = setInterval(updateToToday, 60000); 

    return () => clearInterval(interval);
  }, [isToModified]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      let totalRev = 0;
      let count = 0;

      const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
      const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);

      // حساب عدد الأيام بين البداية والنهاية
      const diffDays = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24));
      
      // تحديد نوع العرض بناءً على المدة الزمنية
      const isYearly = diffDays > 730; // لو أكتر من سنتين
      const isMonthly = diffDays > 60 && !isYearly; // لو أكتر من شهرين وأقل من سنتين

      const timeMap = new Map();

      // تجهيز الخريطة الزمنية (Map) لمنع وجود فجوات
      if (isYearly) {
        let curr = new Date(fromTime);
        curr.setMonth(0, 1); 
        while (curr <= new Date(toTime)) {
          timeMap.set(curr.getFullYear().toString(), 0);
          curr.setFullYear(curr.getFullYear() + 1);
        }
      } else if (isMonthly) {
        let curr = new Date(fromTime);
        curr.setDate(1); 
        while (curr <= new Date(toTime)) {
          const label = curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          timeMap.set(label, 0);
          curr.setMonth(curr.getMonth() + 1);
        }
      } else {
        for (let d = new Date(fromTime); d <= new Date(toTime); d.setDate(d.getDate() + 1)) {
          // شلنا اسم اليوم عشان نوفر مساحة في الـ Chart (أصبحت مثلاً Apr 22)
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
          timeMap.set(label, 0);
        }
      }

      // حساب المبيعات وإضافتها للتاريخ المناسب
      snapshot.forEach((doc) => {
        const order = doc.data();
        if (order.timestamp >= fromTime && order.timestamp <= toTime) {
          const finalPrice = order.baseTotal * (1 + tax / 100);
          totalRev += finalPrice;
          count += 1;

          const dateObj = new Date(order.timestamp);
          let label = '';

          if (isYearly) {
            label = dateObj.getFullYear().toString();
          } else if (isMonthly) {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } else {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          
          if (timeMap.has(label)) {
            timeMap.set(label, timeMap.get(label) + finalPrice);
          }
        }
      });

      setStats({
        revenue: totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ordersCount: count,
        itemsSold: count 
      });

      setChartData(Array.from(timeMap, ([name, sales]) => ({ name, sales })));
    });

    return () => unsubscribe();
  }, [tax, dateRange]);

  const StatCard = ({ title, value, icon, color, subtitle, isCurrency }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] p-5 lg:p-7 rounded-[2rem] border border-white/5 flex items-start justify-between group hover:border-blue-600 transition-all overflow-hidden"
    >
      <div className="flex flex-col min-w-0 pr-4">
        <p className="text-gray-500 font-black uppercase text-[10px] mb-2 tracking-[0.2em] shrink-0">{title}</p>
        
        <div className="flex items-baseline flex-wrap gap-1">
          {isCurrency && <span className="text-xl lg:text-2xl font-black text-white/80">{currency}</span>}
          <h3 className="text-2xl lg:text-3xl font-black text-white truncate break-all leading-none mt-1">
            {value}
          </h3>
        </div>

        {subtitle && <p className="text-blue-500/80 text-[9px] font-bold mt-2 uppercase tracking-wider shrink-0">{subtitle}</p>}
      </div>
      <div className={`p-3.5 rounded-2xl ${color} group-hover:scale-110 transition-transform shrink-0`}>{icon}</div>
    </motion.div>
  );

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      
      {/* تحسينات CSS للـ Date Picker عشان يكون متناسق مع الدارك مود */}
      <style dangerouslySetContent={{__html: `
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
          filter: invert(1) drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
        }
      `}} />

      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase italic text-white tracking-tighter">Insights</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#111] p-2 lg:p-3 rounded-2xl lg:rounded-[2rem] border border-white/10 w-full xl:w-auto">
          <div className="flex items-center gap-3 bg-black px-5 py-3 rounded-xl border border-white/5 w-full sm:w-auto hover:border-white/20 transition-colors focus-within:border-blue-500/50">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">From</span>
            <input 
              type="date" 
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="bg-transparent text-white font-bold text-xs lg:text-sm outline-none w-full cursor-pointer appearance-none" 
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <span className="text-gray-600 hidden sm:block font-black">-</span>
          <div className="flex items-center gap-3 bg-black px-5 py-3 rounded-xl border border-white/5 w-full sm:w-auto hover:border-white/20 transition-colors focus-within:border-blue-500/50">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">To</span>
            <input 
              type="date" 
              value={dateRange.to}
              onChange={(e) => {
                setIsToModified(true); 
                setDateRange({...dateRange, to: e.target.value});
              }}
              className="bg-transparent text-white font-bold text-xs lg:text-sm outline-none w-full cursor-pointer appearance-none" 
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard title="Revenue" value={stats.revenue} isCurrency={true} subtitle={`Includes ${tax}% Tax`} icon={<DollarSign size={24} className="text-blue-500" />} color="bg-blue-500/10" />
        <StatCard title="Items Sold" value={stats.itemsSold} icon={<Shirt size={24} className="text-green-500" />} color="bg-green-500/10" />
        <StatCard title="Orders" value={stats.ordersCount} icon={<ShoppingCart size={24} className="text-amber-500" />} color="bg-amber-500/10" />
        <StatCard title="Growth" value="+34%" icon={<Activity size={24} className="text-purple-500" />} color="bg-purple-500/10" />
      </div>

      <div className="bg-[#111] p-5 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-white/5 h-[350px] lg:h-[500px] flex flex-col w-full overflow-hidden shadow-2xl">
        <h3 className="text-base lg:text-xl font-black text-white mb-8 uppercase tracking-widest flex justify-between items-center px-2">
          <span>Revenue Analytics</span>
          <span className="text-[9px] lg:text-[10px] text-blue-500 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 hidden sm:block font-black tracking-widest uppercase">Showing final totals (w/ Tax)</span>
        </h3>
        <div className="flex-1 w-full h-full min-w-0 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#555" 
                tick={{fill: '#888', fontWeight: 'bold', fontSize: window.innerWidth < 768 ? 9 : 11}} 
                axisLine={false} 
                tickLine={false}
                tickMargin={15} 
                minTickGap={30} /* دي الخاصية اللي بتمنع النصوص تدخل في بعضها */
              />
              <YAxis 
                stroke="#555" 
                tick={{fill: '#888', fontWeight: 'bold', fontSize: window.innerWidth < 768 ? 9 : 11}} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${currency} ${(v/1000).toFixed(0)}k` : `${currency} ${v}`} 
                width={window.innerWidth < 768 ? 55 : 75} 
                tickMargin={10} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '12px' }} 
                itemStyle={{ color: '#2563eb', fontWeight: 'black' }} 
                formatter={(value) => [`${currency} ${value.toLocaleString()}`, 'Revenue']} 
              />
              <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Overview;