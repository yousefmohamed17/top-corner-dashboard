import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, ShieldAlert, CheckCircle, Loader, Trash2, ShieldCheck, User, Mail, Phone } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

const Customers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Admins', 'Customers'

  // جلب إيميلات الأدمنز من الإعدادات للتمييز بينهم وبين العملاء
  const shopSettings = JSON.parse(localStorage.getItem('shopSettings')) || {};
  const adminEmails = shopSettings.admins || [];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setUsers(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleBlockStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("حدث خطأ أثناء تعديل حالة العميل.");
    }
  };

  const deleteCustomer = async (userId, userEmail) => {
    if (window.confirm("هل أنت متأكد من حذف هذا العميل؟ سيتم مسح بياناته وحظره من التسجيل لمدة 30 يوم.")) {
      try {
        if (userEmail) {
          // تسجيل الإيميل في الأرشيف لحظر 30 يوم (Security Logic)
          await setDoc(doc(db, 'deleted_accounts', userEmail.toLowerCase()), {
            email: userEmail.toLowerCase(),
            deletedAt: Date.now()
          });
        }
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحذف");
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.phone || '').includes(searchTerm) ||
                          (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const isUserAdmin = adminEmails.includes(u.email);
    
    if (filterTab === 'Admins') return matchesSearch && isUserAdmin;
    if (filterTab === 'Customers') return matchesSearch && !isUserAdmin;
    return matchesSearch;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8 p-1 lg:p-2 pb-24">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Customers</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Manage users, roles and access.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Tabs Filter */}
          <div className="flex bg-[#111] border border-white/10 rounded-2xl p-1.5 w-full sm:w-auto">
            {['All', 'Admins', 'Customers'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`flex-1 sm:flex-none px-6 py-3 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-[#111] border border-white/10 rounded-2xl py-3.5 sm:py-3 pl-11 pr-4 w-full outline-none focus:border-blue-600 transition-all text-white font-bold text-sm" 
            />
          </div>
        </div>
      </header>

      <div className="bg-transparent lg:bg-[#111] rounded-none lg:rounded-2xl border-0 lg:border border-white/5 lg:shadow-xl w-full relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-blue-500 py-20 bg-[#111] rounded-[2.5rem] lg:rounded-2xl">
            <Loader className="animate-spin mb-4" size={40} />
            <p className="font-bold tracking-widest uppercase text-xs">Syncing Users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-20 bg-[#111] rounded-[2.5rem] lg:rounded-2xl">
            <Users size={40} className="mb-4 opacity-50" />
            <p className="font-bold tracking-widest uppercase text-xs">No users found.</p>
          </div>
        ) : (
          <div className="block w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse block lg:table">
              <thead className="hidden lg:table-header-group sticky top-0 z-20 bg-[#111] shadow-md border-b border-white/5">
                <tr className="text-gray-500 uppercase text-xs font-black tracking-[0.2em]">
                  <th className="px-6 py-5 w-[45%]">User & Contact Info</th>
                  <th className="px-6 py-5 text-center w-[15%]">Role</th>
                  <th className="px-6 py-5 text-center w-[15%]">Joined Date</th>
                  <th className="px-6 py-5 text-center w-[25%]">Status & Actions</th>
                </tr>
              </thead>
              <tbody className="block lg:table-row-group font-medium">
                <AnimatePresence>
                  {filteredUsers.map((user) => {
                    const isUserAdmin = adminEmails.includes(user.email);
                    
                    return (
                      <motion.tr 
                        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={user.id} 
                        className={`block lg:table-row bg-[#111] lg:bg-transparent rounded-[2rem] lg:rounded-none border border-white/5 lg:border-0 lg:border-b lg:border-white/5 hover:bg-blue-600/[0.04] transition-colors group mb-4 lg:mb-0 shadow-lg lg:shadow-none ${user.isBlocked ? 'opacity-60' : ''}`}
                      >
                        {/* 1. User & Contact Info */}
                        <td className="block lg:table-cell p-5 lg:p-6 border-b border-white/5 lg:border-none last:border-none align-middle">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                              {user.photo ? <img src={user.photo} alt="avatar" className="w-full h-full object-cover" /> : <User size={22} className="text-gray-600" />}
                            </div>
                            <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                              <div className="mb-2">
                                <div className="text-white font-black text-base lg:text-lg truncate" title={user.name}>{user.name}</div>
                                {!isUserAdmin && user.username && (
                                  <div className="text-blue-500 font-bold text-[11px] tracking-widest mt-0.5">@{user.username}</div>
                                )}
                              </div>
                              
                              {/* Contact Pills with better padding/margins */}
                              <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-2 text-[10px] text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-fit shadow-sm">
                                  <Mail size={12} className="text-gray-500" /> 
                                  <span className="truncate max-w-[150px] sm:max-w-full font-semibold">{user.email}</span>
                                  <CheckCircle size={12} className="text-green-500" title="Verified Email"/>
                                </div>
                                
                                {!isUserAdmin && (
                                  <div className="flex items-center gap-2 text-[10px] text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-fit shadow-sm">
                                    <Phone size={12} className="text-gray-500" /> 
                                    <span className="font-semibold tracking-wider">{user.phone ? `+2${user.phone}` : <span className="italic opacity-50 text-gray-500">No phone</span>}</span>
                                    {user.isPhoneVerified && <CheckCircle size={12} className="text-green-500" title="Verified Phone"/>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* 2. Role Status */}
                        <td className="block lg:table-cell p-5 lg:p-6 border-b border-white/5 lg:border-none last:border-none align-middle">
                          <div className="flex lg:block justify-between items-center lg:text-center w-full">
                            <div className="text-[10px] text-gray-500 uppercase font-black lg:hidden tracking-widest">Role:</div>
                            <div className="flex lg:justify-center w-full">
                              {isUserAdmin ? (
                                <span className="bg-blue-600/10 text-blue-500 border border-blue-600/20 text-[10px] px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-widest w-fit font-black"><ShieldCheck size={14}/> Admin</span>
                              ) : (
                                <span className="bg-white/5 text-gray-400 border border-white/10 text-[10px] px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-widest w-fit font-black"><User size={14}/> Customer</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Joined Date */}
                        <td className="block lg:table-cell p-5 lg:p-6 border-b border-white/5 lg:border-none last:border-none align-middle">
                          <div className="flex lg:block justify-between items-center lg:text-center w-full">
                            <div className="text-[10px] text-gray-500 uppercase font-black lg:hidden tracking-widest">Joined:</div>
                            <div className="text-gray-400 font-bold text-sm bg-black lg:bg-transparent px-3 py-1.5 lg:p-0 rounded-lg">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'Unknown'}
                            </div>
                          </div>
                        </td>
                        
                        {/* 4. Actions */}
                        <td className="block lg:table-cell p-5 lg:p-6 border-b border-white/5 lg:border-none last:border-none align-middle">
                          <div className="flex items-center justify-end lg:justify-center gap-3 w-full">
                            {!isUserAdmin ? (
                              <>
                                <button 
                                  onClick={() => toggleBlockStatus(user.id, user.isBlocked)}
                                  className={`flex-1 lg:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${user.isBlocked ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20'}`}
                                >
                                  {user.isBlocked ? <><ShieldAlert size={14}/> Blocked</> : <><CheckCircle size={14}/> Active</>}
                                </button>
                                
                                <button 
                                  onClick={() => deleteCustomer(user.id, user.email)} 
                                  className="bg-black border border-white/10 text-gray-500 hover:bg-red-500 hover:text-white hover:border-red-500 p-3 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                                  title="Delete & Ban Customer"
                                >
                                  <Trash2 size={16}/>
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest mx-auto flex items-center justify-center gap-1"><ShieldCheck size={12}/> System Protected</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Customers;