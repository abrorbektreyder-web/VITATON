import React, { useState, useEffect } from 'react';
import { ShoppingCart, Send, CheckCircle2, ChevronRight, Copy, Wallet, X, AlertCircle, Loader2, User, Image as ImageIcon } from 'lucide-react';
import { supabase } from './lib/supabase';

// Telegram WebApp API uchun turlar
declare global {
  interface Window {
    Telegram: any;
  }
}

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  image_url: string;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tgNickname, setTgNickname] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  // BU YERGA O'ZINGIZNING REAL HAMYONLARINGIZNI YOZING:
  const tonAddress = "SIZNING_TON_HAMYONINGIZ_SHU_YERDA";
  const usdtAddress = "0xbd173D597b5A886BE0dA0DEa2BD2cF92453E5041";

  useEffect(() => {
    // Ilova sakrashini oldini olish
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.enableClosingConfirmation();
      window.Telegram.WebApp.ready();
    }

    // Skroll va sakrashni qat'iy to'xtatadigan klass qo'shish
    if (isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        setProducts(data || []);
      } catch (e) {
        console.error("Products error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [isCheckoutOpen]); // <--- BU YOSHDA isCheckoutOpen BO'LISHI SHART!

  const handleOpenCheckout = (product: Product) => {
    setSelectedProduct(product);
    setIsCheckoutOpen(true);
    setUploadError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedProduct || !selectedFile || !tgNickname) {
      setUploadError("Iltimos, barcha maydonlarni to'ldiring va rasm yuklang");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const cleanUsername = tgNickname.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanUsername}_${Date.now()}.jpg`;

      // 1. Storage-ga yuklash
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(`receipts/${fileName}`, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      // 2. Public URL olish
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(`receipts/${fileName}`);

      // 3. Database-ga yozish
      const { error: dbError } = await supabase.from('orders').insert([{
        product_name: selectedProduct.name,
        price: selectedProduct.price,
        phone_number: tgNickname, // Backend-da bu maydon baribir string, nickname yozamiz
        tg_username: tgNickname,
        photo_url: publicUrl,
        status: 'pending'
      }]);

      if (dbError) throw dbError;

      setIsSuccess(true);
      setTimeout(() => {
        setIsCheckoutOpen(false);
        setIsSuccess(false);
        setSelectedProduct(null);
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setUploadError(error.message || "Xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('✅ Nusxalandi!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-slate-800 border border-green-500/40 text-green-400 font-bold px-6 py-3 rounded-2xl shadow-2xl text-sm animate-in fade-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}
      {/* Background Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent pointer-events-none blur-3xl opacity-50" />
      
      <div className="relative z-10 p-6 max-w-lg mx-auto">
        {/* Header */}
        <header className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 mb-2 drop-shadow-sm">
            VitaTON
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-500/80">
            Premium Wellness Protocol
          </p>
        </header>

        {/* Section Title */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 box-glow-cyan">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase text-slate-200">Mahsulotlar</h2>
        </div>

        {/* Product Grid */}
        <div className="grid gap-4 mb-12">
          {products.map((product) => (
            <div 
              key={product.id} 
              onClick={() => handleOpenCheckout(product)}
              className="group relative bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-4 flex gap-4 items-center hover:border-cyan-500/40 transition-all duration-500 cursor-pointer overflow-hidden active:scale-[0.97] shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden flex-shrink-0 relative shadow-inner">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/10 transition-all group-hover:bg-transparent" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-lg text-slate-100 mb-1 group-hover:text-cyan-400 transition-colors truncate">{product.name}</h3>
                <p className="text-xs text-slate-400/80 line-clamp-2 leading-relaxed mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-cyan-400 font-black text-xl flex items-baseline gap-1">
                     {product.price}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                    <ChevronRight className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Wallet Section */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase text-slate-200">To'lov Manzillari</h2>
        </div>

        <div className="grid gap-4">
           {/* USDT CARD */}
           <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">USDT (TRC20)</span>
                <button onClick={() => copyToClipboard(usdtAddress)} className="p-2 bg-indigo-500/10 rounded-xl hover:bg-indigo-500/20 transition-all">
                  <Copy className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-300 break-all leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 select-all">
                {usdtAddress}
              </p>
           </div>

           {/* TON CARD */}
           <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">TON Address</span>
                <button onClick={() => copyToClipboard(tonAddress)} className="p-2 bg-cyan-500/10 rounded-xl hover:bg-cyan-500/20 transition-all">
                  <Copy className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-300 break-all leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 select-all">
                {tonAddress}
              </p>
           </div>
        </div>
      </div>

      {/* Modern Modal / Checkout */}
      {isCheckoutOpen && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => !isUploading && setIsCheckoutOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border-t border-white/10 rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-100">{selectedProduct.name}</h3>
                <p className="text-cyan-400 font-black text-lg">{selectedProduct.price}</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {isSuccess ? (
              <div className="py-12 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </div>
                <h3 className="text-3xl font-black mb-3 text-green-400">✅ Tasdiqlandi!</h3>
                <p className="text-slate-300 text-lg font-bold mb-2">To'lovingiz qabul qilindi.</p>
                <p className="text-slate-500 text-sm">Tez orada admin siz bilan bog'lanadi.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Username Field */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Telegram Nickname</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      value={tgNickname} 
                      onChange={(e) => setTgNickname(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-950/80 border border-white/5 rounded-2xl py-5 pl-12 pr-6 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-bold text-slate-100" 
                    />
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">To'lov Cheki (Skrinshot)</label>
                  <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all min-h-[160px] cursor-pointer overflow-hidden ${selectedFile ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/5 bg-slate-950/80 hover:border-white/20'}`}>
                    {previewUrl ? (
                      <div className="absolute inset-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opcacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-xs font-black uppercase bg-cyan-500 px-4 py-2 rounded-full">Rasm Almashtirish</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-slate-700 mb-3" />
                        <span className="text-sm font-bold text-slate-500">Rasm yoki PDF yuklash</span>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={onFileChange} disabled={isUploading} />
                  </label>
                </div>

                {/* Error Box */}
                {uploadError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-center text-red-200 text-sm animate-in shake duration-500">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    {uploadError}
                  </div>
                )}

                {/* Footer Submit Button */}
                <button 
                  onClick={handleFinalSubmit}
                  disabled={isUploading || !selectedFile || !tgNickname}
                  className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg transition-all transform active:scale-95 shadow-xl ${isUploading || !selectedFile || !tgNickname ? 'bg-slate-800 text-slate-500 grayscale opacity-50' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>YUBORILMOQDA...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      <span>TASDIQLASH</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Modal Bottom Padding for safe area */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
