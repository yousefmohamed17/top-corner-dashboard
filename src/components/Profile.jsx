import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Save, CheckCircle, Loader, Camera, Phone, Mail, MapPin, ChevronDown, Search, KeyRound, Lock, AlertTriangle, X, ShieldCheck, Trash2, AtSign } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  sendPasswordResetEmail, 
  RecaptchaVerifier, 
  linkWithPhoneNumber, 
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const egyptGovernorates = [
  "القاهرة", "الإسكندرية", "الجيزة", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "الشرقية", "السويس", "أسوان", "أسيوط", "بني سويف", "دمياط", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "جنوب سيناء", "بورسعيد", "سوهاج"
];

const Profile = ({ isAdmin, shopSettings }) => {
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [username, setUsername] = useState(''); 
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [photoURL, setPhotoURL] = useState(''); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  
  // Custom Toasts States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [govSearch, setGovSearch] = useState(''); 

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isPassLoading, setIsPassLoading] = useState(false);

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneVerifyMsg, setPhoneVerifyMsg] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Helper Functions for Toasts
  const triggerSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const triggerError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 3000); };

  useEffect(() => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    
    const container = document.getElementById('recaptcha-container');
    if (container) container.innerHTML = '';

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
    });

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPhone(data.phone || '');
            setUsername(data.username || ''); 
            setAddress(data.address || '');
            setRegion(data.region || '');
            setPhotoURL(data.photo || auth.currentUser.photoURL || ''); 
            setIsPhoneVerified(data.isPhoneVerified || false);
          } else {
            setPhotoURL(auth.currentUser.photoURL || '');
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSendOTP = async () => {
    setPhoneVerifyMsg('');
    
    if (!phone || phone.length !== 11 || !phone.startsWith('01')) {
      setPhoneVerifyMsg("يرجى إدخال رقم موبايل مصري صحيح.");
      return;
    }

    setIsSendingOtp(true);
    setPhoneVerifyMsg('جاري إرسال الكود...');

    try {
      const formattedPhone = `+20${phone.substring(1)}`;
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await linkWithPhoneNumber(auth.currentUser, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      setShowOTPInput(true);
      setPhoneVerifyMsg("تم إرسال كود التفعيل في رسالة SMS.");
      
    } catch (err) {
      console.error("Error sending SMS:", err);
      if (err.code === 'auth/too-many-requests') {
        setPhoneVerifyMsg("لقد حاولت مرات كثيرة. يرجى المحاولة لاحقاً.");
      } else if (err.code === 'auth/credential-already-in-use') {
         setPhoneVerifyMsg("رقم الهاتف هذا مرتبط بحساب آخر.");
      } else {
        setPhoneVerifyMsg("حدث خطأ أثناء الإرسال. تأكد من صحة الرقم.");
      }
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(function(widgetId) {
          window.grecaptcha.reset(widgetId);
        }).catch(e => console.log("Reset Error: ", e));
      }
    }
    setIsSendingOtp(false);
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || !confirmationResult) return;
    
    setPhoneVerifyMsg('');
    setIsSendingOtp(true); 

    try {
      const result = await confirmationResult.confirm(otpCode);
      
      if (result.user) {
         setIsPhoneVerified(true);
         setShowOTPInput(false);
         setOtpCode('');
         
         const userDocRef = doc(db, 'users', auth.currentUser.uid);
         await setDoc(userDocRef, {
           isPhoneVerified: true,
           phone: phone 
         }, { merge: true });

         setPhoneVerifyMsg('تم توثيق الموبايل بنجاح! ✅ (لا تنسى حفظ التعديلات)');
         setTimeout(() => setPhoneVerifyMsg(''), 4000);
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      if (err.code === 'auth/invalid-verification-code') {
        setPhoneVerifyMsg("الكود غير صحيح.");
      } else if (err.code === 'auth/code-expired') {
         setPhoneVerifyMsg("صلاحية الكود انتهت. يرجى طلب كود جديد.");
      } else {
        setPhoneVerifyMsg("حدث خطأ أثناء التفعيل.");
      }
    }
    setIsSendingOtp(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsImageProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX_SIZE = 180; 
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          setPhotoURL(canvas.toDataURL('image/jpeg', 0.6)); setIsImageProcessing(false);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    if (value.length <= 11) {
      setPhone(value);
      if (isPhoneVerified && value !== phone) setIsPhoneVerified(false); 
    }
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!isAdmin && phone.length > 0 && phone.length !== 11) {
      return triggerError("رقم الموبايل يجب أن يتكون من 11 رقم! 📱");
    }
    if (!isAdmin && username.length > 0 && username.length < 3) {
      return triggerError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل!");
    }

    setIsUpdating(true);
    try {
      const usersRef = collection(db, 'users');
      
      if (!isAdmin && phone) {
        const phoneQ = query(usersRef, where('phone', '==', phone));
        const phoneSnap = await getDocs(phoneQ);
        if (!phoneSnap.empty && phoneSnap.docs[0].id !== auth.currentUser.uid) {
           throw new Error("رقم الموبايل مسجل بالفعل لحساب آخر!");
        }
      }

      if (!isAdmin && username) {
        const userQ = query(usersRef, where('username', '==', username));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty && userSnap.docs[0].id !== auth.currentUser.uid) {
           throw new Error("اسم المستخدم (Username) مأخوذ، يرجى اختيار اسم آخر!");
        }
      }

      try {
        await updateProfile(auth.currentUser, { displayName: name, photoURL: photoURL });
      } catch (err) {
        console.log("Auth profile update skipped, saving to Firestore only.");
      }

      const updateData = {
        name: name,
        photo: photoURL, 
        email: auth.currentUser.email,
        updatedAt: Date.now()
      };

      if (!isAdmin) {
        updateData.phone = phone;
        updateData.username = username;
        updateData.address = address;
        updateData.region = region;
        updateData.isPhoneVerified = isPhoneVerified;
      }

      await setDoc(doc(db, 'users', auth.currentUser.uid), updateData, { merge: true });

      triggerSuccess('Profile updated successfully! 🔥');
    } catch (error) {
      console.error("Update Error:", error);
      triggerError(error.message);
    }
    setIsUpdating(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError(''); setPassSuccess(''); setIsPassLoading(true);

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setPassSuccess('Password updated successfully! 🔒');
      setOldPassword(''); setNewPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPassSuccess('');
      }, 2000);

    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setPassError('Old password is incorrect!');
      else if (err.code === 'auth/weak-password') setPassError('New password must be at least 6 characters.');
      else if (err.code === 'auth/too-many-requests') setPassError('Too many attempts. Try again later.');
      else setPassError('Account signed in via Google/Facebook cannot change password here.');
    }
    setIsPassLoading(false);
  };

  const handleSendResetEmail = async () => {
    setPassError(''); setPassSuccess(''); setIsPassLoading(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setPassSuccess('Password reset link sent to your email! 📧');
    } catch (err) {
      setPassError(err.message);
    }
    setIsPassLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (isAdmin && (!shopSettings?.admins || shopSettings.admins.length <= 1)) {
      setDeleteError('لا يمكنك حذف حسابك لأنك المسؤول (Admin) الوحيد في النظام. الرجاء إضافة مسؤول آخر من الإعدادات أولاً.');
      return;
    }

    setIsDeleting(true); setDeleteError('');
    try {
      const user = auth.currentUser;
      const userEmail = user.email.toLowerCase();

      await setDoc(doc(db, 'deleted_accounts', userEmail), {
        email: userEmail, deletedAt: Date.now()
      });

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') setDeleteError('لدواعي أمنية، يرجى تسجيل الخروج والدخول مجدداً قبل حذف الحساب.');
      else setDeleteError(err.message);
    }
    setIsDeleting(false);
  };

  const filteredGovs = egyptGovernorates.filter(g => g.includes(govSearch));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto pt-6 px-4 pb-24 relative">
      
      {/* Floating Toasts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-xs lg:text-sm whitespace-nowrap">
            <CheckCircle size={18} /> {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-xs lg:text-sm whitespace-nowrap">
            <AlertTriangle size={18} /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div id="recaptcha-container" className="absolute top-0 right-0 z-[100]"></div>

      <div className="bg-[#111] rounded-[3rem] border border-white/5 p-6 md:p-8 lg:p-12 shadow-2xl relative overflow-hidden mb-6">
        <div className="flex flex-col items-center mb-12 relative">
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="absolute top-0 right-0 md:top-2 md:right-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white p-3 md:px-4 md:py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 z-10"
          >
            <KeyRound size={16} /> <span className="hidden md:inline">Security</span>
          </button>

          <div className="relative mt-8 sm:mt-0">
            <div className={`w-28 h-28 md:w-32 md:h-32 bg-black rounded-[2.5rem] border-2 ${isImageProcessing ? 'border-amber-500 animate-pulse' : 'border-blue-600/30'} overflow-hidden flex items-center justify-center shadow-2xl transition-colors`}>
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-gray-800" />
              )}
              {isImageProcessing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader className="animate-spin text-amber-500" /></div>}
            </div>
            <label className={`absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl border-4 border-[#111] shadow-xl transition-all ${isImageProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}`}>
              <Camera size={16} className="text-white" />
              {!isImageProcessing && <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />}
            </label>
          </div>
          
          <div className="mt-6 text-center">
             <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter leading-none">{name || 'User Profile'}</h2>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 block px-2">Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-blue-600 transition-all font-bold" />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 block px-2">
                Email Address {auth.currentUser?.emailVerified ? <span className="text-green-500 ml-1">✓ Verified</span> : <span className="text-red-500 ml-1">! Unverified</span>}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800" size={18} />
                <input type="email" value={auth.currentUser?.email} disabled className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-gray-600 cursor-not-allowed font-bold" />
              </div>
            </div>
          </div>

          {!isAdmin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 block px-2">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input type="text" value={username} onChange={handleUsernameChange} placeholder="user_name" className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-blue-600 font-bold" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 block px-2">
                    Primary Phone
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="01xxxxxxxxx" className={`w-full bg-black border ${isPhoneVerified ? 'border-green-500/30' : 'border-white/10'} rounded-2xl py-4 pl-12 pr-[90px] text-white outline-none focus:border-blue-600 transition-all font-bold`} />
                    
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {isPhoneVerified ? (
                        <div className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase"><ShieldCheck size={14}/></div>
                      ) : phone.length === 11 ? (
                        <button type="button" onClick={handleSendOTP} disabled={isSendingOtp} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSendingOtp ? 'Wait...' : 'Verify'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-gray-700 px-2">{phone.length}/11</span>
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showOTPInput && (
                      <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden mt-3">
                        <div className="flex flex-col sm:flex-row gap-2 bg-blue-600/5 border border-blue-600/20 p-3 sm:p-4 rounded-2xl">
                          <input type="text" placeholder="SMS Code" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full sm:flex-1 bg-black border border-blue-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-600 font-bold tracking-[0.3em] text-center" />
                          <button type="button" onClick={handleVerifyOTP} disabled={isSendingOtp || otpCode.length < 6} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-black text-xs uppercase transition-all disabled:opacity-50">
                            {isSendingOtp ? 'Checking...' : 'Confirm'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                    {phoneVerifyMsg && (
                      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className={`text-[10px] sm:text-xs font-bold mt-3 px-4 py-3 rounded-xl flex items-center gap-2 ${phoneVerifyMsg.includes('نجاح') ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        <AlertTriangle size={14} className="shrink-0" /> {phoneVerifyMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-3xl p-6 mt-4">
                <h3 className="text-sm font-black text-white uppercase italic tracking-wider mb-6 flex items-center gap-2"><MapPin size={18} className="text-blue-500"/> Delivery Defaults</h3>
                <div className="space-y-5">
                  <div className="relative">
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest px-1">Governorate</label>
                    <button type="button" onClick={() => setIsRegionOpen(!isRegionOpen)} className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white text-sm flex justify-between items-center font-bold">
                      {region || 'Select City'} <ChevronDown size={16} className={`transition-transform ${isRegionOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isRegionOpen && (
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute z-50 bottom-full mb-2 w-full bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                          <div className="p-3 border-b border-white/5 bg-[#111]">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                              <input type="text" placeholder="ابحث عن المحافظة..." value={govSearch} onChange={(e) => setGovSearch(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white text-xs outline-none focus:border-blue-600 transition-all font-bold" />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredGovs.map(g => (
                              <button key={g} type="button" onClick={() => { setRegion(g); setIsRegionOpen(false); setGovSearch(''); }} className="w-full p-4 text-left text-xs font-bold text-gray-400 hover:bg-blue-600 hover:text-white transition-all border-b border-white/5 last:border-0 uppercase">
                                {g}
                              </button>
                            ))}
                            {filteredGovs.length === 0 && <div className="p-4 text-center text-xs text-gray-500">لا يوجد نتائج</div>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest px-1">Full Address</label>
                    <textarea 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-600 transition-all font-bold h-24 resize-none overflow-y-auto custom-scrollbar" 
                      placeholder="Detailed Address (Building, Street, Landmark...)" 
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={isUpdating || isImageProcessing}
            className={`w-full text-white font-black rounded-2xl py-5 uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl disabled:opacity-50 ${isImageProcessing ? 'bg-amber-600' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'}`}
          >
            {isUpdating || isImageProcessing ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
            {isImageProcessing ? 'Processing Image...' : isUpdating ? 'Saving...' : 'Update My Profile'}
          </button>
        </form>
      </div>

      <div className="flex justify-center mt-6">
        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/10 hover:border-red-500/30 transition-all"
        >
          <Trash2 size={16} /> Delete My Account
        </button>
      </div>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-red-500/20 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center">
              <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black italic uppercase text-white mb-2">Delete Account?</h2>
              <p className="text-gray-400 text-xs font-medium mb-6">This action is permanent. You will not be able to re-register with this email for 30 days.</p>
              
              <AnimatePresence>
                {deleteError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl font-bold text-xs mb-6 text-center leading-relaxed">
                    {deleteError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-50">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-700 text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-2">
                  {isDeleting ? <Loader className="animate-spin" size={14}/> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPasswordModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl">
              <button onClick={() => setIsPasswordModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-600/20">
                <Lock size={28} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-black italic uppercase text-white mb-6 text-center tracking-tighter">Update Password</h2>
              
              <AnimatePresence>
                {passError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2.5 rounded-xl font-bold text-xs mb-4 text-center">
                    {passError}
                  </motion.div>
                )}
                {passSuccess && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2.5 rounded-xl font-bold text-xs mb-4 text-center">
                    {passSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="password" required placeholder="Current Password" 
                    value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white outline-none focus:border-blue-600 transition-all font-bold text-sm" 
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="password" required minLength={6} placeholder="New Password" 
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white outline-none focus:border-blue-600 transition-all font-bold text-sm" 
                  />
                </div>

                <div className="flex justify-end pt-1 mb-2">
                  <button type="button" onClick={handleSendResetEmail} disabled={isPassLoading} className="text-[10px] text-gray-500 hover:text-blue-500 font-bold uppercase tracking-widest transition-colors">
                    Forgot Old Password?
                  </button>
                </div>

                <button type="submit" disabled={isPassLoading} className="w-full bg-blue-600 text-white font-black rounded-xl py-3.5 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPassLoading ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  Update Password
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default Profile;