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
  userRoles?: string[];
  permissions?: string[];
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isAyan?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  propertyName = 'Indira Lodge',
  userFullName = 'Hotel Staff',
  userRole = 'Staff',
  userRoles = [],
  permissions = [],
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
  isAyan = false,
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

  const isSuperAdminOrOwner =
    userRoles.some((r) => r === 'Super Admin' || r === 'Owner') ||
    permissions.includes('*') ||
    userRole === 'Super Admin' ||
    userRole === 'Owner';

  const allNavItems: {
    label: string;
    href: string;
    icon: any;
    isReady: boolean;
    permission?: string | string[];
    allowedRoles?: string[];
  }[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true, permission: 'dashboard.view' },
    { label: 'Front Office', href: '/front-office', icon: ConciergeBell, isReady: true, permission: 'frontdesk.view' },
    { label: 'Reservations', href: '/reservations', icon: CalendarDays, isReady: true, permission: 'reservation.view' },
    { label: 'Rooms & Inventory', href: '/rooms', icon: BedDouble, isReady: true, permission: 'room.view' },
    { label: 'Guests', href: '/guests', icon: Users, isReady: true, permission: 'guest.view' },
    { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles, isReady: true, permission: 'housekeeping.view' },
    { label: 'Maintenance', href: '/maintenance', icon: Wrench, isReady: true, permission: 'maintenance.view' },
    { label: 'Reports & Statements', href: '/reports', icon: FileSpreadsheet, isReady: true, permission: 'reports.view' },
    { label: 'Restaurant / POS', href: '/pos', icon: UtensilsCrossed, isReady: false, allowedRoles: ['Super Admin', 'Owner', 'General Manager', 'Restaurant Manager', 'Cashier'] },
    { label: 'Inventory', href: '/inventory', icon: Boxes, isReady: false, allowedRoles: ['Super Admin', 'Owner', 'General Manager', 'Inventory Manager', 'Housekeeping Manager', 'Maintenance Manager'] },
    { label: 'Procurement', href: '/procurement', icon: ShoppingBag, isReady: false, allowedRoles: ['Super Admin', 'Owner', 'General Manager', 'Purchase Manager', 'Finance Manager', 'Inventory Manager'] },
    { label: 'Finance & Accounting', href: '/finance', icon: Landmark, isReady: true, permission: ['finance.view', 'cash.view', 'accounts.view', 'invoice.view'] },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, isReady: true, permission: 'analytics.view' },
    { label: 'CRM', href: '/crm', icon: UserCheck, isReady: false, allowedRoles: ['Super Admin', 'Owner', 'General Manager', 'Front Office Manager'] },
    { label: 'Users & Staff', href: '/users', icon: UserCog, isReady: true, permission: 'users.view' },
    { label: 'Audit Logs', href: '/audit-logs', icon: FileCheck2, isReady: true, permission: 'audit_logs.view' },
    { label: 'Settings', href: '/settings', icon: Settings, isReady: true, permission: 'settings.view' },
  ];

  const navItems = allNavItems.filter((item) => {
    if (isSuperAdminOrOwner) return true;
    if (!item.permission && !item.allowedRoles) return true;

    if (item.permission) {
      const reqList = Array.isArray(item.permission) ? item.permission : [item.permission];
      const hasP = reqList.some((req) => permissions.includes(req) || permissions.includes('*'));
      if (hasP) return true;
    }

    if (item.allowedRoles) {
      const hasR = userRoles.some((r) => item.allowedRoles?.includes(r)) || (userRole && item.allowedRoles.includes(userRole));
      if (hasR) return true;
    }

    return false;
  });

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
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out shadow-2xl ${
          isAyan
            ? 'bg-black text-white border-r border-red-950/60 shadow-[5px_0_30px_rgba(0,0,0,0.9)]'
            : 'bg-slate-950 text-slate-300 border-r border-slate-800/80'
        } ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 px-4 flex items-center justify-between backdrop-blur-md border-b ${
            isAyan
              ? 'bg-black/90 border-red-950/60'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300 ${
                isAyan
                  ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-800 shadow-red-600/30'
                  : 'bg-gradient-to-tr from-brand-600 via-blue-500 to-emerald-400 shadow-brand-500/20'
              }`}
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span
                  className={`font-extrabold text-white tracking-tight text-base truncate transition-colors ${
                    isAyan ? 'group-hover:text-red-400' : 'group-hover:text-brand-400'
                  }`}
                >
                  {propertyName}
                </span>
                <span
                  className={`text-[10px] font-extrabold tracking-wider uppercase ${
                    isAyan ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {isAyan ? 'Super Admin Edition' : 'PMS Enterprise'}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex p-1.5 rounded-lg transition-all hover:scale-105 ${
              isAyan
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
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

            const activeClass = isAyan
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold shadow-lg shadow-red-600/30'
              : 'bg-gradient-to-r from-brand-600 to-blue-600 text-white font-bold shadow-md shadow-brand-500/20';

            const inactiveClass = isAyan
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-900/90 hover:translate-x-1'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/80 hover:translate-x-1';

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                  isActive ? activeClass : inactiveClass
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full shadow-glow ${
                      isAyan ? 'bg-white' : 'bg-emerald-400'
                    }`}
                  />
                )}

                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-white'
                      : isAyan
                      ? 'text-zinc-400 group-hover:text-red-400'
                      : 'text-slate-400 group-hover:text-brand-400'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full truncate">
                    <span className="truncate">{item.label}</span>
                    {!item.isReady && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0 uppercase ${
                          isAyan
                            ? 'bg-zinc-900 text-zinc-400'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
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
        <div
          className={`p-3 border-t backdrop-blur-md space-y-2 ${
            isAyan
              ? 'border-red-950/60 bg-black/90'
              : 'border-slate-800/80 bg-slate-950/80'
          }`}
        >
          {!isCollapsed && (
            <div
              className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 border ${
                isAyan
                  ? 'bg-zinc-950/90 border-red-900/40 shadow-inner'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border flex items-center justify-center font-bold text-xs ${
                    isAyan
                      ? 'border-red-500/80 bg-zinc-900 text-red-300'
                      : 'border-slate-700 bg-slate-800 text-slate-200'
                  }`}
                >
                  {isAyan || userFullName?.toLowerCase().includes('ayan') ? (
                    <img src="/avatars/ayan.png" alt={userFullName} className="w-full h-full object-cover" />
                  ) : (
                    userFullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate">{userFullName}</span>
                  <span className={`text-[10px] truncate ${isAyan ? 'text-red-300' : 'text-slate-400'}`}>
                    {userRole}
                  </span>
                </div>
              </div>
              <Badge
                variant={isAyan ? 'error' : 'success'}
                className={`text-[9px] py-0.5 px-2 font-bold animate-pulse ${
                  isAyan ? 'bg-red-950/80 text-red-400 border-red-800/60' : ''
                }`}
              >
                Online
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isAyan
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Help & Support"
            >
              <HelpCircle className={`w-4 h-4 flex-shrink-0 ${isAyan ? 'text-red-400' : 'text-brand-400'}`} />
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
