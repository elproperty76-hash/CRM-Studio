/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserPlus, Phone, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Leads from './components/Leads';
import GothicLIcon from './components/GothicLIcon';

type View = 'dashboard' | 'customers' | 'leads';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when changing views
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] z-30 flex items-center justify-between px-4 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <GothicLIcon size="md" />
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">CRM Studio</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg"
        >
          <Menu size={24} />
        </button>
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
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            <GothicLIcon size="md" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">CRM Studio</h1>
          </div>
          <button 
            className="md:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            isActive={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Pelanggan" 
            isActive={currentView === 'customers'} 
            onClick={() => setCurrentView('customers')} 
          />
          <NavItem 
            icon={<UserPlus size={20} />} 
            label="Prospek (Leads)" 
            isActive={currentView === 'leads'} 
            onClick={() => setCurrentView('leads')} 
          />
        </nav>
        
        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              document.documentElement.classList.toggle('dark');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <span>Ubah Tema (Gelap/Terang)</span>
          </button>
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/40 dark:text-blue-400' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
