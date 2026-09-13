'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { PushNotificationManager } from '@/components/notifications/PushNotificationManager';
import { Loader2 } from 'lucide-react';

import { AyanWelcomeSplash } from '@/components/ayan/AyanWelcomeSplash';
import { AyanWaveBackground } from '@/components/ayan/AyanWaveBackground';
import { AyanCyberCursor } from '@/components/ayan/AyanCyberCursor';

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
  const userEmail = userData.user?.email || '';
  const userRole = userData.roles.length > 0 ? userData.roles[0] : 'Staff';

  const isAyan =
    userEmail === 'ayan@indiralodge' ||
    userEmail === 'ayan@indiralodge.com' ||
    userFullName?.toLowerCase().includes('ayan');

  return (
    <div
      className={`min-h-screen flex ${
        isAyan
          ? 'theme-ayan bg-black text-white selection:bg-red-600 selection:text-white relative'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Live Wavy Cyber Background Texture & Ambient Red Glows for Ayan Theme */}
      {isAyan && (
        <>
          <AyanWaveBackground />
          <AyanCyberCursor />
          <div className="fixed top-0 left-64 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
          <div className="fixed bottom-0 right-10 w-[600px] h-[600px] bg-rose-900/10 rounded-full blur-[180px] pointer-events-none z-0" />
        </>
      )}

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
        isAyan={isAyan}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          propertyName={propertyName}
          userFullName={userFullName}
          userEmail={userEmail}
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

      {/* Welcome Splash Screen for Ayan */}
      {isAyan && (
        <AyanWelcomeSplash
          userFullName={userFullName}
          userEmail={userEmail}
          propertyName={propertyName}
        />
      )}

      {/* Global Push Notification Manager */}
      <PushNotificationManager />
    </div>
  );
}
