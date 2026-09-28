'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Settings,
  Building,
  Globe,
  Receipt,
  ShieldCheck,
  Save,
  Loader2,
  Lock,
  User,
  Camera,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getUserAvatar } from '@/lib/avatar';

export default function SettingsPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as any) || 'profile';

  const [activeTab, setActiveTab] = useState<'profile' | 'general' | 'localization' | 'tax' | 'security'>(
    ['profile', 'general', 'localization', 'tax', 'security'].includes(initialTab) ? initialTab : 'profile'
  );

  const [loading, setLoading] = useState(true);
  const [savingProperty, setSavingProperty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeSessionsCount, setActiveSessionsCount] = useState(1);

  // User Profile State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Property Settings State
  const [propertyForm, setPropertyForm] = useState({
    name: 'Indira Lodge',
    address: 'Solicitor Lodge, Near ASTC, Malow Ali',
    city: 'Jorhat',
    state: 'Assam',
    country: 'India',
    zipCode: '781005',
    phone: '+91 70028 90165',
    email: 'indiralodge@gmail.com',
    gstin: '18AOIPB2857A1ZB',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12H',
    taxInclusive: false,
    defaultTaxRate: 5.0,
  });

  // Sync activeTab when searchParams change
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['profile', 'general', 'localization', 'tax', 'security'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Fetch both profile & property settings
  const fetchData = async () => {
    try {
      // 1. Fetch User Profile
      const resProfile = await fetch('/api/users/profile');
      if (resProfile.ok) {
        const data = await resProfile.json();
        setUserProfile(data.user);
        setIsSuperAdmin(data.isSuperAdmin || false);
        setProfileForm({
          fullName: data.user?.fullName || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
        });
        const initialAvatar = data.avatarUrl || getUserAvatar(data.user?.email, data.user?.fullName);
        setAvatarPreview(initialAvatar);
      }

      // 2. Fetch Property Settings
      const resProp = await fetch('/api/properties/current');
      if (resProp.ok) {
        const data = await resProp.json();
        const prop = data.property;
        const setts = prop?.settings;
        if (prop) {
          setPropertyForm({
            name: prop.name || 'Indira Lodge',
            address: prop.address || '',
            city: prop.city || '',
            state: prop.state || '',
            country: prop.country || 'India',
            zipCode: prop.zipCode || '',
            phone: prop.phone || '',
            email: prop.email || '',
            gstin: prop.gstin || '',
            currency: prop.currency || 'INR',
            timezone: prop.timezone || 'Asia/Kolkata',
            dateFormat: setts?.dateFormat || 'DD/MM/YYYY',
            timeFormat: setts?.timeFormat || '12H',
            taxInclusive: setts?.taxInclusive || false,
            defaultTaxRate: setts?.defaultTaxRate || 18.0,
          });
        }
        if (data.activeSessionsCount) {
          setActiveSessionsCount(data.activeSessionsCount);
        }
      }
    } catch (e) {
      showToast('Failed to load settings data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please choose a smaller photo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
      setRemoveAvatar(false);
      showToast('Photo selected! Click "Save Profile Changes" to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
    setAvatarBase64(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Photo removed. Click "Save Profile Changes" to confirm.', 'info');
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          phone: profileForm.phone,
          email: isSuperAdmin ? profileForm.email : undefined,
          avatarBase64: avatarBase64 || undefined,
          removeAvatar: removeAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update profile', 'error');
        return;
      }

      showToast('Profile details and photo updated successfully!', 'success');
      setAvatarBase64(null);
      setRemoveAvatar(false);
      fetchData();
    } catch {
      showToast('Network error saving profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showToast('New password must be at least 8 characters long', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match. Please re-type carefully.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to change password', 'error');
        return;
      }

      showToast('Password changed successfully! Keep your new password safe.', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      showToast('Network error changing password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Property Settings Submit
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProperty(true);

    try {
      const res = await fetch('/api/properties/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyForm),
      });

      if (res.ok) {
        showToast('Property settings saved successfully!', 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to save settings', 'error');
      }
    } catch (e) {
      showToast('Network error saving settings', 'error');
    } finally {
      setSavingProperty(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        Loading account & system settings...
      </div>
    );
  }

  const isAyanUser =
    userProfile?.email === 'ayan@indiralodge' ||
    userProfile?.email === 'ayan@indiralodge.com' ||
    userProfile?.fullName?.toLowerCase().includes('ayan');

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-brand-600" />
          Settings & Profile Customization
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal user profile, contact details, display picture, password security, and property configurations
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          My Profile & Account
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          General Hotel Profile
        </button>

        <button
          onClick={() => setActiveTab('localization')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'localization'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          Localization & Timezone
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tax'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Tax Configuration (GST)
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Security & Sessions
        </button>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 1: USER PROFILE & ACCOUNT CUSTOMIZATION */}
      {/* ══════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Picture & Role Card */}
          <div className="space-y-6">
            <div className="pmfs-card p-6 text-center space-y-4">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profile Display Picture
              </h2>

              <div className="flex flex-col items-center justify-center">
                <div className="relative group">
                  <div
                    className={`w-32 h-32 rounded-full overflow-hidden border-4 shadow-lg flex items-center justify-center text-3xl font-extrabold ${
                      isAyanUser
                        ? 'border-red-500 bg-zinc-900 text-red-300 shadow-red-600/30'
                        : 'border-brand-200 bg-brand-50 text-brand-700'
                    }`}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={profileForm.fullName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarPreview(null)}
                      />
                    ) : (
                      (profileForm.fullName || 'User').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Quick Change Overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Change Profile Photo"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Change</span>
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-bold border border-brand-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Upload Photo
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-2">
                  PNG, JPG, or WebP. Recommended square size up to 5MB.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Designation / Role:</span>
                  <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {userProfile?.roles?.join(', ') || 'Staff'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Property:</span>
                  <span className="font-semibold text-slate-800">{userProfile?.property || 'Indira Lodge'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account Status:</span>
                  <Badge variant={userProfile?.status === 'ACTIVE' ? 'success' : 'error'}>
                    {userProfile?.status || 'ACTIVE'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns: Personal Details & Password Security */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Personal Details */}
            <form onSubmit={handleSaveProfile} className="pmfs-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  Personal Information & Contacts
                </h2>
                {isSuperAdmin && (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                    Super Admin Account
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Username / Login Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Username / Login ID *
                    </label>
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Managed by Admins
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={profileForm.email}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className={`w-full px-3.5 py-2 border rounded-lg text-sm ${
                        isSuperAdmin
                          ? 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-brand-500'
                          : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isSuperAdmin
                      ? '⭐ Super Admin Privilege: You can alter login username.'
                      : 'Username is given by the super admins and cannot be changed.'}
                  </p>
                </div>

                {/* Primary Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +91 70020 27950"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Reflected in the users and staff module & internal contact directory.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Section 2: Change Login Password */}
            <form onSubmit={handleChangePassword} className="pmfs-card p-6 space-y-5">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  Security & Change Password
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your account password. Super admins can also reset passwords directly in the Users module.
                </p>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your existing login password"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="At least 8 characters"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Login Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 2, 3, 4, 5: PROPERTY & SYSTEM SETTINGS */}
      {/* ══════════════════════════════════════════════════ */}
      {activeTab !== 'profile' && (
        <form onSubmit={handleSaveProperty} className="pmfs-card p-6 space-y-6">
          {/* Tab 2: General */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Hotel Identification & Contacts
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Property Name (Configurable - Not Hardcoded) *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    State / Province *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.state}
                    onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.phone}
                    onChange={(e) => setPropertyForm({ ...propertyForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={propertyForm.email}
                    onChange={(e) => setPropertyForm({ ...propertyForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Localization */}
          {activeTab === 'localization' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Regional Formats & Timezone
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Property Timezone *
                  </label>
                  <select
                    value={propertyForm.timezone}
                    onChange={(e) => setPropertyForm({ ...propertyForm, timezone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Base Currency *
                  </label>
                  <select
                    value={propertyForm.currency}
                    onChange={(e) => setPropertyForm({ ...propertyForm, currency: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date Format Display
                  </label>
                  <select
                    value={propertyForm.dateFormat}
                    onChange={(e) => setPropertyForm({ ...propertyForm, dateFormat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 19/08/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-19)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/19/2026)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Time Format Display
                  </label>
                  <select
                    value={propertyForm.timeFormat}
                    onChange={(e) => setPropertyForm({ ...propertyForm, timeFormat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="12H">12-Hour Clock (07:30 PM)</option>
                    <option value="24H">24-Hour Clock (19:30)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Tax Configuration */}
          {activeTab === 'tax' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                GSTIN & Invoice Tax Preferences
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN Registration Number
                  </label>
                  <input
                    type="text"
                    value={propertyForm.gstin}
                    onChange={(e) => setPropertyForm({ ...propertyForm, gstin: e.target.value })}
                    placeholder="e.g. 18AABCI1234H1Z5"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Default Room & Service Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={propertyForm.defaultTaxRate}
                    onChange={(e) => setPropertyForm({ ...propertyForm, defaultTaxRate: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyForm.taxInclusive}
                      onChange={(e) => setPropertyForm({ ...propertyForm, taxInclusive: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Display room tariff prices as Tax Inclusive on guest folios and invoices
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Security & Sessions */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Authentication Security & Active Sessions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Active User Sessions</div>
                    <div className="text-[11px] text-slate-500">Currently logged in staff devices</div>
                  </div>
                  <Badge variant="info">{activeSessionsCount} Active</Badge>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Session Expiration</div>
                    <div className="text-[11px] text-slate-500">7 Days HTTP-Only Cookie Policy</div>
                  </div>
                  <Badge variant="success">Enforced</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Badge variant="neutral">Property ID: {propertyForm.name.toLowerCase().replace(/\s+/g, '-')}</Badge>

            <button
              type="submit"
              disabled={savingProperty}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {savingProperty ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Property Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
