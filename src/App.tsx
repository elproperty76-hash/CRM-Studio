/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserPlus, Menu, X, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Leads from './components/Leads';
import GothicLIcon from './components/GothicLIcon';
import AuthView from './components/AuthView';
import { AuthProvider, useAuth } from './context/AuthContext';

type View = 'dashboard' | 'customers' | 'leads';

function CRMApp() {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Close mobile menu when changing views
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // State loading saat memeriksa status autentikasi Firebase
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-main)] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <GothicLIcon size="lg" />
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">CRM Studio</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Memeriksa sesi akun...</p>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // Jika belum login, tampilkan layar masuk/daftar akun dengan email
  if (!user) {
    return <AuthView />;
  }

  // Ambil inisial nama atau email
  const userInitial = user.displayName 
    ? user.displayName.charAt(0).toUpperCase() 
    : (user.email ? user.email.charAt(0).toUpperCase() : 'U');

  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna');

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] z-30 flex items-center justify-between px-4 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <GothicLIcon size="sm" />
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">CRM Studio</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* User badge */}
          <div 
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
            title={user.email || ''}
          >
            {userInitial}
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            <GothicLIcon size="md" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight">CRM Studio</h1>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck size={11} /> Data Terisolasi
              </span>
            </div>
          </div>
          <button 
            className="md:hidden p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            isActive={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Pelanggan" 
            isActive={currentView === 'customers'} 
            onClick={() => setCurrentView('customers')} 
          />
          <NavItem 
            icon={<UserPlus size={18} />} 
            label="Prospek (Leads)" 
            isActive={currentView === 'leads'} 
            onClick={() => setCurrentView('leads')} 
          />
        </nav>
        
        {/* User Profile & Footer Actions */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          {/* User Info Card */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate font-mono" title={user.email || ''}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Controls: Theme & Logout */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
              title="Ganti Tema"
            >
              {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
              <span>{isDark ? 'Terang' : 'Gelap'}</span>
            </button>

            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-all cursor-pointer"
              title="Keluar dari akun"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-auto pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'customers' && <Customers />}
          {currentView === 'leads' && <Leads />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left text-sm cursor-pointer ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/40 dark:text-blue-300 shadow-xs' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CRMApp />
    </AuthProvider>
  );
}
