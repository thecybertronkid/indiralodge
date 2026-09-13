'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, ArrowRight, X, Building2, Flame } from 'lucide-react';

interface AyanWelcomeSplashProps {
  userFullName?: string;
  userEmail?: string;
  propertyName?: string;
}

export const AyanWelcomeSplash: React.FC<AyanWelcomeSplashProps> = ({
  userFullName = 'Ayan Kashyap',
  userEmail = 'ayan@indiralodge',
  propertyName = 'Indira Lodge',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Check if splash screen should be shown in this session
    const justLoggedIn = sessionStorage.getItem('ayan_just_logged_in');
    const splashShown = sessionStorage.getItem('ayan_splash_shown_v1');

    if (justLoggedIn || !splashShown) {
      setIsVisible(true);
      sessionStorage.removeItem('ayan_just_logged_in');
      sessionStorage.setItem('ayan_splash_shown_v1', 'true');
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 4500; // 4.5 seconds
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setIsVisible(false);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Boss';
    if (hour < 17) return 'Good Afternoon, Boss';
    return 'Good Evening, Boss';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-rose-700/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-lg bg-zinc-950/95 border border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(220,38,38,0.25)] text-center overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700" />

        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors"
          title="Skip Splash Screen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* VIP Super Admin Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-950/80 to-rose-950/80 border border-red-800/50 text-red-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-inner">
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>Super Admin & Owner Access</span>
        </div>

        {/* Avatar with Animated Crimson Glow Rings */}
        <div className="relative mx-auto w-24 h-24 mb-5">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-800 opacity-75 blur-sm animate-pulse" />
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-red-500/80 shadow-2xl bg-zinc-900">
            <img
              src="/avatars/ayan.png"
              alt={userFullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-600 rounded-full text-white shadow-lg border-2 border-zinc-950">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Welcome Text */}
        <p className="text-red-400 font-semibold text-sm tracking-wide mb-1">
          {getGreeting()}
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Welcome back, {userFullName}!
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-sm mx-auto mb-6">
          <span className="text-zinc-200 font-medium">{propertyName}</span> Property Management & Financial System is live, fully synchronized, and operational.
        </p>

        {/* Quick Highlights Badge Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Account ID</p>
            <p className="text-xs font-extrabold text-white truncate">{userEmail}</p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">System Status</p>
            <p className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              All Systems Nominal
            </p>
          </div>
        </div>

        {/* Enter Portal Action Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all duration-200 flex items-center justify-center gap-2 group hover:scale-[1.02]"
        >
          <span>Enter Indira Lodge PMFS</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Countdown Progress Bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {Math.ceil((progress / 100) * 4.5)}s
          </span>
        </div>
      </div>
    </div>
  );
};
