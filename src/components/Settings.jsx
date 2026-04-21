import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CreditCard, CheckCircle, Truck, DollarSign, Percent, Mail, Settings2, MapPin, Users, Plus, Trash2, Search, ChevronDown, Check, Ban, Image as ImageIcon, Shirt } from 'lucide-react';

const egyptGovernorates = [
  "القاهرة", "الإسكندرية", "الجيزة", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "الشرقية", "السويس", "أسوان", "أسيوط", "بني سويف", "دمياط", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "جنوب سيناء", "بورسعيد", "سوهاج"
];

const Settings = ({ shopSettings, setShopSettings }) => {
  const [formData, setFormData] = useState({
    ...shopSettings,
    storeLocation: shopSettings.storeLocation || "القاهرة",
    shippingRates: shopSettings.shippingRates || {},
    disabledRegions: shopSettings.disabledRegions || [], 
    admins: shopSettings.admins || [shopSettings.email],
    storeLogo: shopSettings.storeLogo || '', 
  });

  const [isSaved, setIsSaved] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [shippingSearch, setShippingSearch] = useState('');
  
  const [isLocOpen, setIsLocOpen] = useState(false);
  const [isCurrOpen, setIsCurrOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);

  const handleSave = (e) => {
    if (e) e.preventDefault();
    setShopSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const addAdmin = () => {
    if (newAdminEmail && !formData.admins.includes(newAdminEmail)) {
      setFormData({ ...formData, admins: [...formData.admins, newAdminEmail] });
      setNewAdminEmail('');
    }
  };

  const toggleRegion = (gov) => {
    if (formData.disabledRegions.includes(gov)) {
      setFormData({ ...formData, disabledRegions: formData.disabledRegions.filter(r => r !== gov) });
    } else {
      setFormData({ ...formData, disabledRegions: [...formData.disabledRegions, gov] });
    }
  };

  // تعديل رفع اللوجو: للمعاينة فقط بدون حفظ تلقائي
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        
        // الترتيب الصحيح: لازم onload تتكتب قبل ما نمرر الـ src
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200; 
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const newLogo = canvas.toDataURL('image/png');
          // هنا بنعدل الفورم داتا بس للمعاينة (مش بنعمل setShopSettings)
          setFormData({...formData, storeLogo: newLogo});
        };
        
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.placeholder === 'Add email...') {
        e.preventDefault();
        addAdmin();
        return;
      }
      if (e.target.placeholder === 'Find province...') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleSave();
    }
  };

  const scrollbarClass = "overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-600/50 transition-colors";
  const hideSpinners = "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]";

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-8 p-4 max-w-4xl mx-auto relative w-full pb-20 font-sans outline-none" 
      onKeyDown={handleKeyDown} 
    >
      
      <AnimatePresence>
        {isSaved && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: -20 }} 
              className="relative bg-[#111] border border-blue-500/30 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(37,99,235,0.2)] flex flex-col items-center text-center max-w-sm w-full"
            >
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <CheckCircle size={48} className="text-blue-500" />
              </div>
              <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter mb-3">Saved!</h2>
              <p className="text-blue-400 font-bold uppercase text-xs tracking-widest leading-relaxed">System Configuration Has Been Updated Successfully.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="text-center flex flex-col items-center pt-2">
        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mb-4 border border-blue-600/20">
          <Settings2 size={32} className="text-blue-500" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">System Settings</h1>
        <p className="text-gray-500 font-bold mt-2 uppercase text-[10px] tracking-[0.3em]">Store Management & Logistics</p>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 text-white font-black text-lg italic uppercase tracking-tighter border-b border-white/5 pb-4">
              <Store className="text-blue-500" size={22} /> Store Profile
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col justify-start">
              
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-black mb-3 flex items-center gap-1.5 tracking-widest px-1"><ImageIcon size={12}/> Store Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-black border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {formData.storeLogo ? <img src={formData.storeLogo} alt="Logo" className="w-full h-full object-contain p-1"/> : <Shirt size={20} className="text-gray-700"/>}
                  </div>
                  <label className="bg-black hover:bg-white/5 border border-white/10 text-white text-[10px] uppercase tracking-widest font-black px-4 py-3 rounded-xl cursor-pointer transition-colors">
                    Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange}/>
                  </label>
                  {formData.storeLogo && (
                    <button type="button" onClick={() => {
                      setFormData({...formData, storeLogo: ''});
                      // شيلنا الحفظ التلقائي من هنا برضه عشان يمسح كمعاينة بس
                    }} className="text-gray-600 hover:text-red-500 hover:bg-red-500/10 p-3 rounded-xl transition-colors"><Trash2 size={16}/></button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest px-1"><Mail size={12}/> Store Name</label>
                <input required type="text" value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3.5 text-white outline-none focus:border-blue-600 transition-all font-bold text-sm" />
              </div>

              <div className="relative mt-auto">
                <label className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest px-1"><MapPin size={12}/> Store Location</label>
                <button type="button" onClick={() => setIsLocOpen(!isLocOpen)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3.5 text-white flex justify-between items-center font-bold text-sm hover:border-blue-600/50 transition-all">
                  {formData.storeLocation}
                  <ChevronDown size={18} className={`text-gray-500 transition-transform ${isLocOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isLocOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute z-50 top-full left-0 right-0 mt-2 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] max-h-56 ${scrollbarClass}`}>
                      {egyptGovernorates.map(gov => (
                        <button key={gov} type="button" onClick={() => { setFormData({...formData, storeLocation: gov}); setIsLocOpen(false); }} className="w-full px-6 py-3.5 text-left text-sm font-bold text-gray-400 hover:bg-blue-600 hover:text-white transition-all border-b border-white/5 last:border-0">
                          {gov}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 text-white font-black text-lg italic uppercase tracking-tighter border-b border-white/5 pb-4">
              <CreditCard className="text-blue-500" size={22} /> Payments & Access
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col justify-start">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest px-1">Currency</label>
                  <button type="button" onClick={() => setIsCurrOpen(!isCurrOpen)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white flex justify-between items-center font-bold text-xs uppercase tracking-widest hover:border-blue-600/50 transition-all">
                    {formData.currency}
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>
                  <AnimatePresence>
                    {isCurrOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        {["USD", "E.G", "EUR"].map(curr => (
                          <button key={curr} type="button" onClick={() => { setFormData({...formData, currency: curr}); setIsCurrOpen(false); }} className="w-full px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-blue-600 hover:text-white transition-all">
                            {curr}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest px-1">Tax (%)</label>
                  <input required type="number" value={formData.tax} onChange={(e) => setFormData({...formData, tax: Number(e.target.value)})} className={`w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold text-sm outline-none focus:border-blue-600 transition-all ${hideSpinners}`} />
                </div>
              </div>

              <div className="mt-auto">
                <label className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest px-1"><Users size={12}/> Admins</label>
                <div className="flex gap-2 mb-3">
                  <input type="email" placeholder="Add email..." value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white outline-none focus:border-blue-600" />
                  <button type="button" onClick={addAdmin} className="bg-blue-600 p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"><Plus size={16}/></button>
                </div>
                <div className={`max-h-[88px] ${scrollbarClass} space-y-2`}>
                  {formData.admins.map(adm => (
                    <div key={adm} className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl flex justify-between items-center group hover:border-white/10 transition-colors">
                      <span className="text-[9px] font-bold text-gray-400">{adm}</span>
                      {adm !== shopSettings.email && (
                        <button type="button" onClick={() => setFormData({...formData, admins: formData.admins.filter(a => a !== adm)})} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden transition-all duration-500">
          
          <button 
            type="button" 
            onClick={() => setIsShippingOpen(!isShippingOpen)}
            className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer group outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-600/20 group-hover:bg-blue-600/20 transition-colors">
                <Truck className="text-blue-500" size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">Shipping Rates</h3>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-1">Click to configure rates & regions</p>
              </div>
            </div>
            
            <div className="p-3 bg-white/5 rounded-full text-gray-400 group-hover:text-white transition-colors">
              <ChevronDown size={20} className={`transition-transform duration-300 ${isShippingOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {isShippingOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-8 border-t border-white/5 mt-8">
                  <div className="relative w-full md:w-64 mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                    <input type="text" placeholder="Find province..." value={shippingSearch} onChange={(e) => setShippingSearch(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-[10px] text-white outline-none focus:border-blue-600 font-bold" />
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] ${scrollbarClass}`}>
                    {egyptGovernorates.filter(g => g.includes(shippingSearch)).map(gov => {
                      const isEnabled = !formData.disabledRegions.includes(gov);
                      return (
                        <div key={gov} className={`bg-black/40 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between transition-all group ${!isEnabled ? 'opacity-50 grayscale' : 'hover:border-blue-600/30'}`}>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => toggleRegion(gov)} className={`p-1.5 rounded-lg transition-colors ${isEnabled ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                              {isEnabled ? <Check size={14}/> : <Ban size={14}/>}
                            </button>
                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tighter group-hover:text-white transition-colors">{gov}</span>
                          </div>
                          <div className="flex items-center gap-2 w-28 relative">
                            <span className="absolute left-3 text-[10px] font-black text-blue-500/50">{formData.currency}</span>
                            <input 
                              type="number" 
                              disabled={!isEnabled}
                              value={formData.shippingRates[gov] || ''} 
                              onChange={(e) => setFormData({...formData, shippingRates: {...formData.shippingRates, [gov]: Number(e.target.value)}})}
                              placeholder="0"
                              className={`w-full bg-black border border-white/10 rounded-xl py-2 pl-10 pr-3 text-right text-blue-500 font-black text-sm outline-none focus:border-blue-600 transition-all disabled:cursor-not-allowed ${hideSpinners}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center pt-2">
          <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-16 py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-700 active:scale-95 transition-all shadow-[0_0_40px_rgba(37,99,235,0.25)] flex items-center justify-center gap-3 text-sm">
            <CheckCircle size={20} />
            Save Changes
          </button>
        </div>

      </form>
    </motion.div>
  );
};

export default Settings;