import React from 'react';
import { Sidebar } from '../components/navigation/Sidebar.jsx';
import { Header } from '../components/navigation/Header.jsx';
import { MobileNavigation } from '../components/navigation/MobileNavigation.jsx';
import { SidebarProvider } from '../context/SidebarContext.jsx';

export function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Slideout Navigation */}
        <MobileNavigation />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <Header />

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default DashboardLayout;

