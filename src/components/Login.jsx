import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, AlertTriangle, KeyRound, X, CheckCircle, User, Phone, Camera, Loader, Store, Send, RefreshCw, AtSign } from 'lucide-react';

import { auth, db, googleProvider, facebookProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode, 
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const Login = ({ shopSettings }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); 
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [isWaitingForEmail, setIsWaitingForEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [oobCode, setOobCode] = useState(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');

  const storeName = shopSettings?.storeName || 'Store';
  const storeLogo = shopSettings?.storeLogo || null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.emailVerified) {
        setIsWaitingForEmail(true);
        setEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval;
    if (isWaitingForEmail) {
      interval = setInterval(async () => {
        try {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              clearInterval(interval);
              await handlePostLoginCheck(auth.currentUser, name, phone, photoURL, username);
              setIsWaitingForEmail(false);
              setSuccess("تم التفعيل بنجاح! جاري دخولك للموقع...");
              setTimeout(() => { window.location.href = '/'; }, 1500);
            }
          }
        } catch (err) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isWaitingForEmail, name, phone, photoURL, username]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('oobCode');

    if (mode === 'resetPassword' && code) {
      setOobCode(code);
      setIsResettingPassword(true);
      setIsCheckingRedirect(false);
      return;
    }

    if (mode === 'verifyEmail' && code) {
      handleVerifyEmail(code);
      return;
    }

    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          if (result.user.emailVerified) {
             await handlePostLoginCheck(result.user, name, phone, photoURL, username);
          } else {
             setIsWaitingForEmail(true);
          }
        }
      } catch (err) {}
      setIsCheckingRedirect(false);
    };
    checkRedirectResult();
  }, []);

  const handleVerifyEmail = async (code) => {
    try {
      await applyActionCode(auth, code);
      setSuccess("تم تفعيل بريدك الإلكتروني بنجاح! يرجى تسجيل الدخول الآن.");
      setIsLogin(true); 
    } catch (err) {
      setError("رابط التفعيل غير صالح أو منتهي الصلاحية.");
    }
    setIsCheckingRedirect(false);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendCooldown(60); 
      }
    } catch (err) {}
  };

  const handleFirebaseError = (err) => {
    if (err.code === 'auth/email-already-in-use') return "هذا الإيميل مسجل بالفعل!";
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') return "الإيميل أو كلمة السر غير صحيحة.";
    if (err.code === 'auth/user-not-found') return "هذا الحساب غير موجود. يرجى إنشاء حساب جديد.";
    if (err.code === 'auth/weak-password') return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
    if (err.code === 'auth/too-many-requests') return "طلبات كثيرة جداً. يرجى المحاولة لاحقاً.";
    return err.message.replace('Firebase: ', '');
  };

  const handleConfirmNewPassword = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newResetPassword);
      setSuccess('تم تغيير كلمة السر بنجاح! جاري تحويلك للدخول...');
      setTimeout(() => window.location.href = '/', 3000);
    } catch (err) { setError(handleFirebaseError(err)); }
    setIsLoading(false);
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
    if (value.length <= 11) setPhone(value);
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(val);
  };

  const handlePostLoginCheck = async (user, tempName = '', tempPhone = '', tempPhoto = '', tempUsername = '') => {
    if (!user.emailVerified) { setIsWaitingForEmail(true); throw new Error('VERIFICATION_REQUIRED'); }

    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().isBlocked) {
       return; 
    }
    
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        name: user.displayName || tempName || 'User',
        username: tempUsername || `user_${Math.floor(Math.random()*10000)}`,
        email: user.email,
        photo: user.photoURL || tempPhoto || '',
        phone: tempPhone || '',
        createdAt: Date.now(),
        isBlocked: false,
        isPhoneVerified: false
      });
    }
  };

  const checkUniqueness = async () => {
    const usersRef = collection(db, 'users');
    if (phone) {
      const phoneQuery = query(usersRef, where('phone', '==', phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) throw new Error("رقم الموبايل مسجل بالفعل لحساب آخر!");
    }
    if (username) {
      const userQuery = query(usersRef, where('username', '==', username));
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) throw new Error("اسم المستخدم (Username) مأخوذ، يرجى اختيار اسم آخر!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');

    if (!isLogin && phone && phone.length !== 11) {
      setError("رقم الموبايل يجب أن يتكون من 11 رقم بالضبط!"); return;
    }
    
    if (!isLogin && username) {
      // التعديل: التأكد من إن اليوزرنيم بين 7 و 15 حرف
      if (username.length < 7 || username.length > 15) {
        setError("اسم المستخدم يجب أن يكون بين 7 و 15 حرف/رقم."); return;
      }
      if (!/[a-z]/.test(username) || !/[0-9]/.test(username)) {
        setError("اسم المستخدم يجب أن يحتوي على حروف وأرقام معاً."); return;
      }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handlePostLoginCheck(userCredential.user);
      } else {
        const deletedRef = doc(db, 'deleted_accounts', email.toLowerCase());
        const deletedSnap = await getDoc(deletedRef);
        
        if (deletedSnap.exists()) {
          const days = Math.ceil(30 - (Date.now() - deletedSnap.data().deletedAt) / (1000 * 60 * 60 * 24));
          if (days > 0) throw new Error(`لا يمكنك التسجيل بهذا البريد حالياً. يرجى المحاولة بعد ${days} يوم.`);
        }

        await checkUniqueness();

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        try { await updateProfile(user, { displayName: name, photoURL: photoURL }); } catch(e) {}
        
        await sendEmailVerification(user);
        setIsWaitingForEmail(true);
      }
    } catch (err) {
      if (err.message !== 'VERIFICATION_REQUIRED') setError(handleFirebaseError(err));
    }
    setIsLoading(false);
  };

  const handleSocialSignIn = async (provider) => {
    setError(''); setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await handlePostLoginCheck(result.user);
    } catch (err) {
      if (err.message !== 'VERIFICATION_REQUIRED') {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
        } else {
          setError(handleFirebaseError(err)); setIsLoading(false);
        }
      } else { setIsLoading(false); }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('تم إرسال رابط إعادة تعيين كلمة السر إلى إيميلك!');
      setTimeout(() => { setShowResetModal(false); setSuccess(''); }, 4000);
    } catch (err) { setError(handleFirebaseError(err)); }
    setIsLoading(false);
  };

  const inputClasses = "w-full bg-black border border-white/10 rounded-2xl py-3 md:py-2.5 pl-11 pr-4 text-white outline-none focus:border-blue-600 transition-all font-bold text-sm [&:-webkit-autofill]:bg-black [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#000_inset] rtl:pl-4 rtl:pr-11 text-left rtl:text-right";

  if (isCheckingRedirect) return <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-blue-500 font-black italic text-xl uppercase tracking-tighter"><Loader className="animate-spin mb-4" size={40} /> Loading Auth...</div>;

  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4 selection:bg-blue-600 selection:text-white font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-600/20">
            <KeyRound size={28} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Create New Password</h1>
          
          <AnimatePresence>
            {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold mb-4">{error}</motion.div>}
            {success && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-green-500/10 text-green-500 p-3 rounded-xl text-xs font-bold mb-4">{success}</motion.div>}
          </AnimatePresence>

          <form onSubmit={handleConfirmNewPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="password" required placeholder="New Password" minLength={6} value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} className={inputClasses} />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-black rounded-xl py-3.5 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:opacity-50">
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (isWaitingForEmail) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4 selection:bg-blue-600 selection:text-white font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] border border-blue-500/30 p-8 rounded-[2rem] w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(37,99,235,0.15)] text-center flex flex-col items-center justify-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping"></div>
            <div className="relative w-full h-full bg-[#0a0a0a] border border-blue-600/50 rounded-full flex items-center justify-center">
              <Send size={30} className="text-blue-500 -ml-1 mt-1" />
            </div>
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-2">يرجى تفعيل حسابك</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6 font-medium text-center">
            لقد أرسلنا رابط التفعيل إلى بريدك<br/>
            <strong className="text-blue-400 mt-1 inline-block">{email || auth.currentUser?.email}</strong>
          </p>
          <div className="w-full bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 flex items-center justify-center gap-3 mb-6">
            <Loader className="animate-spin text-blue-500" size={18} />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">بانتظار التأكيد...</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase leading-relaxed mb-6">
            افتح الإيميل واضغط على الرابط.<br/>
            النافذة ستختفي تلقائياً بمجرد التفعيل.
          </p>
          <div className="w-full space-y-3">
            <button onClick={handleResendVerification} disabled={resendCooldown > 0} className="w-full bg-white/5 border border-white/10 text-white font-bold rounded-xl py-3 text-xs uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw size={14} className={resendCooldown > 0 ? "animate-spin-slow" : ""} />
              {resendCooldown > 0 ? `انتظر ${resendCooldown} ثانية` : 'إعادة إرسال الرابط'}
            </button>
            <button onClick={async () => { await auth.signOut(); setIsWaitingForEmail(false); setIsLogin(true); }} className="text-[10px] text-gray-500 hover:text-red-400 font-bold uppercase transition-colors py-2">
              إلغاء والعودة للدخول
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4 selection:bg-blue-600 selection:text-white font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl max-h-[98vh] overflow-y-auto custom-scrollbar">
        <div className="text-center mb-8 flex flex-col items-center">
          {storeLogo ? (
            <img src={storeLogo} alt="Logo" className="w-14 h-14 object-contain mb-3 bg-black rounded-xl border border-white/10 p-1" />
          ) : (
            <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-xl border border-blue-600/30 flex items-center justify-center mb-3">
              <Store size={24} />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-1 leading-none">{storeName}</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{isLogin ? 'Welcome Back' : 'Create an Account'}</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2.5 rounded-xl font-bold text-xs mb-4 flex items-center gap-2 text-right rtl overflow-hidden">
              <AlertTriangle size={16} className="shrink-0" /> <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2.5 rounded-xl font-bold text-xs mb-4 flex items-center gap-2 text-right rtl overflow-hidden text-center justify-center">
              <CheckCircle size={16} className="shrink-0" /> <span className="leading-relaxed">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence>
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                <div className="flex justify-center mb-2">
                  <div className="relative">
                    <div className={`w-16 h-16 bg-black rounded-full border-2 ${isImageProcessing ? 'border-amber-500 animate-pulse' : 'border-blue-600/30'} overflow-hidden flex items-center justify-center shadow-lg transition-colors`}>
                      {photoURL ? (
                        <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-gray-700" />
                      )}
                      {isImageProcessing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader className="animate-spin text-amber-500" size={16} /></div>}
                    </div>
                    <label className={`absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full border-2 border-[#111] shadow-xl transition-all cursor-pointer hover:scale-110`}>
                      <Camera size={12} className="text-white" />
                      {!isImageProcessing && <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />}
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input type="text" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
                </div>

                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="text" 
                    required 
                    placeholder="Username (e.g. user123)" 
                    value={username} 
                    onChange={handleUsernameChange} 
                    minLength={7}
                    maxLength={15} 
                    className={inputClasses} 
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input type="tel" required placeholder="WhatsApp Number" value={phone} onChange={handlePhoneChange} className={inputClasses} />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black ${phone.length === 11 ? 'text-green-500' : 'text-gray-700'}`}>
                    {phone.length}/11
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="password" required placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} />
          </div>

          {isLogin && (
            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => setShowResetModal(true)} className="text-[9px] text-gray-500 hover:text-blue-500 font-bold uppercase tracking-widest transition-colors">
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" disabled={isLoading || isImageProcessing} className="w-full bg-blue-600 text-white font-black rounded-2xl py-3.5 uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-sm">
            {isLoading || isImageProcessing ? <Loader className="animate-spin" size={18} /> : isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            {isImageProcessing ? 'Processing Image...' : isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">OR</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleSocialSignIn(googleProvider)} disabled={isLoading} type="button" className="flex-1 bg-white text-black font-black rounded-xl py-3 uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs disabled:opacity-50">
            Google
          </button>
          <button onClick={() => handleSocialSignIn(facebookProvider)} disabled={isLoading} type="button" className="flex-1 bg-[#1877F2] text-white font-black rounded-xl py-3 uppercase tracking-widest hover:bg-[#1864D9] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs disabled:opacity-50">
            Facebook
          </button>
        </div>

        <div className="mt-6 text-center">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-gray-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-2xl">
              <button onClick={() => setShowResetModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-600/20">
                <KeyRound size={28} className="text-blue-500" />
              </div>
              <h2 className="text-xl font-black italic uppercase text-white mb-2 text-center">Reset Password</h2>
              
              {success ? (
                 <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-xl font-bold text-xs mb-4 text-center">
                   {success}
                 </div>
              ) : (
                <>
                  <p className="text-gray-400 text-xs font-medium mb-6 text-center">Enter your email and we'll send you a link to reset your password.</p>
                  <form onSubmit={handleResetPassword}>
                    <div className="relative mb-4">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input type="email" required placeholder="Your Email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputClasses} />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-black rounded-xl py-3.5 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:opacity-50">
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;