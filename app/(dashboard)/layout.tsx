'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    user: any;
    property: any;
    availableProperties: any[];
    roles: string[];
    permissions: string[];
  } | null>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUserData(data);
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Loading Indira Lodge PMFS Shell...
          </span>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  const propertyName = userData.property?.name || 'Indira Lodge';
  const userFullName = userData.user?.fullName || 'Hotel Staff';
  const userRole = userData.roles.length > 0 ? userData.roles[0] : 'Staff';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Responsive Left Sidebar */}
      <Sidebar
        propertyName={propertyName}
        userFullName={userFullName}
        userRole={userRole}
        userRoles={userData.roles}
        permissions={userData.permissions}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          propertyName={propertyName}
          userFullName={userFullName}
          userEmail={userData.user?.email}
          userRole={userRole}
          availableProperties={userData.availableProperties}
          onMenuClick={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
        />

        {/* Page View Body */}
        <main className="flex-1 pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
