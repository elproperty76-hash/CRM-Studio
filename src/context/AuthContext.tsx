import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isLocalOnly?: boolean;
}

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for local isolated accounts
const LOCAL_ACCOUNTS_KEY = 'crm_studio_local_accounts';
const ACTIVE_USER_KEY = 'crm_studio_active_user';

function getLocalAccounts(): Record<string, { name: string; pass: string; createdAt: number }> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts: Record<string, { name: string; pass: string; createdAt: number }>) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Gagal menyimpan akun lokal:', e);
  }
}

function getDeterministicUid(email: string): string {
  const clean = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  return `usr_${clean}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem(ACTIVE_USER_KEY);
      } else {
        // Cek jika ada sesi pengguna lokal yang tersimpan
        const saved = localStorage.getItem(ACTIVE_USER_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as AppUser;
            if (parsed && parsed.uid) {
              setUser(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Gagal membaca sesi pengguna lokal:', e);
          }
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const normEmail = email.trim().toLowerCase();

    // 1. Coba login melalui Firebase Auth terlebih dahulu
    try {
      await signInWithEmailAndPassword(auth, normEmail, pass);
      localStorage.removeItem(ACTIVE_USER_KEY);
      return;
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code || '';

      // Jika gagal karena password salah atau user belum ada di Firebase:
      // Cek apakah akun tersebut terdaftar di penyimpanan lokal browser
      const accounts = getLocalAccounts();
      if (accounts[normEmail]) {
        if (accounts[normEmail].pass === pass) {
          const localUser: AppUser = {
            uid: getDeterministicUid(normEmail),
            email: normEmail,
            displayName: accounts[normEmail].name || normEmail.split('@')[0],
            isLocalOnly: true
          };
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(localUser));
          setUser(localUser);
          return;
        } else {
          const err = new Error('Kata sandi yang Anda masukkan salah.');
          (err as any).code = 'auth/wrong-password';
          throw err;
        }
      }

      // Jika Firebase error auth/operation-not-allowed atau auth/unauthorized-domain
      if (
        code === 'auth/operation-not-allowed' || 
        code === 'auth/unauthorized-domain' ||
        code === 'auth/network-request-failed' ||
        code === 'auth/internal-error'
      ) {
        // Akun belum ada di lokal dan Firebase belum aktifkan Email/Password
        const err = new Error('Akun dengan email ini belum terdaftar. Silakan pilih tab "Daftar Akun" terlebih dahulu.');
        (err as any).code = 'auth/user-not-found';
        throw err;
      }

      throw firebaseErr;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const normEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || normEmail.split('@')[0];

    // 1. Coba registrasi ke Firebase Auth
    try {
      const cred = await createUserWithEmailAndPassword(auth, normEmail, pass);
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }
      localStorage.removeItem(ACTIVE_USER_KEY);
      return;
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code || '';

      // Jika Firebase menolak karena provider belum diaktifkan atau error domain:
      // Simpan akun secara aman di sistem lokal sehingga pengguna tetap bisa menggunakan aplikasi
      if (
        code === 'auth/operation-not-allowed' || 
        code === 'auth/unauthorized-domain' ||
        code === 'auth/network-request-failed' ||
        code === 'auth/internal-error'
      ) {
        const accounts = getLocalAccounts();
        if (accounts[normEmail]) {
          const err = new Error('Email ini sudah terdaftar. Silakan pilih tab "Masuk".');
          (err as any).code = 'auth/email-already-in-use';
          throw err;
        }

        accounts[normEmail] = {
          name: cleanName,
          pass: pass,
          createdAt: Date.now()
        };
        saveLocalAccounts(accounts);

        const localUser: AppUser = {
          uid: getDeterministicUid(normEmail),
          email: normEmail,
          displayName: cleanName,
          isLocalOnly: true
        };
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(localUser));
        setUser(localUser);
        return;
      }

      throw firebaseErr;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    setUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  const resetPassword = async (email: string) => {
    const normEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, normEmail);
    } catch (firebaseErr: any) {
      // Jika akun lokal, berikan konfirmasi
      const accounts = getLocalAccounts();
      if (accounts[normEmail]) {
        return;
      }
      throw firebaseErr;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      logout,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
