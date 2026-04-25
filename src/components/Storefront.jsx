import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, CheckCircle, Loader, Package, Truck, Clock, ShoppingCart, Trash2, Plus, Minus, MapPin, CalendarClock, Map, Flame, ChevronDown, X, Search, AlertTriangle, CheckSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';

const egyptGovernorates = [
  "القاهرة", "الإسكندرية", "الجيزة", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "الشرقية", "السويس", "أسوان", "أسيوط", "بني سويف", "دمياط", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "جنوب سيناء", "بورسعيد", "سوهاج"
];

const Storefront = ({ shopSettings, userEmail }) => {
  const { 
    currency = 'E.G', tax = 14, shippingRates = {}, disabledRegions = [], storeLocation = 'القاهرة' 
  } = shopSettings || {};

  const [products, setProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', data: null });

  const [activeView, setActiveView] = useState('shop'); 
  const [selectedSizes, setSelectedSizes] = useState({}); 
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [govSearch, setGovSearch] = useState(''); 

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem(`cart_${userEmail}`);
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [userName, setUserName] = useState('Customer'); // حالة جديدة لتخزين اسم العميل لبيموب
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState(''); 
  const [phone, setPhone] = useState('');
  
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const displayedRegions = egyptGovernorates.filter(gov => gov.includes(govSearch));
  const isDeliveryDisabled = disabledRegions.includes(region) || !region;

  // ==========================================
  // قراءة حالة الدفع من بيموب بعد الرجوع للموقع
  // ==========================================
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');

    if (isSuccess === 'true') {
      setSuccessMsg('Payment Successful! Your order is placed. 🎉');
      setActiveView('tracking'); 
      setTimeout(() => setSuccessMsg(''), 5000);
      window.history.replaceState(null, '', window.location.pathname);
    } 
    else if (isSuccess === 'false') {
      setErrorMsg('Payment Failed! Please try again. ❌');
      setTimeout(() => setErrorMsg(''), 5000);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem(`cart_${userEmail}`, JSON.stringify(cart));
  }, [cart, userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    const q = query(collection(db, 'users'), where('email', '==', userEmail));
    const unsubUser = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        if (userData.name) setUserName(userData.name); // سحب الاسم
        if (userData.address) setAddress(userData.address);
        if (userData.phone) setPhone(userData.phone);
        
        if (userData.region) {
          setRegion(userData.region);
        } else {
          setRegion(storeLocation || egyptGovernorates[0]);
        }
      }
    });

    return () => unsubUser();
  }, [userEmail, storeLocation]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setIsLoading(false);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersList = [];
      snapshot.forEach((doc) => {
        const orderData = doc.data();
        if (orderData.customer === userEmail) {
          ordersList.push({ id: doc.id, ...orderData });
        }
      });
      setMyOrders(ordersList.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => { unsubProducts(); unsubOrders(); };
  }, [userEmail]);

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const handleSizeSelect = (productId, sizeObj) => {
    if (sizeObj.qty > 0) setSelectedSizes({ ...selectedSizes, [productId]: sizeObj });
  };

  const handleAddToCart = (product) => {
    const sizeObj = selectedSizes[product.id];
    if (!sizeObj) return triggerError('Please select a variant first!');

    const existingCartItem = cart.find(item => item.id === product.id && item.size === sizeObj.size);

    if (existingCartItem) {
      if (existingCartItem.qty >= sizeObj.qty) return triggerError('Maximum stock reached!');
      setCart(cart.map(item => item === existingCartItem ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, {
        id: product.id, name: product.name, cat: product.cat, image: product.image,
        price: product.price, size: sizeObj.size, qty: 1, maxStock: sizeObj.qty
      }]);
    }
    setSuccessMsg(`Added ${product.name} to cart!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const updateCartQty = (index, delta) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = item.qty + delta;
    if (newQty > 0 && newQty <= item.maxStock) {
      item.qty = newQty; setCart(newCart);
    } else if (newQty === 0) {
      setCart(cart.filter((_, i) => i !== index));
    }
  };

  const handleActionConfirm = async () => {
    if (confirmModal.type === 'clearCart') {
      setCart([]);
    } else if (confirmModal.type === 'markReceived') {
      try {
        await updateDoc(doc(db, 'orders', confirmModal.data), { status: 'Delivered' });
        setSuccessMsg('Order marked as Delivered!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        triggerError('Failed to update order status.');
      }
    }
    setConfirmModal({ isOpen: false, type: '', data: null });
  };

  const cartBaseTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const taxAmount = cartBaseTotal * (tax / 100);
  const shippingCost = isDeliveryDisabled ? 0 : (Number(shippingRates[region]) || 0); 
  const cartFinalTotal = (cartBaseTotal + taxAmount + shippingCost).toFixed(2);

  // ==========================================
  // التعديل: ربط الدفع ببيموب وإنشاء الطلب
  // ==========================================
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!address.trim()) return triggerError("Please enter your detailed address!");
    if (isDeliveryDisabled) return triggerError("عذراً، الشحن غير متوفر لهذه المحافظة حالياً.");
    
    setIsCheckingOut(true);
    try {
      // 1. الاتصال بـ Vercel Backend للحصول على الـ Payment Token من بيموب
      const paymobResponse = await fetch('/api/paymob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartFinalTotal,
          billingData: {
            first_name: userName.split(' ')[0] || "Customer",
            last_name: userName.split(' ').slice(1).join(' ') || "Name",
            email: userEmail,
            phone_number: phone || "+201000000000",
            apartment: "NA", 
            floor: "NA", 
            street: address, 
            building: "NA",
            city: region,
            country: "EG"
          }
        })
      });

      const paymobData = await paymobResponse.json();

      if (!paymobData.paymentToken) {
        throw new Error("فشل في الاتصال ببوابة الدفع بيموب.");
      }

      // 2. تسجيل الأوردر في الداتابيز
      const itemsString = cart.map(item => `${item.name} (${item.size === 'OS' ? 'UNIT' : item.size} x${item.qty})`).join(' | ');
      const newOrder = {
        orderId: `#TC-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: userEmail,
        items: itemsString,
        baseTotal: cartBaseTotal,
        shippingFee: shippingCost,
        finalTotal: cartFinalTotal,
        status: 'Processing', // نقدر نخليها Pending لو حابين، بس Processing مناسبة للمتجر
        address, region, deliveryDate,
        phone: phone || 'Not Provided',
        date: new Date().toLocaleString(),
        timestamp: Date.now()
      };
      await addDoc(collection(db, 'orders'), newOrder);

      // 3. خصم المخزون
      const updatesByProduct = {};
      cart.forEach(cartItem => {
        if (!updatesByProduct[cartItem.id]) updatesByProduct[cartItem.id] = [];
        updatesByProduct[cartItem.id].push({ size: cartItem.size, deduct: cartItem.qty });
      });

      for (const productId of Object.keys(updatesByProduct)) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const newSizes = product.sizes.map(s => {
            const deduction = updatesByProduct[productId].find(u => u.size === s.size);
            return deduction ? { ...s, qty: s.qty - deduction.deduct } : s;
          });
          await updateDoc(doc(db, 'inventory', productId), { sizes: newSizes });
        }
      }

      // 4. مسح السلة وتوجيه العميل لصفحة دفع بيموب (Iframe)
      setCart([]);
      
      const iframeId = import.meta.env.VITE_PAYMOB_IFRAME_ID;
      window.location.href = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymobData.paymentToken}`;
      
    } catch (err) { 
      console.error(err);
      triggerError('Checkout failed or Payment Gateway error. Try again.'); 
      setIsCheckingOut(false); // بنرجع الزرار يشتغل لو حصل إيرور
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.cat))];
  const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => p.cat === selectedCategory);

  return (
    <div className="space-y-6 lg:space-y-8 p-1 lg:p-2 max-w-7xl mx-auto font-sans pb-20 selection:bg-blue-600">
      
      <header className="flex flex-col md:flex-row justify-between items-center bg-[#111] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl gap-6 relative">
        <div className="text-center md:text-left">
          <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-white">{shopSettings.storeName || 'Top Corner'}</h1>
          <p className="text-gray-500 font-bold mt-1 tracking-widest uppercase text-[10px]">Premium Gear</p>
        </div>

        <div className="flex flex-wrap justify-center bg-black p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
          <button onClick={() => setActiveView('shop')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-black uppercase text-[10px] lg:text-xs transition-all flex items-center justify-center gap-2 ${activeView === 'shop' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
            <ShoppingBag size={16} /> Shop
          </button>
          <button onClick={() => setActiveView('cart')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-black uppercase text-[10px] lg:text-xs transition-all flex items-center justify-center gap-2 relative ${activeView === 'cart' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
            <ShoppingCart size={16} /> Cart
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-black">{cart.length}</span>}
          </button>
          <button onClick={() => setActiveView('tracking')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-black uppercase text-[10px] lg:text-xs transition-all flex items-center justify-center gap-2 ${activeView === 'tracking' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
            <Package size={16} /> Orders
          </button>
        </div>
      </header>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-xs lg:text-sm whitespace-nowrap">
            <CheckCircle size={18} /> {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-xs lg:text-sm whitespace-nowrap">
            <AlertTriangle size={18} /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal({ isOpen: false, type: '', data: null })} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl text-center">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-600/20">
                <AlertTriangle size={28} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-black italic uppercase text-white mb-2">Are you sure?</h2>
              <p className="text-gray-400 text-xs font-bold mb-8">
                {confirmModal.type === 'clearCart' ? "Do you want to remove all items from your cart?" : "Are you sure you have received this order?"}
              </p>
              <div className="flex gap-4">
                <button onClick={() => setConfirmModal({ isOpen: false, type: '', data: null })} className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs bg-white/5 hover:bg-white/10 text-white transition-all">Cancel</button>
                <button onClick={handleActionConfirm} className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeView === 'shop' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 snap-x overflow-y-hidden">
            {categories.map((cat, index) => (
              <button key={index} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all border snap-start ${selectedCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-[#111] border-white/5 text-gray-500 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProducts.map(product => {
              const priceWithTax = (product.price * (1 + tax / 100)).toFixed(2);
              const selectedSize = selectedSizes[product.id];
              const totalStock = product.sizes ? product.sizes.reduce((sum, s) => sum + s.qty, 0) : 0;
              const showBestSeller = product.isBestSeller || (totalStock > 0 && totalStock < 15);

              return (
                <div key={product.id} className="bg-[#111] p-5 rounded-[2rem] border border-white/5 flex flex-col group hover:border-blue-600/30 transition-all duration-300 shadow-xl relative overflow-hidden">
                  {showBestSeller && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 px-2 py-1.5 rounded-lg border border-orange-400/50 text-[9px] text-white font-black uppercase tracking-widest flex items-center gap-1.5 shadow-2xl z-20">
                      <Flame size={12} className="text-orange-200" /> Best Seller
                    </div>
                  )}
                  <div className="relative aspect-square bg-black rounded-[1.5rem] p-4 mb-4 overflow-hidden border border-white/5 flex items-center justify-center">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[9px] text-white font-black uppercase tracking-widest z-10">
                      {product.cat}
                    </div>
                  </div>
                  <h3 className="text-xl font-black uppercase italic text-white mb-1 group-hover:text-blue-500 transition-colors line-clamp-1">{product.name}</h3>
                  <div className="text-2xl font-black text-white mb-5">{currency} {priceWithTax}</div>
                  <div className="mt-auto space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {product.sizes && product.sizes.map((s, idx) => (
                        <button key={idx} onClick={() => handleSizeSelect(product.id, s)} disabled={s.qty === 0} className={`h-10 px-3 rounded-xl text-[10px] font-black uppercase transition-all border flex-1 sm:flex-none ${s.qty === 0 ? 'opacity-20 cursor-not-allowed' : selectedSize?.size === s.size ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-white/10 text-gray-400'}`}>
                          {s.size === 'OS' ? 'UNIT' : s.size}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handleAddToCart(product)} disabled={!selectedSize} className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!selectedSize ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-blue-600 hover:text-white shadow-xl active:scale-95'}`}>
                      <ShoppingCart size={16} /> {selectedSize ? 'Add to Cart' : 'Select Variant'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeView === 'cart' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 bg-[#111] rounded-[2.5rem] border border-white/5 p-5 lg:p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h2 className="text-xl font-black uppercase italic text-white">Your Cart</h2>
              {cart.length > 0 && (
                <button onClick={() => setConfirmModal({ isOpen: true, type: 'clearCart' })} className="text-red-500 hover:text-red-400 text-[9px] font-black uppercase flex items-center gap-1.5 bg-red-500/10 px-3 py-2 rounded-xl transition-all">
                  <Trash2 size={12}/> Clear
                </button>
              )}
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-600 font-black uppercase tracking-[0.2em] flex flex-col items-center gap-3">
                <ShoppingCart size={32} className="opacity-20"/> Empty
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-black p-3 rounded-2xl border border-white/5 relative group">
                    <img src={item.image} className="w-16 h-16 object-cover rounded-xl" />
                    <div className="flex-1 pr-6">
                      <h4 className="text-white font-black italic uppercase text-xs mb-1 line-clamp-1">{item.name}</h4>
                      <p className="text-[9px] text-blue-500 font-black mb-2">SIZE: {item.size === 'OS' ? 'UNIT' : item.size}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-[#111] px-2 py-1 rounded-lg border border-white/5">
                          <button onClick={() => updateCartQty(index, -1)} className="text-gray-500 hover:text-white p-1"><Minus size={12}/></button>
                          <span className="text-white font-black text-[11px] w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateCartQty(index, 1)} className="text-gray-500 hover:text-white p-1"><Plus size={12}/></button>
                        </div>
                        <span className="text-white font-black text-xs">{currency} {(item.price * item.qty * (1 + tax / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="absolute top-3 right-3 text-gray-600 hover:text-red-500 transition-colors bg-[#111] p-1.5 rounded-lg"><X size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="w-full lg:w-[350px] space-y-6">
              <div className="bg-[#111] p-6 lg:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <h3 className="text-sm font-black uppercase italic text-white mb-5 flex items-center gap-2"><Truck className="text-blue-500" size={16}/> Delivery</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-gray-500 font-black uppercase mb-1.5 block tracking-widest">Full Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-600 transition-all font-bold h-16 resize-none" placeholder="Building, Street..." />
                  </div>
                  
                  <div className="relative">
                    <label className="text-[9px] text-gray-500 font-black uppercase mb-1.5 block tracking-widest">Governorate</label>
                    <button onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs flex justify-between items-center font-bold">
                      {region || 'Select City'} <ChevronDown size={14} className={`transition-transform duration-300 ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isDeliveryDisabled && region && (
                        <motion.p initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, height:0}} className="text-red-500 text-[9px] font-bold mt-2 flex items-center gap-1.5">
                          <AlertTriangle size={12}/> الشحن غير متوفر لهذه المنطقة حالياً.
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {isRegionDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full mt-2 w-full bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                          <div className="p-2 border-b border-white/5 bg-[#111]">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                              <input type="text" placeholder="Search..." value={govSearch} onChange={(e) => setGovSearch(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg py-2 pl-8 pr-3 text-white text-[10px] outline-none focus:border-blue-600 font-bold" />
                            </div>
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar">
                            {displayedRegions.map(gov => {
                              const isGovDisabled = disabledRegions.includes(gov);
                              return (
                                <button 
                                  key={gov} 
                                  onClick={() => { setRegion(gov); setIsRegionDropdownOpen(false); setGovSearch(''); }} 
                                  className={`w-full p-3 text-left text-[10px] font-black border-b border-white/5 last:border-0 transition-colors uppercase flex justify-between items-center ${
                                    isGovDisabled ? 'text-red-500/50 hover:bg-red-500/10' : 'text-gray-400 hover:bg-blue-600 hover:text-white'
                                  }`}
                                >
                                  <span>{gov}</span>
                                  <span>{isGovDisabled ? 'غير متاح' : (shippingRates[gov] ? `+${currency}${shippingRates[gov]}` : 'Free')}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-500 font-black uppercase mb-1.5 block tracking-widest">Preferred Date</label>
                    <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-xs outline-none font-bold" />
                  </div>
                </div>
              </div>

              <div className="bg-[#111] p-6 lg:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="space-y-2.5 text-[10px] font-black uppercase text-gray-500 mb-5">
                  <div className="flex justify-between"><span>Items</span><span className="text-white">{currency} {cartBaseTotal.toFixed(2)}</span></div>
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className={isDeliveryDisabled ? "text-red-500" : "text-amber-500"}>
                      {isDeliveryDisabled ? 'N/A' : (shippingCost > 0 ? `+${currency} ${shippingCost}` : 'FREE')}
                    </span>
                  </div>

                  <div className="h-px bg-white/5 my-3"></div>
                  <div className="flex justify-between text-xl text-blue-500 italic tracking-tighter"><span>TOTAL</span><span>{currency} {isDeliveryDisabled ? '--' : cartFinalTotal}</span></div>
                </div>
                
                <button 
                  onClick={handleCheckout} 
                  disabled={isCheckingOut || isDeliveryDisabled} 
                  className={`w-full py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isDeliveryDisabled ? 'bg-red-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isCheckingOut ? <Loader className="animate-spin" size={16}/> : (isDeliveryDisabled ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>)} 
                  {isDeliveryDisabled ? 'Shipping Unavailable' : 'PAY WITH CARD 💳'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeView === 'tracking' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] rounded-[2.5rem] border border-white/5 p-4 sm:p-6 lg:p-10 shadow-2xl min-h-[400px]">
          <h2 className="text-xl sm:text-2xl font-black uppercase italic text-white mb-6 border-b border-white/5 pb-4">Order Tracking</h2>
          
          {myOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-600 font-black uppercase tracking-widest text-xs">No Orders Found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {myOrders.map(o => (
                <div key={o.id} className="bg-black border border-white/5 rounded-[2rem] p-5 sm:p-6 flex flex-col hover:border-blue-600/30 transition-all relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                    <div>
                      <div className="text-white font-black text-lg sm:text-xl leading-none mb-1">{o.orderId}</div>
                      <div className="text-gray-500 text-[9px] font-black uppercase tracking-widest">{o.date}</div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      o.status === 'Processing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
                      o.status === 'Shipped' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 
                      'bg-green-500/10 border-green-500/20 text-green-500'
                    }`}>
                      {o.status}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-5">
                    <div className="flex items-start gap-2 text-gray-400 text-[10px] sm:text-xs font-medium">
                      <Package size={14} className="text-blue-500 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        {o.items.split(' | ').map((item, i) => <div key={i}>{item}</div>)}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-gray-400 text-[10px] sm:text-xs font-medium">
                      <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{o.address} ({o.region})</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                      <CalendarClock size={14} className="shrink-0" />
                      Deliver By: {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-GB') : 'N/A'}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="text-blue-500 font-black text-xl sm:text-2xl tracking-tighter">{currency} {o.finalTotal}</div>
                    
                    {o.status !== 'Delivered' && (
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, type: 'markReceived', data: o.id })}
                        className="bg-white/5 hover:bg-green-500 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <CheckSquare size={14}/> Received?
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Storefront;