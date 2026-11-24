import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Dropdown, DropdownItem } from '../ui/Dropdown.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function Header() {
  const { openMobile } = useSidebar();
  const { toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = user?.name || user?.profile?.fullName || 'Candidate';
  const displayEmail = user?.email || 'user@interviewai.dev';

  const getInitials = (name) => {
    if (!name) return 'AI';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const notifications = [
    {
      id: 1,
      title: 'Interview Analysis Ready',
      desc: 'TechCorp Labs Full Stack mock report is available.',
      time: '10m ago',
      unread: true
    },
    {
      id: 2,
      title: 'Daily Practice Streak',
      desc: 'You reached a 7-day interview practice streak!',
      time: '2h ago',
      unread: false
    }
  ];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-[#27324A] bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 lg:px-8">
      {/* Left: Mobile menu button & Search */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 max-w-lg">
        <button
          onClick={openMobile}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Interface */}
        <div className="relative w-full hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                navigate(`/preparations?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            placeholder="Search preparations, questions, skills... (Press Enter)"
            className="w-full pl-9 pr-12 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#151C2E] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-[#0B1020]" />
            </button>
          }
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#27324A]/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</span>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Mark all read</span>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                  <span className="text-[10px] text-slate-400">{n.time}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{n.desc}</p>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 dark:border-[#27324A]/60 text-center">
            <button
              onClick={() => navigate('/reports')}
              className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              View all reports & feedback
            </button>
          </div>
        </Dropdown>

        {/* User Profile Avatar & Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center space-x-2 p-1 pl-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
              <Avatar initials={getInitials(displayName)} size="sm" status="online" />
              <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-200">
                {displayName}
              </span>
            </button>
          }
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#27324A]/60">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">{displayName}</p>
            <p className="text-[11px] text-slate-400 truncate">{displayEmail}</p>
          </div>
          <DropdownItem icon={User} onClick={() => navigate('/profile')}>
            My Profile
          </DropdownItem>
          <DropdownItem icon={Settings} onClick={() => navigate('/settings')}>
            Account Settings
          </DropdownItem>
          <div className="border-t border-slate-100 dark:border-[#27324A]/60 my-1" />
          <DropdownItem icon={LogOut} danger onClick={handleLogout}>
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

export default Header;
