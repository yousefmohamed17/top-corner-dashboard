import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Search, PlusCircle, Trash2, Plus, Minus, X, Upload, Link as LinkIcon, Pencil, Loader, Download, Tag, DollarSign, TextCursorInput, ChevronDown, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx'; 

import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const Inventory = ({ currency, tax }) => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [adminFilterCat, setAdminFilterCat] = useState('All'); 
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [newItem, setNewItem] = useState({ 
    name: '', cat: '', price: '', sizesInput: '', image: '', isBestSeller: false 
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setInventory(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getTotalStock = (sizes) => sizes ? sizes.reduce((sum, s) => sum + s.qty, 0) : 0;

  const exportToExcel = () => {
    const exportData = inventory.map(item => ({
      "Product Name": item.name || '',
      "Category": item.cat || '',
      "Base Price": item.price || 0,
      "Price (Inc. Tax)": (item.price * (1 + tax / 100)).toFixed(2),
      "Total Units in Stock": getTotalStock(item.sizes),
      "Sizes & Quantities": (item.sizes || []).map(s => `${s.size === 'OS' ? 'Units' : s.size} (${s.qty})`).join(' | ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TopCorner_Stock");
    XLSX.writeFile(workbook, "TopCorner_Inventory_Report.xlsx");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewItem({ ...newItem, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const updateSizeQty = async (productId, sizeLabel, delta) => {
    const item = inventory.find(i => i.id === productId);
    if (!item || !item.sizes) return;

    const newSizes = item.sizes.map(s => {
      if (s.size === sizeLabel) {
        const newQty = s.qty + delta;
        return { ...s, qty: newQty >= 0 ? newQty : 0 };
      }
      return s;
    });

    try {
      await updateDoc(doc(db, 'inventory', productId), { sizes: newSizes });
    } catch (error) {
      console.error("Error updating quantity: ", error);
    }
  };

  const handleEditClick = (item) => {
    let formattedSizes = '';
    if (item.sizes && item.sizes.length === 1 && item.sizes[0].size === 'OS') {
      formattedSizes = item.sizes[0].qty.toString();
    } else if (item.sizes) {
      formattedSizes = item.sizes.map(s => `${s.size}:${s.qty}`).join(', ');
    }

    setNewItem({
      name: item.name || '',
      cat: item.cat || '',
      price: item.price || '',
      image: item.image || '',
      sizesInput: formattedSizes,
      isBestSeller: item.isBestSeller || false
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const deleteItem = async (id) => {
    if(window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
        let sizesArray = [];
        const trimmedInput = (newItem.sizesInput || '').trim();

        if (!trimmedInput) throw new Error("Empty stock");

        if (!isNaN(trimmedInput) && !trimmedInput.includes(':')) {
          sizesArray = [{ size: 'OS', qty: parseInt(trimmedInput) }];
        } else {
          sizesArray = trimmedInput.split(',').map(pair => {
              const parts = pair.trim().split(':');
              if (parts.length === 2) {
                return { size: parts[0].trim(), qty: parseInt(parts[1].trim()) || 0 };
              }
              return null;
          }).filter(item => item !== null);
        }

        if(sizesArray.length === 0) throw new Error("Invalid sizes format!");

        const productData = { 
            name: newItem.name, 
            cat: newItem.cat.trim(), 
            price: parseFloat(newItem.price) || 0, 
            image: newItem.image || 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=150&q=80', 
            sizes: sizesArray,
            isBestSeller: newItem.isBestSeller 
        };

        if (editingId) {
          await updateDoc(doc(db, 'inventory', editingId), productData);
        } else {
          await addDoc(collection(db, 'inventory'), productData);
        }
        
        setIsModalOpen(false);
        setEditingId(null);
        setNewItem({ name: '', cat: '', price: '', sizesInput: '', image: '', isBestSeller: false });
    } catch (err) {
        alert('حدث خطأ. للمقاسات استخدم: M:10, L:5. وللكمية فقط اكتب: 50.');
        console.error("Error adding/updating document: ", err);
    }
  };

  const adminCategories = ['All', ...new Set(inventory.map(item => (item.cat || '')))];

  const filteredInventory = inventory.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) && 
    (adminFilterCat === 'All' || item.cat === adminFilterCat)
  );

  return (
    <div className="space-y-6 lg:space-y-8 p-1 lg:p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">Inventory</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Global Currency: {currency} | Tax: {tax}%</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto relative">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-6 w-full lg:w-64 outline-none focus:border-blue-600 transition-all text-white font-bold" />
          </div>

          <div className="relative w-full sm:w-48">
            <button 
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none hover:border-blue-600 transition-all font-bold text-xs uppercase tracking-widest flex justify-between items-center h-full"
            >
              <span className="truncate">{adminFilterCat}</span>
              <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isCategoryDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                >
                  {adminCategories.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setAdminFilterCat(c);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`px-5 py-3 text-left font-bold text-xs uppercase tracking-widest transition-colors ${
                        adminFilterCat === c 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button onClick={exportToExcel} className="w-full sm:w-auto bg-green-600 text-white px-6 py-4 rounded-2xl font-black uppercase hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.3)]">
            <Download size={24} /> Export
          </button>

          <button onClick={() => { setIsModalOpen(true); setEditingId(null); setNewItem({ name: '', cat: '', price: '', sizesInput: '', image: '', isBestSeller: false }); }} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <PlusCircle size={24} /> Add
          </button>
        </div>
      </header>

      {/* الجدول اللي بيقلب كروت بتتنفس على الموبايل */}
      <div className="bg-transparent lg:bg-[#111] rounded-none lg:rounded-[2.5rem] border-0 lg:border border-white/5 lg:shadow-2xl w-full relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-blue-500 py-20">
            <Loader className="animate-spin mb-4" size={40} />
            <p className="font-bold tracking-widest uppercase text-xs">Loading Cloud Data...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-20">
            <AlertTriangle size={40} className="mb-4 text-amber-500 opacity-50" />
            <p className="font-bold tracking-widest uppercase text-xs">No products match your filter.</p>
          </div>
        ) : (
          <div className="block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="hidden lg:table-header-group sticky top-0 z-20 bg-[#111] shadow-md border-b border-white/5">
                <tr className="text-gray-500 uppercase text-xs font-black tracking-[0.2em]">
                  <th className="px-8 py-6">Product Information</th>
                  <th className="px-8 py-6 w-[400px]">Stock Config</th>
                  <th className="px-8 py-6 text-center">Total Status</th>
                  <th className="px-8 py-6 text-center">Price</th>
                  <th className="px-8 py-6 text-center">Actions</th>
                </tr>
              </thead>
              
              <tbody className="flex flex-col lg:table-row-group gap-5 lg:gap-0 font-medium pb-5 lg:pb-0">
                <AnimatePresence>
                  {filteredInventory.map((item) => {
                    const total = getTotalStock(item.sizes);
                    const priceWithTax = (item.price * (1 + tax / 100)).toFixed(2);

                    return (
                      <motion.tr 
                        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={item.id} 
                        className="flex flex-col lg:table-row bg-[#111] lg:bg-transparent rounded-[2rem] lg:rounded-none border border-white/5 lg:border-0 hover:bg-blue-600/[0.03] transition-colors group p-6 lg:p-0 shadow-lg lg:shadow-none"
                      >
                        {/* 1. Product Info */}
                        <td className="p-0 lg:p-6 mb-6 lg:mb-0 lg:border-b lg:border-white/5 flex items-start gap-5">
                          <img src={item.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/5 group-hover:border-blue-600 transition-all shadow-lg shrink-0 mt-1" alt={item.name} />
                          <div className="flex-1">
                            <div className="text-white text-lg lg:text-xl font-bold uppercase transition-colors group-hover:text-blue-500 leading-tight flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="line-clamp-1">{item.name}</span>
                              {item.isBestSeller && <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[9px] px-2 py-0.5 rounded flex items-center gap-1 shrink-0"><Flame size={10}/> Best</span>}
                            </div>
                            <div className="text-[10px] text-gray-600 uppercase font-black tracking-widest bg-black border border-white/5 px-2.5 py-1 rounded-lg inline-block">{item.cat}</div>
                          </div>
                        </td>
                        
                        {/* 2. Stock Config */}
                        <td className="p-0 lg:p-6 mb-6 lg:mb-0 lg:border-b lg:border-white/5">
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-3 lg:hidden tracking-widest">Stock Config:</div>
                          <div className="flex flex-wrap gap-3">
                            {(item.sizes || []).map((s, idx) => (
                              <div key={idx} className="flex items-center justify-between lg:justify-start gap-3 bg-black border border-white/5 p-2 px-4 rounded-xl shadow-sm group/size hover:border-white/20 transition-all flex-1 sm:flex-none min-w-[130px] lg:min-w-0">
                                <span className="text-blue-500 font-black text-xs uppercase tracking-wider">
                                  {s.size === 'OS' ? 'UNIT' : s.size}
                                </span>
                                <div className="w-px h-4 bg-white/10 mx-1"></div>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => updateSizeQty(item.id, s.size, -1)} className="text-gray-600 hover:text-red-500 transition-colors p-1 bg-white/5 hover:bg-red-500/10 rounded-md"><Minus size={14}/></button>
                                   <span className="text-white text-sm font-black min-w-[20px] text-center">{s.qty}</span>
                                   <button onClick={() => updateSizeQty(item.id, s.size, 1)} className="text-gray-600 hover:text-green-500 transition-colors p-1 bg-white/5 hover:bg-green-500/10 rounded-md"><Plus size={14}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 3. Total Status */}
                        <td className="p-0 lg:p-6 mb-4 lg:mb-0 lg:border-b lg:border-white/5 flex justify-between items-center lg:table-cell lg:text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-black lg:hidden tracking-widest">Status:</div>
                          <div className={`px-4 py-2 lg:px-4 lg:py-2 rounded-xl text-[11px] font-black inline-flex items-center gap-2 ${total < 15 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            {total < 15 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                            {total} {item.sizes && item.sizes.length === 1 && item.sizes[0].size === 'OS' ? 'ITEMS' : 'UNITS'}
                          </div>
                        </td>

                        {/* 4. Price */}
                        <td className="p-0 lg:p-6 mb-6 lg:mb-0 lg:border-b lg:border-white/5 flex justify-between items-center lg:table-cell lg:text-center">
                          <div className="text-[10px] text-gray-500 uppercase font-black lg:hidden tracking-widest">Price:</div>
                          <div className="text-right lg:text-center">
                            <div className="text-white font-black text-xl">{currency} {item.price}</div>
                            <div className="text-blue-500 text-[10px] lg:text-xs font-black italic tracking-wider mt-0.5">{currency} {priceWithTax} w/ tax</div>
                          </div>
                        </td>

                        {/* 5. Actions */}
                        <td className="p-0 lg:p-6 pt-5 lg:pt-6 border-t border-white/5 lg:border-t-0 lg:border-b lg:border-white/5">
                          <div className="flex justify-end lg:justify-center gap-3">
                            <button onClick={() => handleEditClick(item)} className="text-gray-500 hover:text-blue-500 p-3 lg:p-3 transition-all hover:bg-blue-500/10 rounded-xl flex-1 lg:flex-none flex justify-center bg-black lg:bg-transparent border border-white/5 lg:border-0"><Pencil size={18} className="lg:w-5 lg:h-5" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-gray-700 hover:text-red-600 p-3 lg:p-3 transition-all hover:bg-red-600/10 rounded-xl flex-1 lg:flex-none flex justify-center bg-black lg:bg-transparent border border-white/5 lg:border-0"><Trash2 size={18} className="lg:w-5 lg:h-5" /></button>
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

      {/* مودال الإضافة والتعديل */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className={`bg-[#111] border border-white/10 p-6 lg:p-10 rounded-3xl lg:rounded-[3rem] w-full max-w-lg relative z-10 shadow-3xl max-h-[90vh] overflow-y-auto`}>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="absolute top-6 right-6 lg:top-8 lg:right-8 text-gray-500 hover:text-white transition-colors bg-black p-2 rounded-full lg:bg-transparent lg:p-0">
                <X size={24} className="lg:w-8 lg:h-8" />
              </button>
              
              <h2 className="text-2xl lg:text-3xl font-black italic uppercase text-white mb-6 lg:mb-8 flex items-center gap-3">
                <PlusCircle className="text-blue-600" size={30} /> {editingId ? 'Edit Product' : 'New Product'}
              </h2>

              <form onSubmit={handleAddItem} className="space-y-5 lg:space-y-6">
                <div>
                  <label className="text-[9px] lg:text-[10px] text-gray-500 uppercase font-black mb-1.5 lg:mb-2 block tracking-widest flex items-center gap-1.5"><Tag size={12}/> Product Name</label>
                  <input required type="text" placeholder="e.g. Manchester City 24/25" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl lg:rounded-2xl px-4 py-3 lg:px-5 lg:py-4 text-white outline-none focus:border-blue-600 transition-all font-bold text-sm lg:text-base" />
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5 cursor-pointer" onClick={() => setNewItem({...newItem, isBestSeller: !newItem.isBestSeller})}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${newItem.isBestSeller ? 'bg-orange-500 border-orange-500' : 'border-gray-600'}`}>
                    {newItem.isBestSeller && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <label className="text-[10px] text-white uppercase font-black tracking-widest flex items-center gap-2 cursor-pointer pointer-events-none">
                    <Flame size={14} className={newItem.isBestSeller ? "text-orange-500" : "text-gray-500"}/> Mark as Best Seller
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="text-[9px] lg:text-[10px] text-gray-500 uppercase font-black mb-1.5 lg:mb-2 block tracking-widest flex items-center gap-1.5"><TextCursorInput size={12}/> Category</label>
                    <input 
                      required 
                      type="text" 
                      list="cat-list"
                      placeholder="Boots, Retro, Kits..." 
                      value={newItem.cat} 
                      onChange={e => setNewItem({...newItem, cat: e.target.value})} 
                      className="w-full bg-black border border-white/10 rounded-xl lg:rounded-2xl px-4 py-3 lg:px-5 lg:py-4 text-blue-500 outline-none focus:border-blue-600 font-bold text-sm lg:text-base uppercase tracking-widest" 
                    />
                    <datalist id="cat-list">
                      {adminCategories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[9px] lg:text-[10px] text-gray-500 uppercase font-black mb-1.5 lg:mb-2 block tracking-widest flex items-center gap-1.5"><DollarSign size={12}/> Base Price ({currency})</label>
                    <input required type="number" placeholder="95" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl lg:rounded-2xl px-4 py-3 lg:px-5 lg:py-4 text-white outline-none focus:border-blue-600 font-bold text-sm lg:text-base" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <label className="text-[9px] lg:text-[10px] text-blue-500 uppercase font-black mb-3 block tracking-widest">Product Image (Link OR Upload)</label>
                  <div className="relative mb-3">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Paste Image URL here..." value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-blue-600 transition-all text-xs" />
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-xs font-bold uppercase mb-3">
                    <div className="flex-1 h-px bg-white/10"></div><span>OR</span><div className="flex-1 h-px bg-white/10"></div>
                  </div>
                  <div className="relative border-2 border-dashed border-white/10 rounded-xl p-3 flex items-center justify-center hover:border-blue-500 transition-colors bg-black group cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-500 transition-colors">
                      <Upload size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {newItem.image && newItem.image.startsWith('data:image') ? 'File Selected!' : 'Upload from Device'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] lg:text-[10px] text-gray-500 uppercase font-black mb-1.5 lg:mb-2 block tracking-widest">Stock (مثال: M:10, L:20 أو كمية فقط: 50)</label>
                  <input required type="text" placeholder="مثال: M:10, L:20 أو 50" value={newItem.sizesInput} onChange={e => setNewItem({...newItem, sizesInput: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl lg:rounded-2xl px-4 py-3 lg:px-5 lg:py-4 text-blue-500 outline-none focus:border-blue-600 font-mono font-bold text-sm lg:text-base" />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-black rounded-xl lg:rounded-2xl py-4 lg:py-5 mt-2 hover:bg-blue-700 transition-all uppercase tracking-widest shadow-xl active:scale-95 text-sm lg:text-base">
                  {editingId ? 'Save Changes to Cloud' : 'Add to Cloud'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;