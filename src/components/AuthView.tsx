import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GothicLIcon from './GothicLIcon';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AuthView() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const getReadableError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    if (code === 'auth/invalid-email') return 'Format alamat email tidak valid.';
    if (code === 'auth/user-not-found') return 'Akun dengan email ini belum terdaftar.';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Email atau kata sandi yang Anda masukkan salah.';
    if (code === 'auth/email-already-in-use') return 'Email ini sudah terdaftar. Silakan pilih tab "Masuk".';
    if (code === 'auth/weak-password') return 'Kata sandi terlalu pendek. Minimal gunakan 6 karakter.';
    if (code === 'auth/popup-closed-by-user') return 'Jendela login Google ditutup sebelum selesai.';
    if (code === 'auth/operation-not-allowed') {
      return 'Login Email/Password belum diaktifkan di Firebase Console. Anda dapat mengaktifkannya di menu Authentication > Sign-in method, atau gunakan login dengan Google.';
    }
    if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.';
    return message || 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Harap masukkan alamat email Anda.');
        return;
      }
      try {
        setLoading(true);
        await resetPassword(email);
        setResetSent(true);
      } catch (err: any) {
        setError(getReadableError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim()) {
      setError('Harap masukkan alamat email.');
      return;
    }

    if (!password) {
      setError('Harap masukkan kata sandi.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (err: any) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setError(getReadableError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden transition-all">
        {/* Header with Gothic L Branding */}
        <div className="pt-8 pb-6 px-6 text-center border-b border-[var(--border-color)] bg-gradient-to-b from-slate-900/5 to-transparent dark:from-slate-900/40">
          <div className="flex justify-center mb-3">
            <GothicLIcon size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            CRM Studio
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
            {mode === 'signin' && 'Masuk untuk mengakses data pelanggan dan prospek Anda.'}
            {mode === 'signup' && 'Daftar akun baru untuk mulai mengelola data bisnis Anda.'}
            {mode === 'reset' && 'Reset kata sandi akun CRM Studio Anda.'}
          </p>
        </div>

        {/* Tab Selector (Masuk / Daftar) */}
        {mode !== 'reset' && (
          <div className="grid grid-cols-2 p-1.5 mx-6 mt-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`py-2 text-sm font-semibold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-2 text-sm font-semibold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Daftar Akun
            </button>
          </div>
        )}

        {/* Main Form */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {resetSent && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Tautan reset kata sandi telah dikirim ke <strong>{email}</strong>. Silakan periksa kotak masuk atau spam email Anda.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Kata Sandi
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(null); setResetSent(false); }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Ulangi Kata Sandi
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Masuk ke Aplikasi'}
                    {mode === 'signup' && 'Buat Akun & Masuk'}
                    {mode === 'reset' && 'Kirim Email Reset'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {mode === 'reset' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); }}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline"
              >
                ← Kembali ke Halaman Masuk
              </button>
            </div>
          )}

          {mode !== 'reset' && (
            <>
              {/* Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-color)]" />
                </div>
                <span className="relative px-3 bg-[var(--bg-card)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                  atau
                </span>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-[var(--bg-main)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.96 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Masuk dengan Google</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-center">
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              🔒 <strong>Privasi Terjamin:</strong> Data pelanggan dan prospek disimpan secara terpisah dan privat untuk masing-masing akun email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
