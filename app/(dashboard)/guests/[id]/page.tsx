'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  CalendarDays,
  CreditCard,
  FileText,
  Star,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  Pencil,
  X,
  Save,
  Phone,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const INPUT_CLASS =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-colors';
const SELECT_CLASS =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-colors';
const LABEL_CLASS = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className={LABEL_CLASS}>{label}</span>
      <div className="text-xs font-semibold text-slate-900 mt-0.5">{value || '—'}</div>
    </div>
  );
}

export default function GuestProfilePage() {
  const params = useParams();
  const { showToast } = useToast();
  const guestId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'documents' | 'payments'>('overview');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Document Modal
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ documentType: 'AADHAAR', documentNumber: '', issuingCountry: 'India' });
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchGuest = async () => {
    try {
      const res = await fetch(`/api/guests/${guestId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        showToast('Guest profile not found', 'error');
      }
    } catch {
      showToast('Error loading guest profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (guestId) fetchGuest(); }, [guestId]);

  const openEdit = () => {
    const g = data.guest;
    setEditForm({
      firstName: g.firstName || '',
      middleName: g.middleName || '',
      lastName: g.lastName || '',
      phone: g.phone || '',
      alternatePhone: g.alternatePhone || '',
      email: g.email || '',
      gender: g.gender || '',
      dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth).toISOString().split('T')[0] : '',
      age: g.age ?? '',
      nationality: g.nationality || 'Indian',
      occupation: g.occupation || '',
      idType: g.idType || '',
      idNumber: g.idNumber || '',
      address: g.address || '',
      city: g.city || '',
      state: g.state || '',
      country: g.country || 'India',
      postalCode: g.postalCode || '',
      company: g.company || '',
      gstin: g.gstin || '',
      guestType: g.guestType || 'INDIVIDUAL',
      notes: g.notes || '',
      vipStatus: g.vipStatus ?? false,
      blacklistedStatus: g.blacklistedStatus ?? false,
    });
    setIsEditing(true);
  };

  const set = (field: string, value: any) => setEditForm((prev: any) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await res.json();
      if (!res.ok) { showToast(result.error || 'Failed to update guest', 'error'); return; }
      showToast('Guest profile updated successfully!', 'success');
      setIsEditing(false);
      fetchGuest();
    } catch {
      showToast('Error saving guest profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoc(true);
    try {
      const res = await fetch(`/api/guests/${guestId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });
      if (res.ok) {
        showToast('Guest ID Document saved and verified!', 'success');
        setIsDocOpen(false);
        fetchGuest();
      } else {
        showToast('Failed to save document', 'error');
      }
    } catch {
      showToast('Error saving document', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        Loading guest profile...
      </div>
    );
  }
  if (!data || !data.guest) {
    return <div className="py-12 text-center text-slate-500 text-xs">Guest profile not found.</div>;
  }

  const g = data.guest;
  const stats = data.stats || {};
  const reservations = g.reservations || [];
  const documents = g.documents || [];
  const payments = g.payments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/guests" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{g.displayName}</h1>
              {g.vipStatus && (
                <span className="p-1 bg-amber-100 text-amber-800 text-xs font-bold rounded flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500" /> VIP
                </span>
              )}
              {g.blacklistedStatus && (
                <span className="p-1 bg-rose-100 text-rose-800 text-xs font-bold rounded flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Blacklisted
                </span>
              )}
              <Badge variant="neutral">{g.guestRef}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {g.phone}{g.alternatePhone ? ` / ${g.alternatePhone}` : ''}
              {g.email ? ` • ${g.email}` : ''}
              {(g.city || g.country) ? ` • ${[g.city, g.state, g.country].filter(Boolean).join(', ')}` : ''}
            </p>
          </div>
        </div>
        <Link
          href={`/reservations/new?guestId=${g.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          <Plus className="w-4 h-4" /> New Reservation for Guest
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Stays</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalStays}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Nights</span>
          <div className="text-xl font-extrabold text-brand-600 mt-1">{stats.totalNights}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Spend</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">₹{Number(stats.totalSpend || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Stay</span>
          <div className="text-xl font-extrabold text-purple-600 mt-1">{stats.avgStayNights} Nights</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Cancellations</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{stats.cancellationCount}</div>
        </div>
        <div className="pmfs-card p-3.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">No-Shows</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.noShowCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { key: 'overview', icon: <User className="w-4 h-4" />, label: 'Overview & Profile' },
          { key: 'reservations', icon: <CalendarDays className="w-4 h-4" />, label: `Stay History (${reservations.length})` },
          { key: 'documents', icon: <FileText className="w-4 h-4" />, label: `KYC Documents (${documents.length})` },
          { key: 'payments', icon: <CreditCard className="w-4 h-4" />, label: `Payments (${payments.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div className="pmfs-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Guest Master Details</h3>
            {!isEditing ? (
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* VIEW MODE */}
          {!isEditing && (
            <div className="space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Personal Information</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <InfoRow label="First Name" value={g.firstName} />
                  <InfoRow label="Middle Name" value={g.middleName} />
                  <InfoRow label="Last Name" value={g.lastName} />
                  <InfoRow label="Gender" value={g.gender} />
                  <InfoRow label="Date of Birth" value={g.dateOfBirth ? new Date(g.dateOfBirth).toLocaleDateString('en-GB') : null} />
                  <InfoRow label="Age" value={g.age?.toString()} />
                  <InfoRow label="Nationality" value={g.nationality} />
                  <InfoRow label="Occupation" value={g.occupation} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Information</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <InfoRow label="Primary Phone" value={g.phone} />
                  <InfoRow label="Alternate Phone" value={g.alternatePhone} />
                  <InfoRow label="Email" value={g.email} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identity Document</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <InfoRow label="ID Type" value={g.idType} />
                  <InfoRow label="ID Number" value={g.idNumber} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Address</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <InfoRow label="Address" value={g.address} />
                  </div>
                  <InfoRow label="City" value={g.city} />
                  <InfoRow label="State" value={g.state} />
                  <InfoRow label="Country" value={g.country} />
                  <InfoRow label="Postal Code" value={g.postalCode} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Business & Classification</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <InfoRow label="Guest Type" value={g.guestType} />
                  <InfoRow label="Company" value={g.company} />
                  <InfoRow label="GSTIN" value={g.gstin} />
                  <div>
                    <span className={LABEL_CLASS}>VIP Status</span>
                    <div className="mt-0.5">
                      <Badge variant={g.vipStatus ? 'warning' : 'neutral'}>{g.vipStatus ? 'VIP Guest' : 'Standard'}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className={LABEL_CLASS}>Blacklisted</span>
                    <div className="mt-0.5">
                      <Badge variant={g.blacklistedStatus ? 'error' : 'neutral'}>{g.blacklistedStatus ? 'Yes – Blacklisted' : 'No'}</Badge>
                    </div>
                  </div>
                </div>
              </section>

              {g.notes && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notes / Special Requests</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-slate-800 whitespace-pre-wrap">{g.notes}</div>
                </section>
              )}
            </div>
          )}

          {/* EDIT MODE */}
          {isEditing && (
            <div className="space-y-6">
              {/* Personal */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Personal Information</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div><label className={LABEL_CLASS}>First Name *</label><input className={INPUT_CLASS} value={editForm.firstName} onChange={e => set('firstName', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Middle Name</label><input className={INPUT_CLASS} value={editForm.middleName} onChange={e => set('middleName', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Last Name *</label><input className={INPUT_CLASS} value={editForm.lastName} onChange={e => set('lastName', e.target.value)} /></div>
                  <div>
                    <label className={LABEL_CLASS}>Gender</label>
                    <select className={SELECT_CLASS} value={editForm.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div><label className={LABEL_CLASS}>Date of Birth</label><input type="date" className={INPUT_CLASS} value={editForm.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Age</label><input type="number" min="1" max="120" className={INPUT_CLASS} value={editForm.age} onChange={e => set('age', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Nationality</label><input className={INPUT_CLASS} value={editForm.nationality} onChange={e => set('nationality', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Occupation</label><input className={INPUT_CLASS} value={editForm.occupation} onChange={e => set('occupation', e.target.value)} placeholder="e.g. Engineer" /></div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Information</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><label className={LABEL_CLASS}>Primary Phone *</label><input type="tel" className={INPUT_CLASS} value={editForm.phone} onChange={e => set('phone', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Alternate Phone</label><input type="tel" className={INPUT_CLASS} value={editForm.alternatePhone} onChange={e => set('alternatePhone', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Email Address</label><input type="email" className={INPUT_CLASS} value={editForm.email} onChange={e => set('email', e.target.value)} /></div>
                </div>
              </section>

              {/* Identity */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identity Document</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL_CLASS}>ID Type</label>
                    <select className={SELECT_CLASS} value={editForm.idType} onChange={e => set('idType', e.target.value)}>
                      <option value="">Select ID Type</option>
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="PAN">PAN Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div><label className={LABEL_CLASS}>ID Number</label><input className={INPUT_CLASS} value={editForm.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="Document number" /></div>
                </div>
              </section>

              {/* Address */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Address</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <label className={LABEL_CLASS}>Street Address</label>
                    <input className={INPUT_CLASS} value={editForm.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
                  </div>
                  <div><label className={LABEL_CLASS}>City</label><input className={INPUT_CLASS} value={editForm.city} onChange={e => set('city', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>State</label><input className={INPUT_CLASS} value={editForm.state} onChange={e => set('state', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Country</label><input className={INPUT_CLASS} value={editForm.country} onChange={e => set('country', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>Postal Code</label><input className={INPUT_CLASS} value={editForm.postalCode} onChange={e => set('postalCode', e.target.value)} /></div>
                </div>
              </section>

              {/* Business */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Business & Classification</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className={LABEL_CLASS}>Guest Type</label>
                    <select className={SELECT_CLASS} value={editForm.guestType} onChange={e => set('guestType', e.target.value)}>
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="CORPORATE">Corporate</option>
                      <option value="TRAVEL_AGENT">Travel Agent</option>
                      <option value="OTA">OTA</option>
                      <option value="WALK_IN">Walk-In</option>
                    </select>
                  </div>
                  <div><label className={LABEL_CLASS}>Company</label><input className={INPUT_CLASS} value={editForm.company} onChange={e => set('company', e.target.value)} /></div>
                  <div><label className={LABEL_CLASS}>GSTIN</label><input className={INPUT_CLASS} value={editForm.gstin} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" /></div>
                </div>

                <div className="flex flex-wrap gap-6 mt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div onClick={() => set('vipStatus', !editForm.vipStatus)} className={`w-10 h-5 rounded-full relative transition-colors ${editForm.vipStatus ? 'bg-amber-500' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.vipStatus ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> VIP Guest</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div onClick={() => set('blacklistedStatus', !editForm.blacklistedStatus)} className={`w-10 h-5 rounded-full relative transition-colors ${editForm.blacklistedStatus ? 'bg-rose-500' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.blacklistedStatus ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Blacklisted</span>
                  </label>
                </div>
              </section>

              {/* Notes */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notes / Special Requests</span>
                </div>
                <textarea rows={3} className={INPUT_CLASS} value={editForm.notes} onChange={e => set('notes', e.target.value)} placeholder="Any internal notes or special preferences…" />
              </section>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 2: RESERVATIONS ══ */}
      {activeTab === 'reservations' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Guest Reservation History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Booking Ref</th>
                  <th className="pmfs-table-th">Room Type</th>
                  <th className="pmfs-table-th">Room</th>
                  <th className="pmfs-table-th">Arrival → Departure</th>
                  <th className="pmfs-table-th">Total Amount</th>
                  <th className="pmfs-table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-xs text-slate-500">No reservations recorded for this guest.</td></tr>
                ) : (
                  reservations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-brand-700">
                        <Link href={`/reservations/${r.id}`} className="hover:underline">{r.reservationRef}</Link>
                      </td>
                      <td className="pmfs-table-td">{r.roomType?.name}</td>
                      <td className="pmfs-table-td">Room {r.assignedRoom?.roomNumber || 'Unassigned'}</td>
                      <td className="pmfs-table-td text-xs text-slate-600">
                        {new Date(r.arrivalDate).toLocaleDateString()} → {new Date(r.departureDate).toLocaleDateString()}
                      </td>
                      <td className="pmfs-table-td font-semibold text-slate-900">₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="pmfs-table-td"><Badge variant={r.status === 'CHECKED_IN' ? 'success' : 'info'}>{r.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB 3: DOCUMENTS ══ */}
      {activeTab === 'documents' && (
        <div className="pmfs-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Verified Government ID Documents</h3>
            <button onClick={() => setIsDocOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg shadow-xs">
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs text-slate-500">No KYC government documents recorded.</div>
            ) : (
              documents.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{doc.documentType}</div>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">Doc #: {doc.documentNumber}</div>
                    <div className="text-[11px] text-slate-400">Issuing: {doc.issuingCountry}</div>
                  </div>
                  <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Verified</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ TAB 4: PAYMENTS ══ */}
      {activeTab === 'payments' && (
        <div className="pmfs-card overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Payment Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pmfs-table-th">Payment Ref</th>
                  <th className="pmfs-table-th">Date</th>
                  <th className="pmfs-table-th">Method</th>
                  <th className="pmfs-table-th">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-xs text-slate-500">No payments recorded for this guest.</td></tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="pmfs-table-td font-mono font-bold text-emerald-700">{p.paymentRef}</td>
                      <td className="pmfs-table-td text-xs text-slate-500">{new Date(p.date).toLocaleString()}</td>
                      <td className="pmfs-table-td font-semibold text-slate-800">{p.method}</td>
                      <td className="pmfs-table-td font-extrabold text-emerald-600">₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Document */}
      <Modal isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} title="Record Guest Government ID Document" maxWidth="md">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Type *</label>
            <select value={docForm.documentType} onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900">
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENCE">Driving Licence</option>
              <option value="VOTER_ID">Voter ID</option>
              <option value="PAN">PAN Card</option>
              <option value="OTHER">Other ID</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Number *</label>
            <input type="text" required value={docForm.documentNumber} onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })} placeholder="e.g. 1234-5678-9012" className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900" />
          </div>
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsDocOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={savingDoc} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50">
              {savingDoc ? 'Saving Document...' : 'Save & Verify Document'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
