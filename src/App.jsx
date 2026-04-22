import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, LogOut, User, ShoppingBag, ShieldAlert } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Storefront from './components/Storefront';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Settings from './components/Settings';
import Login from './components/Login';
import Profile from './components/Profile';
import Customers from './components/Customers'; 

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null); 
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  const MASTER_ADMIN = 'ym828816@gmail.com';

  const defaultSettings = {
    storeName: 'Top Corner',
    currency: 'E.G',
    email: 'support@topcorner.com',
    tax: 14,
    storeLocation: 'القاهرة',
    shippingRates: {},
    disabledRegions: [],
    admins: [MASTER_ADMIN], 
    storeLogo: ''
  };

  const [shopSettings, setShopSettingsState] = useState(() => {
    const savedSettings = localStorage.getItem('shopSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return { 
        ...defaultSettings, 
        ...parsed, 
        admins: parsed.admins ? (parsed.admins.includes(MASTER_ADMIN) ? parsed.admins : [...parsed.admins, MASTER_ADMIN]) : [MASTER_ADMIN] 
      };
    }
    return defaultSettings;
  });

  // ==========================================
  // التعديل السحري: مزامنة إعدادات المتجر (ومنها قفل الشحن) لحظياً لكل العملاء
  // ==========================================
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'shop'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setShopSettingsState({
          ...defaultSettings,
          ...data,
          admins: data.admins?.includes(MASTER_ADMIN) ? data.admins : [...(data.admins || []), MASTER_ADMIN]
        });
      } else {
        // إنشاء ملف الإعدادات في الداتابيز لأول مرة لو مش موجود
        setDoc(doc(db, 'settings', 'shop'), shopSettings);
      }
    });
    return () => unsubSettings();
  }, []);

  // دالة ذكية هتباصيها لصفحة Settings عشان لما الأدمن يعدل، ترمي في الداتابيز مباشرة
  const handleUpdateSettings = async (newSettings) => {
    const updated = typeof newSettings === 'function' ? newSettings(shopSettings) : newSettings;
    setShopSettingsState(updated); // تحديث سريع للـ UI
    try {
      await setDoc(doc(db, 'settings', 'shop'), updated, { merge: true });
    } catch (err) {
      console.error("Error saving global settings:", err);
    }
  };

  // مراقبة بيانات العميل والحظر
  useEffect(() => {
    let unsubStore = () => {}; 

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        setIsAuthChecking(true); 

        const userDocRef = doc(db, 'users', user.uid);
        unsubStore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserPhoto(data.photo || null);

            if (data.isBlocked && user.email !== MASTER_ADMIN) {
              setIsUserBlocked(true);
            } else {
              setIsUserBlocked(false);
            }
          } else {
            setIsUserBlocked(false);
          }
          setIsAuthChecking(false);
        });

        const isUserAdmin = shopSettings.admins?.includes(user.email) || user.email === MASTER_ADMIN;

        if (!isUserAdmin) {
          if (activeTab !== 'profile') setActiveTab('storefront');
        } else {
          if (!['overview', 'inventory', 'orders', 'customers', 'settings', 'profile'].includes(activeTab)) {
            setActiveTab('overview');
          }
        }
      } else {
        setUserPhoto(null);
        setIsUserBlocked(false);
        setIsAuthChecking(false);
      }
    });

    return () => {
      unsubscribe();
      unsubStore();
    };
  }, [activeTab, shopSettings.admins]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('shopSettings', JSON.stringify(shopSettings));
    
    document.title = `${shopSettings.storeName} | System`;

    const defaultShirtFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z'/%3E%3C/svg%3E";

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    
    link.href = shopSettings.storeLogo || defaultShirtFavicon;

  }, [activeTab, shopSettings, currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('activeTab');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (isAuthChecking) {
    return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-black italic text-2xl uppercase tracking-tighter animate-pulse">Loading System...</div>;
  }

  if (isUserBlocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-red-600 selection:text-white font-sans relative overflow-hidden" dir="rtl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] border border-red-500/30 p-8 md:p-12 rounded-[2.5rem] w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(220,38,38,0.15)] text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <ShieldAlert size={36} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 text-sm font-bold leading-relaxed mb-8">
            عذراً، لقد تم تعليق هذا الحساب من قبل الإدارة.<br />يرجى التواصل مع الدعم الفني للمساعدة.
          </p>
          <button onClick={handleLogout} className="w-full bg-red-600 text-white font-black rounded-2xl py-4 uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2">
            حسناً، العودة للبداية
          </button>
        </motion.div>
      </div>
    );
  }

  const isFullyAuthenticated = currentUser && currentUser.emailVerified;

  if (!isFullyAuthenticated) {
    return <Login shopSettings={shopSettings} />;
  }

  const isAdmin = shopSettings.admins?.includes(currentUser.email) || currentUser.email === MASTER_ADMIN;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-600 selection:text-white overflow-hidden" dir="ltr">
      
      {isAdmin && (
        <>
          {isSidebarOpen && (
            <div className="md:hidden fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          )}

          <div className={`fixed inset-y-0 left-0 z-[70] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
              storeName={shopSettings.storeName}
              storeLogo={shopSettings.storeLogo} 
              closeSidebar={() => setIsSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col h-screen w-full relative">
        
        {isAdmin && (
          <header className="md:hidden shrink-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 p-4 flex justify-between items-center shadow-lg">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="bg-[#111] p-2.5 rounded-xl border border-white/10 text-white shadow-md active:scale-95 transition-transform"
            >
              <Menu size={22} />
            </button>
            
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${activeTab === 'profile' ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-[#111] border-white/5 hover:border-white/10'}`}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/10">
                {userPhoto ? (
                  <img src={userPhoto} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-gray-500" />
                )}
              </div>
            </button>
          </header>
        )}

        <main className="flex-1 overflow-y-auto w-full relative custom-scrollbar p-4 md:p-8">
          
          {isAdmin && (
             <div className="hidden md:flex absolute top-8 right-8 items-center gap-4 z-10 group cursor-pointer">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`relative p-1 rounded-xl transition-all border ${activeTab === 'profile' ? 'border-blue-600 shadow-lg shadow-blue-600/20' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0">
                    {userPhoto ? (
                      <img src={userPhoto} alt="Admin" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-gray-500" />
                    )}
                  </div>
                  <span className="absolute -bottom-10 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#111] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none shadow-xl">
                    Admin Profile
                  </span>
                </button>
             </div>
          )}

          {!isAdmin && (
            <div className="flex justify-between items-center mb-10 mt-2 max-w-7xl mx-auto px-2">
               <div className="flex gap-4 bg-[#111] p-2 rounded-2xl border border-white/5 items-center overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('storefront')}
                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'storefront' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
                  >
                    <ShoppingBag size={18} /> Shop
                  </button>

                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-black border border-white/10 flex items-center justify-center shrink-0">
                      {userPhoto ? (
                        <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                    <span className="hidden sm:inline-block">Profile</span>
                  </button>
               </div>

               <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors bg-[#111] px-5 py-3.5 rounded-xl border border-white/5 whitespace-nowrap shrink-0">
                  <LogOut size={18} /> <span className="hidden sm:inline-block">Sign Out</span>
               </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            {isAdmin && activeTab === 'overview' && <Overview currency={shopSettings.currency} tax={shopSettings.tax} />}
            {isAdmin && activeTab === 'inventory' && <Inventory currency={shopSettings.currency} tax={shopSettings.tax} />}
            {isAdmin && activeTab === 'orders' && <Orders currency={shopSettings.currency} tax={shopSettings.tax} />}
            {isAdmin && activeTab === 'customers' && <Customers />} 
            {/* تمرير الدالة الجديدة عشان حفظ الإعدادات يرمي في الداتابيز مباشرة */}
            {isAdmin && activeTab === 'settings' && <Settings shopSettings={shopSettings} setShopSettings={handleUpdateSettings} />}
            {isAdmin && activeTab === 'profile' && <Profile isAdmin={true} shopSettings={shopSettings} />}
            
            {activeTab === 'storefront' && <Storefront shopSettings={shopSettings} userEmail={currentUser.email} />}
            {!isAdmin && activeTab === 'profile' && <Profile isAdmin={false} shopSettings={shopSettings} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;