'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  BedDouble,
  Sparkles,
  Users,
  UtensilsCrossed,
  Boxes,
  ShoppingBag,
  Wrench,
  Landmark,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  UserCog,
  FileCheck2,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface SidebarProps {
  propertyName?: string;
  userFullName?: string;
  userRole?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  propertyName = 'Indira Lodge',
  userFullName = 'Hotel Staff',
  userRole = 'Staff',
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Logged out successfully', 'success');
      router.push('/login');
      router.refresh();
    } catch (e) {
      showToast('Logout failed', 'error');
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
    { label: 'Front Office', href: '/front-office', icon: ConciergeBell, isReady: true },
    { label: 'Reservations', href: '/reservations', icon: CalendarDays, isReady: true },
    { label: 'Rooms', href: '/rooms', icon: BedDouble, isReady: true },
    { label: 'Guests', href: '/guests', icon: Users, isReady: true },
    { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles, isReady: true },
    { label: 'Maintenance', href: '/maintenance', icon: Wrench, isReady: true },
    { label: 'Reports', href: '/reports', icon: FileSpreadsheet, isReady: true },
    { label: 'Restaurant / POS', href: '/pos', icon: UtensilsCrossed, isReady: false },
    { label: 'Inventory', href: '/inventory', icon: Boxes, isReady: false },
    { label: 'Procurement', href: '/procurement', icon: ShoppingBag, isReady: false },
    { label: 'Finance', href: '/finance', icon: Landmark, isReady: true },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, isReady: true },
    { label: 'CRM', href: '/crm', icon: UserCheck, isReady: false },
    { label: 'Users & Staff', href: '/users', icon: UserCog, isReady: true },
    { label: 'Audit Logs', href: '/audit-logs', icon: FileCheck2, isReady: true },
    { label: 'Settings', href: '/settings', icon: Settings, isReady: true },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-white tracking-wide text-base truncate">
                  {propertyName}
                </span>
                <span className="text-xs text-slate-400 font-medium">Hotel PMFS</span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                  isActive
                    ? 'bg-brand-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full truncate">
                    <span className="truncate">{item.label}</span>
                    {!item.isReady && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal ml-2 flex-shrink-0">
                        Soon
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom User & Logout Section */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-slate-800/40 flex items-center justify-between">
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-200 truncate">{userFullName}</span>
                <span className="text-[11px] text-slate-400 truncate">{userRole}</span>
              </div>
              <Badge variant="info" className="text-[10px] py-0">Online</Badge>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Support</span>}
            </Link>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
