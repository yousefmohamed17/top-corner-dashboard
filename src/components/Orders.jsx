import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Clock, CheckCircle, Loader, Trash2, AlertTriangle, X, MapPin, CalendarClock, Phone, Smartphone, ListFilter } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const Orders = ({ currency, tax }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Processing', 'Shipped', 'Delivered'
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, orderId: null });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setOrders(items.sort((a, b) => b.timestamp - a.timestamp));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const cycleStatus = async (orderId, currentStatus) => {
    const statuses = ['Processing', 'Shipped', 'Delivered'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus });
    } catch (err) {
      console.error("Error updating status: ", err);
    }
  };

  const confirmDelete = async () => {
    if (deleteModal.orderId) {
      try {
        await deleteDoc(doc(db, 'orders', deleteModal.orderId));
      } catch (err) {
        console.error("Error deleting document:", err);
      }
    }
    setDeleteModal({ isOpen: false, orderId: null });
  };

  // تصفية الأوردرات بناءً على الفلتر المختار
  const filteredOrders = activeFilter === 'All' 
    ? orders 
    : orders.filter(order => order.status === activeFilter);

  // حساب الأعداد لكل حالة
  const stats = {
    All: orders.length,
    Processing: orders.filter(o => o.status === 'Processing').length,
    Shipped: orders.filter(o => o.status === 'Shipped').length,
    Delivered: orders.filter(o => o.status === 'Delivered').length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8 p-1 lg:p-2 relative pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Orders & Sales</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Track customer purchases and locations.</p>
        </div>

        {/* نظام الفلتر الجديد */}
        <div className="flex bg-[#111] border border-white/10 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          {['All', 'Processing', 'Shipped', 'Delivered'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeFilter === filter 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {filter}
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeFilter === filter ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-600'}`}>
                {stats[filter]}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="bg-[#111] rounded-3xl lg:rounded-[2.5rem] border border-white/5 shadow-2xl w-full overflow-x-auto min-h-[400px] relative custom-scrollbar">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
            <Loader className="animate-spin mb-4" size={40} />
            <p className="font-bold tracking-widest uppercase text-xs">Syncing Live Orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
               <ListFilter size={24} className="opacity-20" />
            </div>
            <p className="font-bold tracking-widest uppercase text-xs">No {activeFilter === 'All' ? '' : activeFilter} orders found.</p>
          </div>
        ) : (
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-white/5 text-gray-500 uppercase text-[10px] lg:text-xs tracking-[0.15em] font-black">
                <th className="px-8 py-6">Order ID</th>
                <th className="px-8 py-6">Customer Info</th>
                <th className="px-8 py-6">Items</th>
                <th className="px-8 py-6">Total (Incl. Tax)</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredOrders.map((order) => {
                const totalWithTax = order.finalTotal || (order.baseTotal * (1 + tax / 100)).toFixed(2);
                return (
                  <tr key={order.id} className="hover:bg-blue-600/[0.03] transition-colors group">
                    <td className="px-8 py-8 font-black text-blue-500 text-sm lg:text-base italic tracking-tighter">{order.orderId}</td>
                    
                    <td className="px-8 py-8">
                      <div className="text-white font-black text-sm lg:text-base mb-1.5 truncate max-w-[220px]" title={order.customer}>{order.customer}</div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3 mt-1">
                        {order.phone && order.phone !== 'Not Provided' && (
                          <a href={`https://wa.me/2${order.phone}`} target="_blank" rel="noreferrer" className="text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-green-500 hover:text-white transition-all font-black">
                            <Phone size={10}/> {order.phone}
                          </a>
                        )}
                        {order.altPhone && (
                          <a href={`https://wa.me/2${order.altPhone}`} target="_blank" rel="noreferrer" className="text-[9px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-500 hover:text-white transition-all font-black">
                            <Smartphone size={10}/> {order.altPhone}
                          </a>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[10px] text-gray-400 flex items-start gap-2">
                          <MapPin size={12} className="text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-tight font-bold">{order.address || 'No location'} {order.region && `(${order.region})`}</span>
                        </div>
                        <div className="text-[10px] text-amber-500 flex items-center gap-2 font-black uppercase tracking-widest">
                          <CalendarClock size={12} /> 
                          Deliver By: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-GB') : 'N/A'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-8 py-8 max-w-[250px]">
                      <div 
                        className="text-gray-400 text-xs lg:text-sm bg-white/5 border border-white/5 p-3 rounded-2xl leading-relaxed italic"
                        title={order.items}
                      >
                        {order.items}
                      </div>
                    </td>

                    <td className="px-8 py-8">
                      <div className="text-white font-black text-lg lg:text-xl tracking-tighter">{currency} {totalWithTax}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Shipping: {order.shippingFee > 0 ? `${currency}${order.shippingFee}` : 'Free'}</div>
                    </td>
                    
                    <td className="px-8 py-8 text-center">
                      <button 
                        onClick={() => cycleStatus(order.id, order.status)}
                        className="active:scale-95 transition-transform"
                      >
                        {order.status === 'Processing' && <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all"><Clock size={14}/> Processing</span>}
                        {order.status === 'Shipped' && <span className="text-blue-500 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all"><Truck size={14}/> Shipped</span>}
                        {order.status === 'Delivered' && <span className="text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-500 hover:text-white transition-all"><CheckCircle size={14}/> Delivered</span>}
                      </button>
                    </td>
                    
                    <td className="px-8 py-8 text-center">
                      <button onClick={() => setDeleteModal({ isOpen: true, orderId: order.id })} className="text-gray-700 hover:text-red-500 p-3 transition-all hover:bg-red-500/10 rounded-2xl">
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* مودال الحذف (نفس الكود السابق مع تظبيط بسيط) */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteModal({ isOpen: false, orderId: null })} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#111] border border-white/10 p-10 rounded-[3rem] w-full max-w-md relative z-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black italic uppercase text-white mb-4 tracking-tighter">Remove Order?</h2>
              <p className="text-gray-500 text-sm font-bold mb-8 leading-relaxed">This action is permanent. The order data will be purged from the system.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteModal({ isOpen: false, orderId: null })} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-red-600 text-white hover:bg-red-700 transition-all shadow-xl shadow-red-600/20">Purge Order</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Orders;