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
  availableProperties?: Array<{ id: string; name: string; city: string; code: string }>;
  onMenuClick: () => void;
  isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  propertyName = 'Indira Lodge',
  userFullName = 'Hotel Staff',
  userEmail = 'staff@indiralodge.com',
  userRole = 'Owner',
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
      className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-slate-200 transition-all duration-300 ${
        isCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
      }`}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Input */}
          <div ref={searchRef} className="relative w-full">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests, bookings, rooms, staff, audit logs..."
                className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Search Autocomplete Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50 p-2 space-y-1">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
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
                      className="w-full text-left p-2.5 hover:bg-slate-50 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-brand-600">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
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
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span className="font-medium">{currentTime || 'Loading time...'}</span>
          </div>

          {/* Property Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPropOpen(!isPropOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Building className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline truncate max-w-[120px]">{propertyName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPropOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Hotel Property
                </div>
                <div className="p-2 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-brand-900">{propertyName}</div>
                    <div className="text-[10px] text-brand-700">Primary Property</div>
                  </div>
                  <Check className="w-4 h-4 text-brand-600" />
                </div>
                {availableProperties.length > 1 && (
                  <div className="mt-1 pt-1 border-t border-slate-100 text-xs text-slate-500 px-2 py-1">
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
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Alerts & Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markNotificationsRead}
                      className="text-[11px] text-brand-600 hover:text-brand-700 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                      <Bell className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700">All caught up!</p>
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
                        className={`p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          n.isRead ? 'bg-white' : 'bg-brand-50/40 border-l-4 border-l-brand-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {n.title}
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1 text-[11px] leading-relaxed">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline block"
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
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center border border-brand-200">
                {userFullName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{userFullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold">
                    {userRole}
                  </span>
                </div>
                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile Details
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Property Settings
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors text-left"
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
