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
    { label: 'Rooms & Inventory', href: '/rooms', icon: BedDouble, isReady: true },
    { label: 'Guests', href: '/guests', icon: Users, isReady: true },
    { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles, isReady: true },
    { label: 'Maintenance', href: '/maintenance', icon: Wrench, isReady: true },
    { label: 'Reports & Statements', href: '/reports', icon: FileSpreadsheet, isReady: true },
    { label: 'Restaurant / POS', href: '/pos', icon: UtensilsCrossed, isReady: false },
    { label: 'Inventory', href: '/inventory', icon: Boxes, isReady: false },
    { label: 'Procurement', href: '/procurement', icon: ShoppingBag, isReady: false },
    { label: 'Finance & Accounting', href: '/finance', icon: Landmark, isReady: true },
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
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-950 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-white tracking-tight text-base truncate group-hover:text-brand-400 transition-colors">
                  {propertyName}
                </span>
                <span className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase">PMS Enterprise</span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all hover:scale-105"
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white font-bold shadow-md shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 hover:translate-x-1'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full shadow-glow" />
                )}

                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'}`} />
                
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full truncate">
                    <span className="truncate">{item.label}</span>
                    {!item.isReady && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-semibold ml-2 flex-shrink-0 uppercase">
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
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md space-y-2">
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-200 truncate">{userFullName}</span>
                <span className="text-[10px] text-slate-400 truncate">{userRole}</span>
              </div>
              <Badge variant="success" className="text-[9px] py-0.5 px-2 font-bold animate-pulse">Online</Badge>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0 text-brand-400" />
              {!isCollapsed && <span>Support</span>}
            </Link>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 text-rose-400" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
