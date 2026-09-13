'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Building,
  Clock,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface HeaderProps {
  propertyName?: string;
  userFullName?: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
  availableProperties?: Array<{ id: string; name: string; city: string; code: string }>;
  onMenuClick: () => void;
  isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  propertyName = 'Indira Lodge',
  userFullName = 'Hotel Staff',
  userEmail = 'staff@indiralodge.com',
  userRole = 'Owner',
  userAvatar,
  availableProperties = [],
  onMenuClick,
  isCollapsed,
}) => {
  const router = useRouter();
  const { showToast } = useToast();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile Menu & Property Selector State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPropOpen, setIsPropOpen] = useState(false);

  const isAyan =
    userEmail === 'ayan@indiralodge' ||
    userEmail === 'ayan@indiralodge.com' ||
    userFullName?.toLowerCase().includes('ayan');
  const avatarSrc = userAvatar || (isAyan ? '/avatars/ayan.png' : null);

  // Hotel Timezone Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Notifications & Real-Time Polling
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (e) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  // Search Autocomplete Handler
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setIsSearchOpen(true);
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}) });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Logged out', 'success');
      router.push('/login');
      router.refresh();
    } catch (e) {}
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 backdrop-blur-md border-b transition-all duration-300 ${
        isAyan
          ? 'bg-black/90 border-red-950/60 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      } ${isCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'}`}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onMenuClick}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isAyan ? 'text-zinc-300 hover:bg-zinc-900' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Input */}
          <div ref={searchRef} className="relative w-full">
            <div className="relative">
              <Search
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isAyan ? 'text-zinc-500' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests, bookings, rooms, staff, audit logs..."
                className={`w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl transition-all focus:outline-none focus:ring-2 ${
                  isAyan
                    ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:ring-red-500 focus:bg-black focus:border-red-600'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-brand-500 focus:bg-white'
                }`}
              />
            </div>

            {/* Search Autocomplete Dropdown */}
            {isSearchOpen && (
              <div
                className={`absolute top-full left-0 right-0 mt-1 rounded-xl shadow-2xl border max-h-80 overflow-y-auto z-50 p-2 space-y-1 ${
                  isAyan ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200'
                }`}
              >
                {searchResults.length === 0 ? (
                  <div
                    className={`p-4 text-center text-xs ${
                      isAyan ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                  >
                    No matching records found
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        router.push(item.url);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between group ${
                        isAyan ? 'hover:bg-zinc-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isAyan
                              ? 'text-white group-hover:text-red-400'
                              : 'text-slate-800 group-hover:text-brand-600'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div
                          className={`text-[11px] ${
                            isAyan ? 'text-zinc-400' : 'text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          isAyan
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.category}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Live Hotel Date/Time */}
          <div
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
              isAyan
                ? 'bg-zinc-950 border-red-950/60 text-zinc-300'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isAyan ? 'text-red-500' : 'text-brand-600'}`} />
            <span className="font-medium">{currentTime || 'Loading time...'}</span>
          </div>

          {/* Property Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPropOpen(!isPropOpen)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                isAyan
                  ? 'bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building className={`w-3.5 h-3.5 ${isAyan ? 'text-red-500' : 'text-brand-600'}`} />
              <span className="hidden sm:inline truncate max-w-[120px]">{propertyName}</span>
              <ChevronDown className={`w-3 h-3 ${isAyan ? 'text-zinc-400' : 'text-slate-400'}`} />
            </button>

            {isPropOpen && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border z-50 p-2 ${
                  isAyan
                    ? 'bg-zinc-950 border-zinc-800 text-white'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                    isAyan ? 'text-zinc-400' : 'text-slate-400'
                  }`}
                >
                  Active Hotel Property
                </div>
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isAyan
                      ? 'bg-red-950/30 border-red-900/40 text-white'
                      : 'bg-brand-50 border-brand-100'
                  }`}
                >
                  <div>
                    <div className={`text-xs font-bold ${isAyan ? 'text-red-300' : 'text-brand-900'}`}>
                      {propertyName}
                    </div>
                    <div className={`text-[10px] ${isAyan ? 'text-zinc-400' : 'text-brand-700'}`}>
                      Primary Property
                    </div>
                  </div>
                  <Check className={`w-4 h-4 ${isAyan ? 'text-red-400' : 'text-brand-600'}`} />
                </div>
                {availableProperties.length > 1 && (
                  <div
                    className={`mt-1 pt-1 border-t text-xs px-2 py-1 ${
                      isAyan ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-500'
                    }`}
                  >
                    Multi-property switching enabled
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications Panel */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                if (!isNotifOpen && unreadCount > 0) markNotificationsRead();
              }}
              className={`relative p-2 rounded-xl transition-colors ${
                isAyan
                  ? 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-red-600/40">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
                  isAyan
                    ? 'bg-zinc-950 border-zinc-800 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${
                    isAyan
                      ? 'bg-zinc-900/90 border-zinc-800'
                      : 'bg-slate-50/80 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isAyan ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Alerts & Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markNotificationsRead}
                      className={`text-[11px] font-semibold hover:underline ${
                        isAyan ? 'text-red-400 hover:text-red-300' : 'text-brand-600 hover:text-brand-700'
                      }`}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div
                  className={`max-h-80 overflow-y-auto divide-y ${
                    isAyan ? 'divide-zinc-900' : 'divide-slate-100'
                  }`}
                >
                  {notifications.length === 0 ? (
                    <div
                      className={`p-8 text-center text-xs space-y-1 ${
                        isAyan ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      <Bell className={`w-6 h-6 mx-auto mb-1 ${isAyan ? 'text-zinc-600' : 'text-slate-300'}`} />
                      <p className={`font-semibold ${isAyan ? 'text-zinc-200' : 'text-slate-700'}`}>All caught up!</p>
                      <p className="text-[11px]">No unread alerts or notifications.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setIsNotifOpen(false);
                          if (n.module === 'front_office' || n.module === 'reservations') {
                            router.push(n.entityId ? `/reservations/${n.entityId}` : '/front-office');
                          } else if (n.module === 'housekeeping') {
                            router.push('/housekeeping');
                          } else {
                            router.push('/notifications');
                          }
                        }}
                        className={`p-3.5 text-xs cursor-pointer transition-colors ${
                          n.isRead
                            ? isAyan
                              ? 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700'
                            : isAyan
                            ? 'bg-red-950/20 border-l-4 border-l-red-600 hover:bg-red-950/30 text-white'
                            : 'bg-brand-50/40 border-l-4 border-l-brand-600 hover:bg-brand-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`font-bold flex items-center gap-1.5 ${isAyan ? 'text-white' : 'text-slate-900'}`}>
                            {n.title}
                          </div>
                          <span className={`text-[10px] whitespace-nowrap ${isAyan ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`mt-1 text-[11px] leading-relaxed ${isAyan ? 'text-zinc-300' : 'text-slate-600'}`}>
                          {n.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div
                  className={`p-2.5 border-t text-center ${
                    isAyan
                      ? 'bg-zinc-900/90 border-zinc-800'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <Link
                    href="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className={`text-xs font-bold block hover:underline ${
                      isAyan ? 'text-red-400 hover:text-red-300' : 'text-brand-600 hover:text-brand-700'
                    }`}
                  >
                    View All Notifications & Broadcasts →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors ${
                isAyan ? 'hover:bg-zinc-900' : 'hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full overflow-hidden border font-bold text-xs flex items-center justify-center shrink-0 ${
                  isAyan
                    ? 'border-red-500 bg-zinc-900 text-red-300 shadow-md shadow-red-600/30'
                    : 'border-brand-200 bg-brand-100 text-brand-700'
                }`}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={userFullName} className="w-full h-full object-cover" />
                ) : (
                  userFullName.charAt(0).toUpperCase()
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 hidden sm:block ${isAyan ? 'text-zinc-400' : 'text-slate-400'}`} />
            </button>

            {isProfileOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
                  isAyan
                    ? 'bg-zinc-950 border-zinc-800 text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div
                  className={`px-3 py-2.5 border-b flex items-center gap-2.5 ${
                    isAyan ? 'border-zinc-800/80' : 'border-slate-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full overflow-hidden shrink-0 border flex items-center justify-center font-bold text-xs ${
                      isAyan
                        ? 'border-red-500 bg-zinc-900 text-red-300 shadow-sm'
                        : 'border-slate-200 bg-brand-50 text-brand-700'
                    }`}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={userFullName} className="w-full h-full object-cover" />
                    ) : (
                      userFullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isAyan ? 'text-white' : 'text-slate-800'}`}>
                      {userFullName}
                    </p>
                    <p className={`text-[11px] truncate ${isAyan ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {userEmail}
                    </p>
                    <span
                      className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded font-semibold ${
                        isAyan
                          ? 'bg-red-950/80 border border-red-800/40 text-red-400'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {userRole}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-colors ${
                      isAyan
                        ? 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <User className={`w-4 h-4 ${isAyan ? 'text-zinc-400' : 'text-slate-400'}`} />
                    Profile Details
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition-colors ${
                      isAyan
                        ? 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className={`w-4 h-4 ${isAyan ? 'text-zinc-400' : 'text-slate-400'}`} />
                    Property Settings
                  </Link>
                </div>
                <div
                  className={`border-t pt-1 ${
                    isAyan ? 'border-zinc-800/80' : 'border-slate-100'
                  }`}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-500 hover:bg-rose-950/30 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
